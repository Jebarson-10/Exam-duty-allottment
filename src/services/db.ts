// Clean Enterprise Database Adapter for Erode CEO Office Exam Duty Portal
// Production storage layer without demo mock data. Initializes empty master registry with official blocks.

import {
  Block,
  School,
  ExamCentre,
  Teacher,
  DutyHistory,
  ExamCycle,
  DutyAllotment,
  PracticalBatch,
  AuditLog,
} from '../types';

export const OFFICIAL_ERODE_BLOCKS: Block[] = [
  { id: 'BLK-ERD', name: 'Erode Urban', code: '331001' },
  { id: 'BLK-BHV', name: 'Bhavani', code: '331002' },
  { id: 'BLK-GOBI', name: 'Gobichettipalayam', code: '331003' },
  { id: 'BLK-PRD', name: 'Perundurai', code: '331004' },
  { id: 'BLK-SAT', name: 'Sathyamangalam', code: '331005' },
  { id: 'BLK-ANT', name: 'Anthiyur', code: '331006' },
  { id: 'BLK-KOD', name: 'Kodumudi', code: '331007' },
  { id: 'BLK-MOD', name: 'Modakkurichi', code: '331008' },
  { id: 'BLK-NAM', name: 'Nambiyur', code: '331009' },
  { id: 'BLK-THAL', name: 'Thalavadi', code: '331010' },
];

export const OFFICIAL_EXAM_CYCLES: ExamCycle[] = [
  {
    id: 'CYCLE-2026-HSE2',
    label: 'HSE (+2) March 2026 State Board Public Examination',
    standard: '12th',
    startDate: '2026-03-02',
    endDate: '2026-03-24',
    isActive: true,
  },
  {
    id: 'CYCLE-2026-HSE1',
    label: 'HSE (+1) March 2026 State Board Public Examination',
    standard: '11th',
    startDate: '2026-03-05',
    endDate: '2026-03-27',
    isActive: false,
  },
  {
    id: 'CYCLE-2026-SSLC',
    label: 'SSLC (10th) April 2026 State Board Public Examination',
    standard: '10th',
    startDate: '2026-04-01',
    endDate: '2026-04-18',
    isActive: false,
  },
];

const STORAGE_KEYS = {
  BLOCKS: 'erode_exam_blocks_prod',
  SCHOOLS: 'erode_exam_schools_prod',
  CENTRES: 'erode_exam_centres_prod',
  TEACHERS: 'erode_exam_teachers_prod',
  HISTORY: 'erode_exam_history_prod',
  CYCLES: 'erode_exam_cycles_prod',
  ALLOTMENTS: 'erode_exam_allotments_prod',
  BATCHES: 'erode_exam_batches_prod',
  AUDIT: 'erode_exam_audit_prod',
  ACTIVE_CYCLE: 'erode_exam_active_cycle_prod',
};

const memoryStore: Record<string, string> = {};
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryStore[key] || null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
        return;
      }
    } catch {}
    memoryStore[key] = val;
  },
};

