// Hall Invigilation Allotment Engine for Erode CEO Office
// Calculates halls needed (Students / 20), allocates 10% standby pool,
// enforces <=10km Haversine distance, 2-year no-repeat rule, and exemption exclusions.

import {
  Teacher,
  ExamCentre,
  School,
  DutyHistory,
  DutyAllotment,
  HallEngineConfig,
  EngineStats,
  RuleViolation,
} from '../../types';
import { evaluateTeacherCentreDistance } from './haversine';
import { computeFairnessMetrics, sortTeachersByFairness } from './fairness';

export interface HallAllotmentResult {
  allotments: DutyAllotment[];
  stats: EngineStats;
  violations: RuleViolation[];
  centreHallCounts: { centreId: string; centreName: string; regularHalls: number; standbyCount: number }[];
}

export const DEFAULT_HALL_CONFIG: HallEngineConfig = {
  studentsPerHall: 20,
  standbyPercentage: 0.1, // 10%
  maxDistanceKm: 10,
  twoYearNoRepeat: true,
  excludeExempted: true,
};

export function generateHallInvigilationAllotment(
  centres: ExamCentre[],
  schools: School[],
  teachers: Teacher[],
  history: DutyHistory[],
  examCycleId: string,
  config: HallEngineConfig = DEFAULT_HALL_CONFIG,
  currentYear: number = new Date().getFullYear()
): HallAllotmentResult {
  const schoolMap = new Map<string, School>(schools.map((s) => [s.id, s]));
  const fairnessMap = computeFairnessMetrics(teachers, history, currentYear);

  const allotments: DutyAllotment[] = [];
  const violations: RuleViolation[] = [];
  const assignedTeacherIds = new Set<string>();
  const centreHallCounts: { centreId: string; centreName: string; regularHalls: number; standbyCount: number }[] = [];

  let totalRequired = 0;
  let totalStandby = 0;
  let totalDistance = 0;
  let maxDistRecorded = 0;

  // Filter eligible teachers (Exclude exempted, BT/PG assistants eligible for invigilation)
  const eligibleTeachers = teachers.filter((t) => {
    if (config.excludeExempted && t.isExempted) return false;
    // Principals and HMs usually do Chief Superintendent duty, but can be included if configured
    return t.designation !== 'Principal';
  });

  // Fast lookup for 2-year centre history
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

  for (const centre of centres) {
    // Determine students writing at this centre:
    // Sum students from all clubbed schools, or use centre capacity
    let totalStudents = centre.capacity;
    if (centre.clubbedSchoolIds && centre.clubbedSchoolIds.length > 0) {
      const hostSchool = schoolMap.get(centre.schoolId!);
      let clubbedTotal = hostSchool ? (hostSchool.studentStrength12th || hostSchool.studentStrength10th || 60) : 0;
      clubbedTotal += centre.clubbedSchoolIds.reduce((sum, schId) => {
        const sch = schoolMap.get(schId);
        return sum + (sch?.studentStrength12th || sch?.studentStrength10th || 60);
      }, 0);
      if (clubbedTotal > 0) totalStudents = clubbedTotal;
    }

    const regularHalls = Math.max(1, Math.ceil(totalStudents / config.studentsPerHall));
    const standbyCount = Math.max(1, Math.ceil(regularHalls * config.standbyPercentage));
    const centreTotalNeeded = regularHalls + standbyCount;

    totalRequired += centreTotalNeeded;
    totalStandby += standbyCount;

    centreHallCounts.push({
      centreId: centre.id,
      centreName: centre.name,
      regularHalls,
      standbyCount,
    });

    const centreCoords = { lat: centre.lat, lng: centre.lng };
    const excludedSchoolIds = new Set<string>();
    if (centre.schoolId) excludedSchoolIds.add(centre.schoolId);
    if (centre.clubbedSchoolIds) centre.clubbedSchoolIds.forEach((id) => excludedSchoolIds.add(id));

    // Find candidates within distance
    const candidates: { teacher: Teacher; distanceKm: number }[] = [];
    for (const teacher of eligibleTeachers) {
      if (assignedTeacherIds.has(teacher.id)) continue;
      if (excludedSchoolIds.has(teacher.schoolId)) continue; // Don't invigilate own/clubbed school
      if (config.twoYearNoRepeat && recentCentresByTeacher.get(teacher.id)?.has(centre.id)) continue;

      const teacherSchool = schoolMap.get(teacher.schoolId);
      const schoolCoords = teacherSchool
        ? { lat: teacherSchool.lat, lng: teacherSchool.lng }
        : { lat: 11.341, lng: 77.7172 };
      const homeCoords =
        teacher.homeLat && teacher.homeLng ? { lat: teacher.homeLat, lng: teacher.homeLng } : null;

      const distRes = evaluateTeacherCentreDistance(
        schoolCoords,
        centreCoords,
        homeCoords,
        config.maxDistanceKm
      );

      if (distRes.isWithinDistance) {
        candidates.push({ teacher, distanceKm: distRes.minDistanceKm });
      }
    }

    // Sort by fairness (teachers with least duties / oldest duties first)
    const sortedCandidates = sortTeachersByFairness(
      candidates.map((c) => c.teacher),
      fairnessMap,
      false
    );

    const availableCandidates = sortedCandidates.filter(t => !assignedTeacherIds.has(t.id));
    let candidateIndex = 0;

    // Assign regular hall invigilators
    let allottedForThisCentre = 0;
    for (let h = 1; h <= regularHalls; h++) {
      const candidate = availableCandidates[candidateIndex++];
      if (candidate) {
        const dist = candidates.find((c) => c.teacher.id === candidate.id)?.distanceKm || 0;
        assignedTeacherIds.add(candidate.id);
        allottedForThisCentre += 1;
        totalDistance += dist;
        if (dist > maxDistRecorded) maxDistRecorded = dist;

        allotments.push({
          id: `HALL-INV-${centre.id}-${h}-${candidate.id}`,
          teacherId: candidate.id,
          teacherName: candidate.name,
          teacherDesignation: candidate.designation,
          teacherSchoolId: candidate.schoolId,
          teacherSubject: candidate.subject,
          centreId: centre.id,
          centreName: centre.name,
          dutyType: 'Hall Invigilation',
          role: 'Hall Invigilator',
          subject: candidate.subject,
          examCycleId,
          hallNumber: h,
          distanceKm: dist,
          isManualOverride: false,
          status: 'Draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        violations.push({
          code: 'SHORTAGE_INVIGILATOR',
          severity: 'error',
          message: `Insufficient invigilators within ${config.maxDistanceKm}km for Centre "${centre.name}" (Hall ${h}).`,
          centreId: centre.id,
        });
      }
    }

    // Assign 10% standby invigilators
    for (let s = 1; s <= standbyCount; s++) {
      const candidate = availableCandidates[candidateIndex++];
      if (candidate) {
        const dist = candidates.find((c) => c.teacher.id === candidate.id)?.distanceKm || 0;
        assignedTeacherIds.add(candidate.id);
        allottedForThisCentre += 1;
        totalDistance += dist;
        if (dist > maxDistRecorded) maxDistRecorded = dist;

        allotments.push({
          id: `HALL-SBY-${centre.id}-${s}-${candidate.id}`,
          teacherId: candidate.id,
          teacherName: candidate.name,
          teacherDesignation: candidate.designation,
          teacherSchoolId: candidate.schoolId,
          teacherSubject: candidate.subject,
          centreId: centre.id,
          centreName: centre.name,
          dutyType: 'Hall Invigilation',
          role: 'Standby Invigilator',
          subject: candidate.subject,
          examCycleId,
          distanceKm: dist,
          isManualOverride: false,
          status: 'Draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        violations.push({
          code: 'SHORTAGE_STANDBY',
          severity: 'warning',
          message: `Standby invigilator #${s} could not be allotted for Centre "${centre.name}".`,
          centreId: centre.id,
        });
      }
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
    fallbackCount: 0,
    standbyCount: totalStandby,
  };

  return {
    allotments,
    stats,
    violations,
    centreHallCounts,
  };
}
