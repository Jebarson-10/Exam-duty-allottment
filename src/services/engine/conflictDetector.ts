// Real-time Conflict & Rule Violation Detector for Erode CEO Office

import {
  DutyAllotment,
  Teacher,
  ExamCentre,
  School,
  DutyHistory,
  RuleViolation,
} from '../../types';
import { evaluateTeacherCentreDistance } from './haversine';

export function auditAllotments(
  allotments: DutyAllotment[],
  teachers: Teacher[],
  centres: ExamCentre[],
  schools: School[],
  history: DutyHistory[],
  maxAllowedDistanceKm: number = 10,
  currentYear: number = new Date().getFullYear()
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const teacherMap = new Map<string, Teacher>(teachers.map((t) => [t.id, t]));
  const centreMap = new Map<string, ExamCentre>(centres.map((c) => [c.id, c]));
  const schoolMap = new Map<string, School>(schools.map((s) => [s.id, s]));

  const combinedCentreMap = new Map<string, ExamCentre>(centreMap);
  for (const school of schools) {
    if (!combinedCentreMap.has(school.id)) {
      combinedCentreMap.set(school.id, {
        id: school.id,
        name: school.name,
        schoolId: school.id,
        lat: school.lat,
        lng: school.lng,
        capacity: 0,
      } as ExamCentre);
    }
  }

  // Track double booking: `teacherId-${session}-${date}` -> list of allotment ids
  const teacherSessionSlots = new Map<string, DutyAllotment[]>();

  // Fast lookup for 2-year history
  const recentCentresByTeacher = new Map<string, Set<string>>();
  for (const h of history) {
    if (h.year >= currentYear - 2) {
      if (!recentCentresByTeacher.has(h.teacherId)) {
        recentCentresByTeacher.set(h.teacherId, new Set<string>());
      }
      recentCentresByTeacher.get(h.teacherId)!.add(h.centreId);
    }
  }

  for (const allotment of allotments) {
    const teacher = teacherMap.get(allotment.teacherId);
    const centre = combinedCentreMap.get(allotment.centreId);

    if (!teacher) {
      violations.push({
        code: 'INVALID_TEACHER',
        severity: 'error',
        message: `Allotment ${allotment.id} references unknown teacher ID ${allotment.teacherId}`,
      });
      continue;
    }

    if (!centre && allotment.dutyType !== 'Practical') {
      violations.push({
        code: 'INVALID_CENTRE',
        severity: 'error',
        message: `Allotment ${allotment.id} references unknown centre ID ${allotment.centreId}`,
      });
      continue;
    }

    // 1. Exemption check
    if (teacher.isExempted) {
      violations.push({
        code: 'EXEMPTED_TEACHER_ASSIGNED',
        severity: 'error',
        message: `Exempted staff ${teacher.name} (${teacher.exemptionReason || 'Medical/Board exemption'}) has been allotted to ${allotment.role} at ${allotment.centreName || 'centre'}.`,
        teacherId: teacher.id,
        centreId: allotment.centreId,
      });
    }

    // 2. Double booking check
    if (allotment.date) {
      const slotKey = `${teacher.id}_${allotment.date}_${allotment.session || 'ALL'}`;
      if (!teacherSessionSlots.has(slotKey)) {
        teacherSessionSlots.set(slotKey, []);
      }
      const currentSlots = teacherSessionSlots.get(slotKey)!;
      currentSlots.push(allotment);

      if (currentSlots.length > 1) {
        violations.push({
          code: 'DOUBLE_BOOKING_CONFLICT',
          severity: 'error',
          message: `Teacher ${teacher.name} is double-booked across ${currentSlots.length} duties (${currentSlots.map((s) => s.role).join(', ')}).`,
          teacherId: teacher.id,
        });
      }
    }

    // 3. Own school and clubbed school check (Theory & Hall Invigilation)
    if (centre && allotment.dutyType !== 'Practical') {
      const excludedSchoolIds = new Set<string>();
      if (centre.schoolId) excludedSchoolIds.add(centre.schoolId);
      if (centre.clubbedSchoolIds) centre.clubbedSchoolIds.forEach((id) => excludedSchoolIds.add(id));

      if (excludedSchoolIds.has(teacher.schoolId)) {
        violations.push({
          code: 'OWN_SCHOOL_CONFLICT',
          severity: 'error',
          message: `Rule Violation: Teacher ${teacher.name} is allotted to their own or clubbed school centre "${centre.name}".`,
          teacherId: teacher.id,
          centreId: centre.id,
        });
      }
    }

    // 4. Practical External Examiner own school check
    if (allotment.dutyType === 'Practical' && allotment.role === 'External Examiner') {
      if (allotment.centreId === teacher.schoolId) {
        violations.push({
          code: 'EXTERNAL_EXAMINER_OWN_SCHOOL',
          severity: 'error',
          message: `External Examiner ${teacher.name} cannot be assigned to their own school lab.`,
          teacherId: teacher.id,
        });
      }
    }

    // 5. 2-Year No-Repeat Location check
    if (centre && recentCentresByTeacher.get(teacher.id)?.has(centre.id)) {
      violations.push({
        code: 'REPEAT_CENTRE_2YEAR',
        severity: 'warning',
        message: `2-Year Rule Warning: Teacher ${teacher.name} served at centre "${centre.name}" in the past 2 years.`,
        teacherId: teacher.id,
        centreId: centre.id,
      });
    }

    // 6. Distance Check (> maxAllowedDistanceKm)
    if (centre) {
      const teacherSchool = schoolMap.get(teacher.schoolId);
      const schoolCoords = teacherSchool
        ? { lat: teacherSchool.lat, lng: teacherSchool.lng }
        : { lat: 11.341, lng: 77.7172 };
      const homeCoords =
        teacher.homeLat && teacher.homeLng ? { lat: teacher.homeLat, lng: teacher.homeLng } : null;

      const evalRes = evaluateTeacherCentreDistance(
        schoolCoords,
        { lat: centre.lat, lng: centre.lng },
        homeCoords,
        maxAllowedDistanceKm
      );

      if (!evalRes.isWithinDistance) {
        violations.push({
          code: 'EXCEEDS_10KM_DISTANCE',
          severity: 'warning',
          message: `Distance Warning: Teacher ${teacher.name} is assigned to centre "${centre.name}" at a distance of ${evalRes.minDistanceKm} km (> ${maxAllowedDistanceKm} km).`,
          teacherId: teacher.id,
          centreId: centre.id,
          distanceKm: evalRes.minDistanceKm,
        });
      }
    }
  }

  return violations;
}
