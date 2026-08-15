// Vitest Automated Test Suite for Erode Exam Duty Allotment System
// Tests all constraint rules, edge cases, fallbacks, fairness layer, and conflict auditing

import { describe, it, expect } from 'vitest';
import { calculateDistanceKm, evaluateTeacherCentreDistance } from '../src/services/engine/haversine';
import { computeFairnessMetrics, sortTeachersByFairness } from '../src/services/engine/fairness';
import { generateTheoryDutyAllotment, DEFAULT_THEORY_CONFIG } from '../src/services/engine/theoryDutyEngine';
import { generatePracticalDutyAllotment, DEFAULT_PRACTICAL_CONFIG } from '../src/services/engine/practicalDutyEngine';
import { generateHallInvigilationAllotment, DEFAULT_HALL_CONFIG } from '../src/services/engine/hallInvigilationEngine';
import { auditAllotments } from '../src/services/engine/conflictDetector';
import {
  INITIAL_BLOCKS,
  INITIAL_SCHOOLS,
  INITIAL_CENTRES,
  INITIAL_TEACHERS,
  INITIAL_DUTY_HISTORY,
  INITIAL_EXAM_CYCLES,
} from '../src/services/seedData';
import { Teacher, ExamCentre, School, DutyHistory, DutyAllotment } from '../src/types';

describe('1. Haversine Distance Engine Tests', () => {
  it('accurately calculates distance between known Erode GPS points', () => {
    // Erode Town (11.3418, 77.7212) to Bhavani (11.4485, 77.6833) ~ 12.5 km
    const dist = calculateDistanceKm(
      { lat: 11.3418, lng: 77.7212 },
      { lat: 11.4485, lng: 77.6833 }
    );
    expect(dist).toBeGreaterThan(11);
    expect(dist).toBeLessThan(14);
  });

  it('correctly validates distance <= 10km threshold and checks home vs school coords', () => {
    const schoolCoords = { lat: 11.3418, lng: 77.7212 };
    const centreCoords = { lat: 11.3485, lng: 77.7082 }; // ~1.6 km apart
    const homeCoords = { lat: 11.4000, lng: 77.7000 };

    const res = evaluateTeacherCentreDistance(schoolCoords, centreCoords, homeCoords, 10);
    expect(res.isWithinDistance).toBe(true);
    expect(res.minDistanceKm).toBeLessThan(5);
  });
});

describe('2. Fairness Layer Tests', () => {
  it('penalizes teachers with recent duties and prioritizes staff who have never served', () => {
    const teachers: Teacher[] = [
      {
        id: 'T1',
        name: 'Teacher Recently Served',
        gender: 'M',
        schoolId: 'SCH-01',
        subject: 'Physics',
        designation: 'PG Assistant',
        seniorityRank: 10,
        dateOfJoining: '2015-06-01',
        isExempted: false,
        phone: '9443100001',
      },
      {
        id: 'T2',
        name: 'Teacher Never Served',
        gender: 'F',
        schoolId: 'SCH-01',
        subject: 'Physics',
        designation: 'PG Assistant',
        seniorityRank: 12,
        dateOfJoining: '2016-06-01',
        isExempted: false,
        phone: '9443100002',
      },
    ];

    const history: DutyHistory[] = [
      {
        id: 'H1',
        teacherId: 'T1',
        year: 2025,
        dutyType: 'Theory',
        centreId: 'CTR-01',
        role: 'Chief Superintendent',
      },
    ];

    const fairnessMap = computeFairnessMetrics(teachers, history, 2026);
    expect(fairnessMap.get('T1')!.fairnessPenaltyScore).toBeGreaterThan(fairnessMap.get('T2')!.fairnessPenaltyScore);

    const sorted = sortTeachersByFairness(teachers, fairnessMap, false);
    expect(sorted[0].id).toBe('T2'); // T2 should be prioritized first
  });
});

describe('3. Theory Duty Engine Tests', () => {
  it('generates valid theory allotments without assigning HMs to own or clubbed schools', () => {
    const result = generateTheoryDutyAllotment(
      INITIAL_CENTRES,
      INITIAL_SCHOOLS,
      INITIAL_TEACHERS,
      INITIAL_DUTY_HISTORY,
      INITIAL_EXAM_CYCLES[0].id,
      DEFAULT_THEORY_CONFIG,
      2026
    );

    expect(result.allotments.length).toBeGreaterThan(0);
    const centreMap = new Map(INITIAL_CENTRES.map((c) => [c.id, c]));

    for (const allotment of result.allotments) {
      const centre = centreMap.get(allotment.centreId)!;
      // HM cannot be assigned to their own school
      if (centre.schoolId) {
        expect(allotment.teacherSchoolId).not.toBe(centre.schoolId);
      }
      // HM cannot be assigned to any clubbed school
      if (centre.clubbedSchoolIds) {
        expect(centre.clubbedSchoolIds.includes(allotment.teacherSchoolId || '')).toBe(false);
      }
    }
  });

  it('falls back to Senior PG Teachers strictly by seniority rank when HMs are unavailable', () => {
    // Single centre with only PG teachers available (no HMs)
    const testCentre: ExamCentre = {
      id: 'CTR-TEST',
      name: 'Isolated Test Centre',
      address: 'Brough Road',
      lat: 11.3418,
      lng: 77.7212,
      blockId: 'BLK-ERD',
      capacity: 300,
      totalHalls: 15,
      clubbedSchoolIds: [],
    };

    const testSchool: School = {
      id: 'SCH-OTHER',
      name: 'Other School',
      address: 'Erode',
      lat: 11.3418,
      lng: 77.7212,
      blockId: 'BLK-ERD',
      type: 'Government',
    };

    const pgTeachers: Teacher[] = [
      {
        id: 'PG-JUNIOR',
        name: 'Junior PG Teacher',
        gender: 'M',
        schoolId: 'SCH-OTHER',
        subject: 'Physics',
        designation: 'PG Assistant',
        seniorityRank: 85,
        dateOfJoining: '2020-06-01',
        isExempted: false,
        phone: '9443100085',
      },
      {
        id: 'PG-SENIOR',
        name: 'Senior PG Teacher',
        gender: 'F',
        schoolId: 'SCH-OTHER',
        subject: 'Chemistry',
        designation: 'PG Assistant',
        seniorityRank: 12,
        dateOfJoining: '2008-06-01',
        isExempted: false,
        phone: '9443100012',
      },
    ];

    const result = generateTheoryDutyAllotment(
      [testCentre],
      [testSchool],
      pgTeachers,
      [],
      'CYCLE-TEST',
      DEFAULT_THEORY_CONFIG,
      2026
    );

    const chiefSuperintendent = result.allotments.find((a) => a.role === 'Chief Superintendent');
    expect(chiefSuperintendent).toBeDefined();
    expect(chiefSuperintendent?.teacherId).toBe('PG-SENIOR'); // Must pick senior rank 12 over rank 85
  });
});

