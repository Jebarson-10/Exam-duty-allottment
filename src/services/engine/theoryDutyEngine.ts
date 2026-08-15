// Theory Duty Allotment Engine for Erode CEO Office
// Handles HM, Chief Superintendent & Department Officer Allotment with strict rule verification

import {
  Teacher,
  ExamCentre,
  School,
  DutyHistory,
  DutyAllotment,
  TheoryEngineConfig,
  EngineStats,
  RuleViolation,
} from '../../types';
import { evaluateTeacherCentreDistance } from './haversine';
import { computeFairnessMetrics, sortTeachersByFairness } from './fairness';

export interface TheoryAllotmentResult {
  allotments: DutyAllotment[];
  stats: EngineStats;
  violations: RuleViolation[];
  unassignedCentres: { centre: ExamCentre; missingRoles: string[] }[];
}

export const DEFAULT_THEORY_CONFIG: TheoryEngineConfig = {
  maxDistanceKm: 10,
  excludeOwnSchool: true,
  excludeClubbedSchools: true,
  twoYearNoRepeat: true,
  prioritizeHMs: true,
  seniorityFallback: true,
  blockWiseSeniority: true,
  allowDistanceRelaxationIfShortage: true,
};

export function generateTheoryDutyAllotment(
  centres: ExamCentre[],
  schools: School[],
  teachers: Teacher[],
  history: DutyHistory[],
  examCycleId: string,
  config: TheoryEngineConfig = DEFAULT_THEORY_CONFIG,
  currentYear: number = new Date().getFullYear()
): TheoryAllotmentResult {
  const schoolMap = new Map<string, School>(schools.map((s) => [s.id, s]));
  const centreMap = new Map<string, ExamCentre>(centres.map((c) => [c.id, c]));
  const fairnessMap = computeFairnessMetrics(teachers, history, currentYear);

  const allotments: DutyAllotment[] = [];
  const violations: RuleViolation[] = [];
  const assignedTeacherIds = new Set<string>();
  const unassignedCentres: { centre: ExamCentre; missingRoles: string[] }[] = [];

  let totalRequired = 0;
  let fallbackCount = 0;
  let totalDistance = 0;
  let maxDistRecorded = 0;

  // Filter out globally exempted teachers (medical/board exemption)
  const activeTeachers = teachers.filter((t) => !t.isExempted);

  // Group teachers into HM/Principal pool and Senior PG pool
  const hmAndPrincipals = activeTeachers.filter(
    (t) => t.designation === 'Headmaster' || t.designation === 'Principal'
  );
  const pgTeachers = activeTeachers.filter(
    (t) => t.designation === 'PG Assistant' || t.designation === 'Vocational Instructor'
  );

  // Build a fast lookup of recent 2-year centre history: teacherId -> Set<centreId>
  const recentCentresByTeacher = new Map<string, Set<string>>();
  if (config.twoYearNoRepeat) {
    for (const h of history) {
      if (h.year >= currentYear - 2) {
        if (!recentCentresByTeacher.has(h.teacherId)) {
          recentCentresByTeacher.set(h.teacherId, new Set<string>());
        }
        recentCentresByTeacher.get(h.teacherId)!.add(h.centreId);
      }
    }
  }

  // Sort centres (can prioritize larger capacity centres or block-wise)
  const sortedCentres = [...centres].sort((a, b) => b.capacity - a.capacity);

  for (const centre of sortedCentres) {
    const centreSchool = centre.schoolId ? schoolMap.get(centre.schoolId) : null;
    const centreCoords = { lat: centre.lat, lng: centre.lng };
    const missingRoles: string[] = [];

    // Clubbed school IDs for this centre
    const excludedSchoolIds = new Set<string>();
    if (config.excludeOwnSchool && centre.schoolId) {
      excludedSchoolIds.add(centre.schoolId);
    }
    if (config.excludeClubbedSchools && centre.clubbedSchoolIds) {
      centre.clubbedSchoolIds.forEach((id) => excludedSchoolIds.add(id));
    }

    // Role 1: Chief Superintendent (Chief of Examination)
    // Assigned to HM / Principal, or senior-most PG if unavailable
    totalRequired += 1;
    let chiefSuperintendentAllotted = false;

    // Helper to evaluate candidate eligibility for a centre
    const evaluateCandidate = (
      teacher: Teacher,
      maxDist: number
    ): { eligible: boolean; distanceKm: number } => {
      if (assignedTeacherIds.has(teacher.id)) return { eligible: false, distanceKm: 9999 };
      if (excludedSchoolIds.has(teacher.schoolId)) return { eligible: false, distanceKm: 9999 };

      if (config.twoYearNoRepeat && recentCentresByTeacher.get(teacher.id)?.has(centre.id)) {
        return { eligible: false, distanceKm: 9999 };
      }

      const teacherSchool = schoolMap.get(teacher.schoolId);
      const schoolCoords = teacherSchool
        ? { lat: teacherSchool.lat, lng: teacherSchool.lng }
        : { lat: 11.341, lng: 77.7172 };
      const homeCoords =
        teacher.homeLat && teacher.homeLng
          ? { lat: teacher.homeLat, lng: teacher.homeLng }
          : null;

      const evalResult = evaluateTeacherCentreDistance(
        schoolCoords,
        centreCoords,
        homeCoords,
        maxDist
      );

      return {
        eligible: evalResult.isWithinDistance,
        distanceKm: evalResult.minDistanceKm,
      };
    };

    // Try finding HM/Principal for Chief Superintendent
    let eligibleChiefs: { teacher: Teacher; distanceKm: number }[] = [];
    for (const t of hmAndPrincipals) {
      const res = evaluateCandidate(t, config.maxDistanceKm);
      if (res.eligible) {
        eligibleChiefs.push({ teacher: t, distanceKm: res.distanceKm });
      }
    }

    // Sort eligible by fairness, then seniority
    let sortedEligibleChiefs = sortTeachersByFairness(
      eligibleChiefs.map((e) => e.teacher),
      fairnessMap,
      true
    );

    let selectedChief: Teacher | null = sortedEligibleChiefs[0] || null;
    let selectedChiefDist = eligibleChiefs.find((e) => e.teacher.id === selectedChief?.id)?.distanceKm || 0;

    // Fallback 1: Senior PG Assistant if HM/Principal not found within 10km
    if (!selectedChief && config.seniorityFallback) {
      fallbackCount += 1;
      const eligibleSeniorPGs: { teacher: Teacher; distanceKm: number }[] = [];
      for (const t of pgTeachers) {
        const res = evaluateCandidate(t, config.maxDistanceKm);
        if (res.eligible) {
          eligibleSeniorPGs.push({ teacher: t, distanceKm: res.distanceKm });
        }
      }

      // Sort PG assistants strictly by Seniority Rank ascending (1 is senior-most)
      const sortedPGs = [...eligibleSeniorPGs].sort(
        (a, b) => a.teacher.seniorityRank - b.teacher.seniorityRank
      );

      if (sortedPGs.length > 0) {
        selectedChief = sortedPGs[0].teacher;
        selectedChiefDist = sortedPGs[0].distanceKm;
        violations.push({
          code: 'FALLBACK_PG_CHIEF',
          severity: 'warning',
          message: `HM unavailable within ${config.maxDistanceKm}km for Centre "${centre.name}". Senior PG ${selectedChief.name} (Rank #${selectedChief.seniorityRank}) allotted as Chief Superintendent.`,
          teacherId: selectedChief.id,
          centreId: centre.id,
          distanceKm: selectedChiefDist,
        });
      }
    }

    // Fallback 2: Relax distance if still unassigned
    if (!selectedChief && config.allowDistanceRelaxationIfShortage) {
      for (const t of [...hmAndPrincipals, ...pgTeachers]) {
        const res = evaluateCandidate(t, 25); // Relax to 25km
        if (res.eligible) {
          selectedChief = t;
          selectedChiefDist = res.distanceKm;
          violations.push({
            code: 'DISTANCE_RELAXED',
            severity: 'warning',
            message: `Centre "${centre.name}" required distance relaxation (>10km: ${selectedChiefDist}km) to assign Chief Superintendent ${selectedChief.name}.`,
            teacherId: selectedChief.id,
            centreId: centre.id,
            distanceKm: selectedChiefDist,
          });
          break;
        }
      }
    }

    if (selectedChief) {
      assignedTeacherIds.add(selectedChief.id);
      chiefSuperintendentAllotted = true;
      totalDistance += selectedChiefDist;
      if (selectedChiefDist > maxDistRecorded) maxDistRecorded = selectedChiefDist;

      allotments.push({
        id: `TH-CS-${centre.id}-${selectedChief.id}`,
        teacherId: selectedChief.id,
        teacherName: selectedChief.name,
        teacherDesignation: selectedChief.designation,
        teacherSchoolId: selectedChief.schoolId,
        teacherSubject: selectedChief.subject,
        centreId: centre.id,
        centreName: centre.name,
        dutyType: 'Theory',
        role: 'Chief Superintendent',
        subject: 'General',
        examCycleId,
        distanceKm: selectedChiefDist,
        isManualOverride: false,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      missingRoles.push('Chief Superintendent');
    }

    // Role 2: Department Officer (Senior PG Teacher)
    totalRequired += 1;
    let selectedDeptOfficer: Teacher | null = null;
    let selectedDeptOfficerDist = 0;

    const eligibleDeptOfficers: { teacher: Teacher; distanceKm: number }[] = [];
    for (const t of pgTeachers) {
      const res = evaluateCandidate(t, config.maxDistanceKm);
      if (res.eligible) {
        eligibleDeptOfficers.push({ teacher: t, distanceKm: res.distanceKm });
      }
    }

    // Sort Dept Officers by block-wise seniority and fairness
    const sortedDeptOfficers = sortTeachersByFairness(
      eligibleDeptOfficers.map((e) => e.teacher),
      fairnessMap,
      true
    );

    if (sortedDeptOfficers.length > 0) {
      selectedDeptOfficer = sortedDeptOfficers[0];
      selectedDeptOfficerDist =
        eligibleDeptOfficers.find((e) => e.teacher.id === selectedDeptOfficer?.id)?.distanceKm || 0;
    } else if (config.allowDistanceRelaxationIfShortage) {
      for (const t of pgTeachers) {
        const res = evaluateCandidate(t, 25);
        if (res.eligible) {
          selectedDeptOfficer = t;
          selectedDeptOfficerDist = res.distanceKm;
          violations.push({
            code: 'DISTANCE_RELAXED_DO',
            severity: 'warning',
            message: `Department Officer ${selectedDeptOfficer.name} assigned with distance relaxation (${selectedDeptOfficerDist}km) for centre "${centre.name}".`,
            teacherId: selectedDeptOfficer.id,
            centreId: centre.id,
            distanceKm: selectedDeptOfficerDist,
          });
          break;
        }
      }
    }

    if (selectedDeptOfficer) {
      assignedTeacherIds.add(selectedDeptOfficer.id);
      totalDistance += selectedDeptOfficerDist;
      if (selectedDeptOfficerDist > maxDistRecorded) maxDistRecorded = selectedDeptOfficerDist;

      allotments.push({
        id: `TH-DO-${centre.id}-${selectedDeptOfficer.id}`,
        teacherId: selectedDeptOfficer.id,
        teacherName: selectedDeptOfficer.name,
        teacherDesignation: selectedDeptOfficer.designation,
        teacherSchoolId: selectedDeptOfficer.schoolId,
        teacherSubject: selectedDeptOfficer.subject,
        centreId: centre.id,
        centreName: centre.name,
        dutyType: 'Theory',
        role: 'Department Officer',
        subject: selectedDeptOfficer.subject,
        examCycleId,
        distanceKm: selectedDeptOfficerDist,
        isManualOverride: false,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      missingRoles.push('Department Officer');
    }

    if (missingRoles.length > 0) {
      unassignedCentres.push({ centre, missingRoles });
    }
  }

  const totalAllotted = allotments.length;
  const unassignedCount = totalRequired - totalAllotted;
  const avgDistanceKm = totalAllotted > 0 ? Math.round((totalDistance / totalAllotted) * 100) / 100 : 0;

  const stats: EngineStats = {
    totalRequired,
    totalAllotted,
    unassignedCount,
    avgDistanceKm,
    maxDistanceKm: maxDistRecorded,
    warningsCount: violations.length,
    fallbackCount,
    standbyCount: 0,
  };

  return {
    allotments,
    stats,
    violations,
    unassignedCentres,
  };
}
