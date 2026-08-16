// Erode CEO Office Exam Duty Allotment System — Types Definition

export type SchoolType = 'Government' | 'Government Aided' | 'Matriculation' | 'Self-Finance';

export type TeacherDesignation = 
  | 'Principal' 
  | 'Headmaster' 
  | 'PG Assistant' 
  | 'B.T. Assistant' 
  | 'Physical Education Director' 
  | 'Vocational Instructor'
  | 'Special Teacher';

export type Subject = 
  | 'Tamil' 
  | 'English' 
  | 'Mathematics' 
  | 'Physics' 
  | 'Chemistry' 
  | 'Biology' 
  | 'Botany' 
  | 'Zoology' 
  | 'Computer Science' 
  | 'Commerce' 
  | 'Accountancy' 
  | 'Economics' 
  | 'History' 
  | 'General';

export type DutyType = 'Theory' | 'Practical' | 'Hall Invigilation';

export type DutyRole = 
  | 'Chief Superintendent' 
  | 'Department Officer' 
  | 'Internal Examiner' 
  | 'External Examiner' 
  | 'Hall Invigilator' 
  | 'Standby Invigilator'
  | 'Flying Squad'
  | 'Route Officer';

export interface Block {
  id: string;
  name: string;
  code?: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  blockId: string;
  type: SchoolType;
  phone?: string;
  email?: string;
  principalName?: string;
  studentStrength10th?: number;
  studentStrength11th?: number;
  studentStrength12th?: number;
}

export interface ExamCentre {
  id: string;
  centreNumber?: string; // Official centre number assigned by the CEO Office (மைய எண்)
  name: string;
  address: string;
  lat: number;
  lng: number;
  blockId: string;
  schoolId?: string; // Host school if located within a school
  capacity: number;
  totalHalls: number;
  clubbedSchoolIds: string[]; // School IDs writing exams at this centre
  chiefSuperintendentRoom?: string;
  contactPerson?: string;
  phone?: string;
}

export interface Teacher {
  id: string;
  name: string;
  gender: 'M' | 'F' | 'Other';
  schoolId: string;
  subject: Subject;
  designation: TeacherDesignation;
  seniorityRank: number; // 1 = highest seniority
  dateOfJoining: string; // YYYY-MM-DD
  homeLat?: number;
  homeLng?: number;
  isExempted: boolean;
  exemptionReason?: string; // e.g., 'Physically Challenged', 'Medical Board Exemption', 'Infant Care', 'Retiring in 3 months'
  phone: string;
  email?: string;
  pairedTeacherId?: string; // For practical paired swapping
}

export interface DutyHistory {
  id: string;
  teacherId: string;
  teacherName?: string;
  year: number; // e.g. 2024, 2025, 2026
  academicYear?: string; // e.g. '2025-2026'
  examCycleId?: string;
  dutyType: DutyType;
  centreId: string;
  centreName?: string;
  role: DutyRole;
  subject?: Subject;
  allotmentDate?: string;
  notes?: string;
}

export interface ExamCycle {
  id: string;
  label: string; // e.g. "HSE (+2) March 2026 Board Examination"
  standard: '10th' | '11th' | '12th';
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface PracticalBatch {
  id: string;
  schoolId: string;
  centreId?: string;
  subject: Subject;
  size: number; // usually 50 or proportional
  session: 'FN' | 'AN';
  day: number; // Day 1, Day 2, Day 3
  date?: string;
  examCycleId: string;
  internalTeacherId?: string;
  externalTeacherId?: string;
}

export interface Hall {
  id: string;
  centreId: string;
  hallNumber: number;
  capacity: number; // default 20
  isStandby: boolean;
  examCycleId: string;
}

export interface DutyAllotment {
  id: string;
  examCycleId: string;
  teacherId: string;
  teacherName?: string;
  teacherDesignation?: TeacherDesignation;
  teacherSchoolId?: string;
  teacherSubject?: Subject;
  centreId: string;
  centreName?: string;
  role: DutyRole;
  dutyType: DutyType;
  subject?: Subject;
  hallNumber?: number;
  allotmentDate?: string;
  date?: string;
  dates?: string[];
  session?: 'FN' | 'AN' | 'BOTH' | 'Full Day';
  distanceKm: number;
  isManualOverride: boolean;
  overrideReason?: string;
  status: 'Draft' | 'Published' | 'Dispatched';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface RuleViolation {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  teacherId?: string;
  centreId?: string;
  distanceKm?: number;
}

export interface EngineStats {
  totalRequired: number;
  totalAllotted: number;
  unassignedCount: number;
  avgDistanceKm: number;
  maxDistanceKm: number;
  warningsCount: number;
  fallbackCount: number;
  standbyCount: number;
}

export interface TheoryEngineConfig {
  maxDistanceKm: number; // default 10
  excludeOwnSchool: boolean; // default true
  excludeClubbedSchools: boolean; // default true
  twoYearNoRepeat: boolean; // default true
  prioritizeHMs: boolean; // default true
  seniorityFallback: boolean; // default true
  blockWiseSeniority: boolean; // default true
  allowDistanceRelaxationIfShortage: boolean; // fallback if < 10km insufficient
}

export interface PracticalEngineConfig {
  batchSize: number; // default 50
  maxDaysPerSchool: number; // default 3
  roleSwapEnforced: boolean; // default true
  parallelSessions: boolean; // default true (FN + AN)
}

export interface HallEngineConfig {
  studentsPerHall: number; // default 20
  standbyPercentage: number; // default 10%
  maxDistanceKm: number; // default 10
  twoYearNoRepeat: boolean; // default true
  excludeExempted: boolean; // default true
}