class DatabaseService {
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    if (!safeStorage.getItem(STORAGE_KEYS.BLOCKS)) {
      safeStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(OFFICIAL_ERODE_BLOCKS));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.SCHOOLS)) {
      safeStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.CENTRES)) {
      safeStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.TEACHERS)) {
      safeStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.HISTORY)) {
      safeStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.CYCLES)) {
      safeStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(OFFICIAL_EXAM_CYCLES));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.ALLOTMENTS)) {
      safeStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.BATCHES)) {
      safeStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.AUDIT)) {
      safeStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify([
        {
          id: 'LOG-INIT',
          userEmail: 'ceo.erode@tnschools.gov.in',
          action: 'PORTAL_INITIALIZED',
          details: 'Erode District Exam Allotment Enterprise System Ready. Awaiting Master Data Ingestion.',
          timestamp: new Date().toISOString(),
        }
      ]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.ACTIVE_CYCLE)) {
      safeStorage.setItem(STORAGE_KEYS.ACTIVE_CYCLE, OFFICIAL_EXAM_CYCLES[0].id);
    }
  }

  // --- Clear Database ---
  public clearAllData() {
    safeStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([]));
    this.addAuditLog('DATABASE_CLEARED', 'All master tables and duty allotments cleared by Administrator.');
  }

  // --- Blocks ---
  public getBlocks(): Block[] {
    return JSON.parse(safeStorage.getItem(STORAGE_KEYS.BLOCKS) || '[]');
  }

  // --- Schools ---
  public getSchools(): School[] {
    return JSON.parse(safeStorage.getItem(STORAGE_KEYS.SCHOOLS) || '[]');
  }

  public saveSchool(school: School): void {
    const schools = this.getSchools();
    const index = schools.findIndex((s) => s.id === school.id);
    if (index >= 0) {
      schools[index] = school;
    } else {
      schools.push(school);
    }
    safeStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
    this.addAuditLog('SAVE_SCHOOL', `Saved school: ${school.name} (${school.id})`);
  }

  public batchSaveSchools(newSchools: School[]): void {
    const schools = this.getSchools();
    for (const ns of newSchools) {
      const idx = schools.findIndex((s) => s.id === ns.id || s.name.toLowerCase() === ns.name.toLowerCase());
      if (idx >= 0) {
        schools[idx] = { ...schools[idx], ...ns };
      } else {
        schools.push(ns);
      }
    }
    safeStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
    this.addAuditLog('BATCH_INGEST_SCHOOLS', `Ingested & mapped ${newSchools.length} schools.`);
  }

  public deleteSchool(schoolId: string): void {
    const schools = this.getSchools().filter((s) => s.id !== schoolId);
    safeStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
    this.addAuditLog('DELETE_SCHOOL', `Deleted school ${schoolId}`);
  }

  // --- Centres ---
  public getCentres(): ExamCentre[] {
    return JSON.parse(safeStorage.getItem(STORAGE_KEYS.CENTRES) || '[]');
  }

  public saveCentre(centre: ExamCentre): void {
    const centres = this.getCentres();
    const index = centres.findIndex((c) => c.id === centre.id);
    if (index >= 0) {
      centres[index] = centre;
    } else {
      centres.push(centre);
    }
    safeStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify(centres));
    this.addAuditLog('SAVE_CENTRE', `Saved centre: ${centre.name} (${centre.id})`);
  }

  public batchSaveCentres(newCentres: ExamCentre[]): void {
    const centres = this.getCentres();
    for (const nc of newCentres) {
      const idx = centres.findIndex((c) => c.id === nc.id || c.name.toLowerCase() === nc.name.toLowerCase());
      if (idx >= 0) {
        centres[idx] = { ...centres[idx], ...nc };
      } else {
        centres.push(nc);
      }
    }
    safeStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify(centres));
    this.addAuditLog('BATCH_INGEST_CENTRES', `Ingested & mapped ${newCentres.length} examination centres.`);
  }

  public deleteCentre(centreId: string): void {
    const centres = this.getCentres().filter((c) => c.id !== centreId);
    safeStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify(centres));
    this.addAuditLog('DELETE_CENTRE', `Deleted centre ${centreId}`);
  }

  // --- Teachers ---
  public getTeachers(): Teacher[] {
    return JSON.parse(safeStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
  }

  public saveTeacher(teacher: Teacher): void {
    const teachers = this.getTeachers();
    const index = teachers.findIndex((t) => t.id === teacher.id);
    if (index >= 0) {
      teachers[index] = teacher;
    } else {
      teachers.push(teacher);
    }
    safeStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    this.addAuditLog('SAVE_TEACHER', `Saved faculty member: ${teacher.name} (${teacher.id})`);
  }

  public batchSaveTeachers(newTeachers: Teacher[]): void {
    const teachers = this.getTeachers();
    for (const nt of newTeachers) {
      const idx = teachers.findIndex((t) => t.id === nt.id);
      if (idx >= 0) {
        teachers[idx] = { ...teachers[idx], ...nt };
      } else {
        teachers.push(nt);
      }
    }
    safeStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    this.addAuditLog('BATCH_INGEST_TEACHERS', `Ingested & mapped ${newTeachers.length} faculty members.`);
  }

  public deleteTeacher(teacherId: string): void {
    const teachers = this.getTeachers().filter((t) => t.id !== teacherId);
    safeStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    this.addAuditLog('DELETE_TEACHER', `Deleted teacher ${teacherId}`);
  }

  // --- Duty History ---
  public getDutyHistory(): DutyHistory[] {
    return JSON.parse(safeStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
  }

  public saveDutyHistory(history: DutyHistory[]): void {
    safeStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }

  // --- Exam Cycles ---
  public getExamCycles(): ExamCycle[] {
    return JSON.parse(safeStorage.getItem(STORAGE_KEYS.CYCLES) || '[]');
  }

  public getActiveExamCycle(): ExamCycle {
    const cycles = this.getExamCycles();
    const activeId = safeStorage.getItem(STORAGE_KEYS.ACTIVE_CYCLE);
    const active = cycles.find((c) => c.id === activeId) || cycles[0] || OFFICIAL_EXAM_CYCLES[0];
    return active;
  }

  public setActiveExamCycle(cycleId: string): void {
    safeStorage.setItem(STORAGE_KEYS.ACTIVE_CYCLE, cycleId);
    this.addAuditLog('CHANGE_EXAM_CYCLE', `Active cycle switched to ${cycleId}`);
  }

  // --- Allotments ---
  public getAllotments(examCycleId?: string): DutyAllotment[] {
    const all: DutyAllotment[] = JSON.parse(safeStorage.getItem(STORAGE_KEYS.ALLOTMENTS) || '[]');
    if (examCycleId) {
      return all.filter((a) => a.examCycleId === examCycleId);
    }
    return all;
  }

  public saveAllotments(newAllotments: DutyAllotment[], dutyType?: string, examCycleId?: string): void {
    let all = this.getAllotments();
    if (dutyType && examCycleId) {
      all = all.filter((a) => !(a.dutyType === dutyType && a.examCycleId === examCycleId));
    }
    all.push(...newAllotments);
    safeStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify(all));
    this.addAuditLog(
      'SAVE_ALLOTMENTS',
      `Saved ${newAllotments.length} allotments for ${dutyType || 'Mixed'} in cycle ${examCycleId || 'all'}`
    );
  }

  public updateSingleAllotment(allotment: DutyAllotment): void {
    const all = this.getAllotments();
    const index = all.findIndex((a) => a.id === allotment.id);
    if (index >= 0) {
      all[index] = { ...allotment, updatedAt: new Date().toISOString() };
      safeStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify(all));
      this.addAuditLog(
        'MANUAL_OVERRIDE',
        `Manual override applied to allotment ${allotment.id} (Teacher: ${allotment.teacherName}, Centre: ${allotment.centreName})`
      );
    }
  }

  public deleteAllotment(allotmentId: string): void {
    const all = this.getAllotments().filter((a) => a.id !== allotmentId);
    safeStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify(all));
    this.addAuditLog('DELETE_ALLOTMENT', `Removed allotment ${allotmentId}`);
  }

  // --- Practical Batches ---
  public getPracticalBatches(examCycleId?: string): PracticalBatch[] {
    const all: PracticalBatch[] = JSON.parse(safeStorage.getItem(STORAGE_KEYS.BATCHES) || '[]');
    if (examCycleId) {
      return all.filter((b) => b.examCycleId === examCycleId);
    }
    return all;
  }

  public savePracticalBatches(batches: PracticalBatch[], examCycleId: string): void {
    let all = this.getPracticalBatches();
    all = all.filter((b) => b.examCycleId !== examCycleId);
    all.push(...batches);
    safeStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(all));
  }

  // --- Audit Trail ---
  public getAuditLogs(): AuditLog[] {
    return JSON.parse(safeStorage.getItem(STORAGE_KEYS.AUDIT) || '[]');
  }

  public addAuditLog(action: string, details: string, userEmail: string = 'admin@erode.tnschools.gov.in'): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userEmail,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    safeStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(logs.slice(0, 500)));
  }

  // --- Full District Backup / Snapshot ---
  public createBackupJSON(): string {
    const data = {
      version: '2.0.0-PROD',
      exportedAt: new Date().toISOString(),
      district: 'Erode',
      blocks: this.getBlocks(),
      schools: this.getSchools(),
      centres: this.getCentres(),
      teachers: this.getTeachers(),
      dutyHistory: this.getDutyHistory(),
      examCycles: this.getExamCycles(),
      allotments: this.getAllotments(),
      batches: this.getPracticalBatches(),
      auditLogs: this.getAuditLogs(),
    };
    return JSON.stringify(data, null, 2);
  }

  public restoreFromJSON(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (data.blocks) safeStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(data.blocks));
      if (data.schools) safeStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(data.schools));
      if (data.centres) safeStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify(data.centres));
      if (data.teachers) safeStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(data.teachers));
      if (data.dutyHistory) safeStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data.dutyHistory));
      if (data.examCycles) safeStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(data.examCycles));
      if (data.allotments) safeStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify(data.allotments));
      if (data.batches) safeStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(data.batches));

      this.addAuditLog('RESTORE_SNAPSHOT', `Master database restored from backup timestamp ${data.exportedAt || 'Unknown'}`);
      return { success: true, message: 'District master database successfully restored!' };
    } catch (e: any) {
      return { success: false, message: `Failed to parse backup JSON: ${e.message}` };
    }
  }
}

export const db = new DatabaseService();
