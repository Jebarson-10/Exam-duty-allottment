// Practical Duty Allotment Engine for Erode CEO Office
// Handles batch creation (50 students), parallel sessions (FN/AN), internal + external examiners,
// paired year-over-year role swap, and 2-3 day per school completion window.

import {
  Teacher,
  School,
  ExamCentre,
  DutyHistory,
  DutyAllotment,
  PracticalBatch,
  PracticalEngineConfig,
  EngineStats,
  RuleViolation,
  Subject,
} from '../../types';
import { evaluateTeacherCentreDistance } from './haversine';
import { computeFairnessMetrics } from './fairness';

export interface PracticalAllotmentResult {
  batches: PracticalBatch[];
  allotments: DutyAllotment[];
  stats: EngineStats;
  violations: RuleViolation[];
  unassignedBatches: PracticalBatch[];
}

export const DEFAULT_PRACTICAL_CONFIG: PracticalEngineConfig = {
  batchSize: 50,
  maxDaysPerSchool: 3,
  roleSwapEnforced: true,
  parallelSessions: true,
};

export const PRACTICAL_SUBJECTS: Subject[] = [
  'Physics',
  'Chemistry',
  'Biology',
  'Botany',
  'Zoology',
  'Computer Science',
];

export function generatePracticalDutyAllotment(
  schools: School[],
  teachers: Teacher[],
  history: DutyHistory[],
  examCycleId: string,
  config: PracticalEngineConfig = DEFAULT_PRACTICAL_CONFIG,
  currentYear: number = new Date().getFullYear()
): PracticalAllotmentResult {
  const schoolMap = new Map<string, School>(schools.map((s) => [s.id, s]));
  const fairnessMap = computeFairnessMetrics(teachers, history, currentYear);
  const activeTeachers = teachers.filter((t) => !t.isExempted);

  const batches: PracticalBatch[] = [];
  const allotments: DutyAllotment[] = [];
  const violations: RuleViolation[] = [];
  const unassignedBatches: PracticalBatch[] = [];

  let totalDistance = 0;
  let maxDistRecorded = 0;
  let totalRequiredRoles = 0;

  // Track past year roles for teachers: teacherId -> { year, role, subject, centreId }
  const pastYearRoleMap = new Map<string, { role: string; centreId: string }>();
  for (const h of history) {
    if (h.year === currentYear - 1 && h.dutyType === 'Practical') {
      pastYearRoleMap.set(h.teacherId, { role: h.role, centreId: h.centreId });
    }
  }

  // Generate practical batches per school per practical subject
  for (const school of schools) {
    const totalStudents12th = school.studentStrength12th || 120; // Default 120 students if unspecified

    // Practical science stream is typically ~60-70% of 12th standard
    const scienceStudents = Math.round(totalStudents12th * 0.7);

    if (scienceStudents <= 0) continue;

    for (const subject of PRACTICAL_SUBJECTS) {
      // Check if school has teachers for this subject
      const schoolSubjectTeachers = activeTeachers.filter(
        (t) => t.schoolId === school.id && t.subject === subject
      );

      if (schoolSubjectTeachers.length === 0) {
        continue; // School doesn't offer this practical subject
      }

      // Compute number of batches: ceil(scienceStudents / batchSize)
      const numBatches = Math.max(1, Math.ceil(scienceStudents / config.batchSize));
      let currentDay = 1;
      let session: 'FN' | 'AN' = 'FN';

      for (let b = 1; b <= numBatches; b++) {
        // Enforce max days per school (e.g. 2-3 days max)
        if (currentDay > config.maxDaysPerSchool) {
          violations.push({
            code: 'EXCEEDS_MAX_DAYS',
            severity: 'warning',
            message: `Practical schedule for ${school.name} (${subject}) exceeds target ${config.maxDaysPerSchool} days window.`,
          });
        }

        const batch: PracticalBatch = {
          id: `BATCH-${school.id}-${subject}-${b}`,
          schoolId: school.id,
          subject,
          size: Math.min(config.batchSize, Math.max(15, Math.round(scienceStudents / numBatches))),
          session,
          day: currentDay,
          examCycleId,
        };

        batches.push(batch);

        // Advance session: FN -> AN, or AN -> next day FN
        if (config.parallelSessions) {
          if (session === 'FN') {
            session = 'AN';
          } else {
            session = 'FN';
            currentDay += 1;
          }
        } else {
          currentDay += 1;
        }
      }
    }
  }

  // Now assign Internal and External Examiners for each batch
  const assignedTeachersPerSession = new Map<string, Set<string>>(); // `${day}-${session}` -> Set<teacherId>

  for (const batch of batches) {
    const sessionKey = `${batch.day}-${batch.session}`;
    if (!assignedTeachersPerSession.has(sessionKey)) {
      assignedTeachersPerSession.set(sessionKey, new Set<string>());
    }
    const busyTeachers = assignedTeachersPerSession.get(sessionKey)!;

    const hostSchool = schoolMap.get(batch.schoolId);
    if (!hostSchool) continue;

    // 1. Assign Internal Examiner: Must be from host school teaching that subject
    totalRequiredRoles += 1;
    const internalCandidates = activeTeachers.filter(
      (t) =>
        t.schoolId === batch.schoolId &&
        t.subject === batch.subject &&
        !busyTeachers.has(t.id)
    );

    let selectedInternal: Teacher | null = null;
    if (internalCandidates.length > 0) {
      // Check year-over-year role swap: If teacher was External last year, they are preferred as Internal this year!
      const preferredSwap = internalCandidates.find(
        (t) => pastYearRoleMap.get(t.id)?.role === 'External Examiner'
      );
      selectedInternal = preferredSwap || internalCandidates[0];
      batch.internalTeacherId = selectedInternal.id;
      busyTeachers.add(selectedInternal.id);

      allotments.push({
        id: `PR-INT-${batch.id}-${selectedInternal.id}`,
        teacherId: selectedInternal.id,
        teacherName: selectedInternal.name,
        teacherDesignation: selectedInternal.designation,
        teacherSchoolId: selectedInternal.schoolId,
        teacherSubject: selectedInternal.subject,
        centreId: batch.schoolId,
        centreName: `${hostSchool.name} Lab`,
        dutyType: 'Practical',
        role: 'Internal Examiner',
        subject: batch.subject,
        examCycleId,
        session: batch.session,
        distanceKm: 0, // Own school
        isManualOverride: false,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Assign External Examiner: Must NOT be from host school, must teach same subject, within <=10km
    totalRequiredRoles += 1;
    const externalCandidates = activeTeachers.filter(
      (t) =>
        t.schoolId !== batch.schoolId &&
        t.subject === batch.subject &&
        !busyTeachers.has(t.id)
    );

    // Evaluate distance for each external candidate
    const eligibleExternals: { teacher: Teacher; distanceKm: number; swappedRole: boolean }[] = [];
    for (const cand of externalCandidates) {
      const candSchool = schoolMap.get(cand.schoolId);
      if (!candSchool?.lat || !candSchool?.lng || !hostSchool.lat || !hostSchool.lng) {
        continue;
      }
      const schoolCoords = { lat: candSchool.lat, lng: candSchool.lng };
      const homeCoords =
        cand.homeLat && cand.homeLng ? { lat: cand.homeLat, lng: cand.homeLng } : null;

      const evalDist = evaluateTeacherCentreDistance(
        schoolCoords,
        { lat: hostSchool.lat, lng: hostSchool.lng },
        homeCoords,
        15 // External distance threshold
      );

      if (evalDist.isWithinDistance) {
        // Check role swap: If they were Internal last year, they are prime candidates for External this year
        const wasInternalLastYear = pastYearRoleMap.get(cand.id)?.role === 'Internal Examiner';
        eligibleExternals.push({
          teacher: cand,
          distanceKm: evalDist.minDistanceKm,
          swappedRole: wasInternalLastYear,
        });
      }
    }

    // Sort externals: Role swapped first, then lowest fairness penalty, then closest distance
    eligibleExternals.sort((a, b) => {
      if (a.swappedRole !== b.swappedRole) return a.swappedRole ? -1 : 1;
      const fa = fairnessMap.get(a.teacher.id)?.fairnessPenaltyScore || 0;
      const fb = fairnessMap.get(b.teacher.id)?.fairnessPenaltyScore || 0;
      if (fa !== fb) return fa - fb;
      return a.distanceKm - b.distanceKm;
    });

    let selectedExternal: Teacher | null = eligibleExternals[0]?.teacher || null;
    let selectedExternalDist = eligibleExternals[0]?.distanceKm || 0;

    if (selectedExternal) {
      batch.externalTeacherId = selectedExternal.id;
      busyTeachers.add(selectedExternal.id);
      totalDistance += selectedExternalDist;
      if (selectedExternalDist > maxDistRecorded) maxDistRecorded = selectedExternalDist;

      allotments.push({
        id: `PR-EXT-${batch.id}-${selectedExternal.id}`,
        teacherId: selectedExternal.id,
        teacherName: selectedExternal.name,
        teacherDesignation: selectedExternal.designation,
        teacherSchoolId: selectedExternal.schoolId,
        teacherSubject: selectedExternal.subject,
        centreId: batch.schoolId,
        centreName: `${hostSchool.name} Lab`,
        dutyType: 'Practical',
        role: 'External Examiner',
        subject: batch.subject,
        examCycleId,
        session: batch.session,
        distanceKm: selectedExternalDist,
        isManualOverride: false,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      unassignedBatches.push(batch);
      violations.push({
        code: 'MISSING_EXTERNAL_EXAMINER',
        severity: 'error',
        message: `No eligible External Examiner found for ${hostSchool.name} - ${batch.subject} (Day ${batch.day} ${batch.session}).`,
        centreId: hostSchool.id,
      });
    }
  }

  const totalAllotted = allotments.length;
  const unassignedCount = totalRequiredRoles - totalAllotted;
  const avgDistanceKm = totalAllotted > 0 ? Math.round((totalDistance / totalAllotted) * 100) / 100 : 0;

  const stats: EngineStats = {
    totalRequired: totalRequiredRoles,
    totalAllotted,
    unassignedCount,
    avgDistanceKm,
    maxDistanceKm: maxDistRecorded,
    warningsCount: violations.length,
    fallbackCount: 0,
    standbyCount: 0,
  };

  return {
    batches,
    allotments,
    stats,
    violations,
    unassignedBatches,
  };
}
