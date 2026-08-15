// Vitest Automated Tests for Multi-Year History Feedback Loop and Cross-Cycle Constraints

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/services/db';
import { generateTheoryDutyAllotment } from '../src/services/engine/theoryDutyEngine';
import { computeFairnessMetrics, sortTeachersByFairness } from '../src/services/engine/fairness';
import { IngestionService } from '../src/services/ingestionService';
import { School, ExamCentre, Teacher, DutyAllotment, ExamCycle } from '../src/types';
import * as XLSX from 'xlsx';

describe('3. Multi-Year History Feedback Loop & Cross-Cycle Constraint Tests', () => {
  const mockSchool1: School = {
    id: 'SCH-01',
    name: 'Govt Model Girls HSS, Erode',
    address: 'Brough Road, Erode',
    lat: 11.3418,
    lng: 77.7212,
    blockId: 'BLK-ERD',
    type: 'Government',
  };

  const mockSchool2: School = {
    id: 'SCH-02',
    name: 'Govt Boys HSS, Bhavani',
    address: 'Bhavani Town',
    lat: 11.3450, // ~400m from centre
    lng: 77.7220,
    blockId: 'BLK-ERD',
    type: 'Government',
  };

  const mockCentre: ExamCentre = {
    id: 'CTR-01',
    name: 'Erode Central Exam Centre',
    address: 'Erode',
    lat: 11.3420,
    lng: 77.7215,
    blockId: 'BLK-ERD',
    capacity: 300,
    totalHalls: 15,
    clubbedSchoolIds: [],
  };

  const teacherA: Teacher = {
    id: 'TCH-A',
    name: 'HM Raman',
    gender: 'M',
    schoolId: 'SCH-02', // not own school of CTR-01
    designation: 'Headmaster',
    subject: 'Mathematics',
    seniorityRank: 1,
    dateOfJoining: '2000-01-01',
    isExempted: false,
    phone: '9443100001',
  };

  const teacherB: Teacher = {
    id: 'TCH-B',
    name: 'HM Suresh',
    gender: 'M',
    schoolId: 'SCH-02',
    designation: 'Headmaster',
    subject: 'Physics',
    seniorityRank: 2,
    dateOfJoining: '2002-01-01',
    isExempted: false,
    phone: '9443100002',
  };

  const cycle2025: ExamCycle = {
    id: 'CYCLE-2025-HSE2',
    label: 'HSE (+2) March 2025 State Board Examination',
    standard: '12th',
    startDate: '2025-03-02',
    endDate: '2025-03-24',
    isActive: false,
  };

  const cycle2026: ExamCycle = {
    id: 'CYCLE-2026-HSE2',
    label: 'HSE (+2) March 2026 State Board Examination',
    standard: '12th',
    startDate: '2026-03-02',
    endDate: '2026-03-24',
    isActive: true,
  };

  beforeEach(() => {
    db.clearAllData();
  });

  it('automatically synchronizes saved allotments into persistent Duty History', () => {
    const allotment: DutyAllotment = {
      id: 'ALLOT-TEST-1',
      examCycleId: 'CYCLE-2025-HSE2',
      teacherId: 'TCH-A',
      teacherName: 'HM Raman',
      centreId: 'CTR-01',
      centreName: 'Erode Central Exam Centre',
      role: 'Chief Superintendent',
      dutyType: 'Theory',
      allotmentDate: '2025-03-02',
      distanceKm: 0.5,
      isManualOverride: false,
      status: 'Published',
    };

    // Save allotment in db
    db.saveAllotments([allotment], 'Theory', 'CYCLE-2025-HSE2');

    // Verify history now contains this allotment automatically
    const history = db.getDutyHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history.some((h) => h.teacherId === 'TCH-A' && h.centreId === 'CTR-01' && h.year === 2025)).toBe(true);
  });

  it('strictly enforces 2-year no-repeat rule in subsequent exam cycle using accumulated history', () => {
    // 1. In Cycle 2025, Teacher A serves at CTR-01
    const pastAllotment: DutyAllotment = {
      id: 'ALLOT-2025-1',
      examCycleId: 'CYCLE-2025-HSE2',
      teacherId: 'TCH-A',
      teacherName: 'HM Raman',
      centreId: 'CTR-01',
      centreName: 'Erode Central Exam Centre',
      role: 'Chief Superintendent',
      dutyType: 'Theory',
      allotmentDate: '2025-03-02',
      distanceKm: 0.5,
      isManualOverride: false,
      status: 'Published',
    };
    db.saveAllotments([pastAllotment], 'Theory', 'CYCLE-2025-HSE2');

    const updatedHistory = db.getDutyHistory();

    // 2. Now run 2026 allotment engine for CTR-01
    // Teacher A (Seniority 1) served CTR-01 in 2025 (1 year ago < 2 years), so Teacher A MUST be blocked
    // Teacher B (Seniority 2) should get the Chief Superintendent duty instead!
    const result2026 = generateTheoryDutyAllotment(
      [mockCentre],
      [mockSchool1, mockSchool2],
      [teacherA, teacherB],
      updatedHistory,
      cycle2026.id
    );

    const chief = result2026.allotments.find((a) => a.role === 'Chief Superintendent' && a.centreId === 'CTR-01');
    expect(chief).toBeDefined();
    // Teacher B must be allotted because Teacher A is blocked by 2-year no-repeat rule
    expect(chief?.teacherId).toBe('TCH-B');
    expect(chief?.teacherName).toBe('HM Suresh');
  });

  it('dynamically balances fairness workload giving priority to unburdened teachers', () => {
    // Simulate history where Teacher A has 3 past duties and Teacher B has 0
    const history = [
      { id: 'H1', teacherId: 'TCH-A', year: 2025, dutyType: 'Theory' as const, centreId: 'CTR-X', role: 'Chief Superintendent' as const },
      { id: 'H2', teacherId: 'TCH-A', year: 2024, dutyType: 'Theory' as const, centreId: 'CTR-Y', role: 'Chief Superintendent' as const },
      { id: 'H3', teacherId: 'TCH-A', year: 2023, dutyType: 'Practical' as const, centreId: 'CTR-Z', role: 'External Examiner' as const },
    ];

    const fairnessMap = computeFairnessMetrics([teacherA, teacherB], history, 2026);
    const scoreA = fairnessMap.get('TCH-A')?.fairnessPenaltyScore || 0;
    const scoreB = fairnessMap.get('TCH-B')?.fairnessPenaltyScore || 0;

    expect(scoreA).toBeGreaterThan(scoreB);
    expect(scoreB).toBe(0);

    const sorted = sortTeachersByFairness([teacherA, teacherB], fairnessMap);
    // Teacher B should be first in queue
    expect(sorted[0].id).toBe('TCH-B');
  });

  it('ingests historical Excel duty records and incorporates them into history', async () => {
    const historicalRows = [
      {
        'Academic Year': '2023-2024',
        'Exam Year': 2024,
        'Teacher ID': 'TCH-1001',
        'Teacher Name': 'Dr. S. Meenakshi',
        'Exam Centre Name': 'Govt Model GHSS Centre, Erode',
        'Duty Role': 'Chief Superintendent',
        'Duty Type': 'Theory',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(historicalRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historical Duty 2024');
    const binary = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await IngestionService.parseSpreadsheet(binary);
    expect(parsed.detectedType).toBe('DUTY_HISTORY');
    expect(parsed.history.length).toBe(1);
    expect(parsed.history[0].year).toBe(2024);
    expect(parsed.history[0].role).toBe('Chief Superintendent');

    db.batchSaveDutyHistory(parsed.history);
    const allHistory = db.getDutyHistory();
    expect(allHistory.some((h) => h.teacherId === 'TCH-1001' && h.year === 2024)).toBe(true);
  });
});