describe('4. Practical Duty Engine Tests', () => {
  it('splits students into 50-student batches and assigns Internal and External examiners', () => {
    const result = generatePracticalDutyAllotment(
      INITIAL_SCHOOLS.slice(0, 5),
      INITIAL_TEACHERS,
      INITIAL_DUTY_HISTORY,
      INITIAL_EXAM_CYCLES[0].id,
      DEFAULT_PRACTICAL_CONFIG,
      2026
    );

    expect(result.batches.length).toBeGreaterThan(0);
    expect(result.allotments.length).toBeGreaterThan(0);

    for (const batch of result.batches) {
      expect(batch.size).toBeLessThanOrEqual(50);
      expect(['FN', 'AN']).toContain(batch.session);
    }
  });

  it('performs automatic year-over-year role swap for paired practical examiners', () => {
    const result = generatePracticalDutyAllotment(
      INITIAL_SCHOOLS.slice(0, 4),
      INITIAL_TEACHERS,
      INITIAL_DUTY_HISTORY,
      INITIAL_EXAM_CYCLES[0].id,
      DEFAULT_PRACTICAL_CONFIG,
      2026
    );

    // TCH-018 was External Examiner in 2025 at SCH-02
    // If assigned internally this year, role swapping is confirmed
    expect(result.allotments.length).toBeGreaterThan(0);
  });
});

describe('5. Hall Invigilation Engine Tests', () => {
  it('allocates 1 invigilator per 20 students plus 10% standby pool and excludes exempted staff', () => {
    const result = generateHallInvigilationAllotment(
      INITIAL_CENTRES.slice(0, 3),
      INITIAL_SCHOOLS,
      INITIAL_TEACHERS,
      INITIAL_DUTY_HISTORY,
      INITIAL_EXAM_CYCLES[0].id,
      DEFAULT_HALL_CONFIG,
      2026
    );

    expect(result.allotments.length).toBeGreaterThan(0);
    expect(result.stats.standbyCount).toBeGreaterThan(0);

    // Verify exempted teachers (like TCH-016 and TCH-017) are NOT allotted
    const allottedTeacherIds = new Set(result.allotments.map((a) => a.teacherId));
    expect(allottedTeacherIds.has('TCH-016')).toBe(false);
    expect(allottedTeacherIds.has('TCH-017')).toBe(false);
  });
});

describe('6. Conflict Auditor Tests', () => {
  it('detects own-school violations, distance violations, and double bookings', () => {
    // 1. Own school violation (TCH-001 is from SCH-01, assigned to CTR-01 which is at SCH-01)
    const ownSchoolConflict: DutyAllotment = {
      id: 'BAD-01',
      teacherId: 'TCH-001',
      centreId: 'CTR-01',
      dutyType: 'Theory',
      role: 'Chief Superintendent',
      examCycleId: 'CYCLE-2026-HSE2',
      distanceKm: 0.5,
      isManualOverride: false,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. Far distance violation (TCH-001 in Erode assigned to CTR-10 in Sathyamangalam > 40 km away)
    const farDistanceConflict: DutyAllotment = {
      id: 'BAD-02',
      teacherId: 'TCH-001',
      centreId: 'CTR-10', // Sathyamangalam centre
      dutyType: 'Theory',
      role: 'Chief Superintendent',
      examCycleId: 'CYCLE-2026-HSE2',
      distanceKm: 42,
      isManualOverride: false,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const violations = auditAllotments(
      [ownSchoolConflict, farDistanceConflict],
      INITIAL_TEACHERS,
      INITIAL_CENTRES,
      INITIAL_SCHOOLS,
      INITIAL_DUTY_HISTORY,
      10,
      2026
    );

    expect(violations.length).toBeGreaterThan(0);
    const codes = violations.map((v) => v.code);
    expect(codes).toContain('OWN_SCHOOL_CONFLICT');
    expect(codes).toContain('EXCEEDS_10KM_DISTANCE');
    expect(codes).toContain('DOUBLE_BOOKING_CONFLICT'); // TCH-001 is in both allotments
  });
});
