// Unified Database & Storage Adapter for Erode CEO Office Exam Duty Allotment System
// Dual mode: Cloudflare Pages D1 API + Local-First LocalStorage / IndexedDB

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
import {
  INITIAL_BLOCKS,
  INITIAL_SCHOOLS,
  INITIAL_CENTRES,
  INITIAL_TEACHERS,
  INITIAL_DUTY_HISTORY,
  INITIAL_EXAM_CYCLES,
} from './seedData';

const STORAGE_KEYS = {
  BLOCKS: 'erode_exam_blocks',
  SCHOOLS: 'erode_exam_schools',
  CENTRES: 'erode_exam_centres',
  TEACHERS: 'erode_exam_teachers',
  HISTORY: 'erode_exam_history',
  CYCLES: 'erode_exam_cycles',
  ALLOTMENTS: 'erode_exam_allotments',
  BATCHES: 'erode_exam_batches',
  AUDIT: 'erode_exam_audit',
  ACTIVE_CYCLE: 'erode_exam_active_cycle',
  USE_REMOTE_API: 'erode_exam_use_remote_api',
};

class DatabaseService {
  private isCloudflareAvailable: boolean = false;

  constructor() {
    this.initLocalStorage();
  }

  private initLocalStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.BLOCKS)) {
      localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(INITIAL_BLOCKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCHOOLS)) {
      localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(INITIAL_SCHOOLS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CENTRES)) {
      localStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify(INITIAL_CENTRES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEACHERS)) {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(INITIAL_DUTY_HISTORY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CYCLES)) {
      localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(INITIAL_EXAM_CYCLES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ALLOTMENTS)) {
      localStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BATCHES)) {
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify([
        {
          id: 'LOG-001',
          userEmail: 'ceo.erode@tnschools.gov.in',
          action: 'SYSTEM_INITIALIZATION',
          details: 'Erode CEO Exam Duty Portal Initialized with District Master Data.',
          timestamp: new Date().toISOString(),
        }
      ]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_CYCLE)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CYCLE, INITIAL_EXAM_CYCLES[0].id);
    }
  }

  // --- Reset to Initial Seed Data ---
  public resetToSeedData() {
    localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(INITIAL_BLOCKS));
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(INITIAL_SCHOOLS));
    localStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify(INITIAL_CENTRES));
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(INITIAL_DUTY_HISTORY));
    localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(INITIAL_EXAM_CYCLES));
    localStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([]));
    this.addAuditLog('MASTER_RESET', 'System data restored to official Erode district initial seed state.');
  }

  // --- Blocks ---
  public getBlocks(): Block[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.BLOCKS) || '[]');
  }

  // --- Schools ---
  public getSchools(): School[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHOOLS) || '[]');
  }

  public saveSchool(school: School): void {
    const schools = this.getSchools();
    const index = schools.findIndex((s) => s.id === school.id);
    if (index >= 0) {
      schools[index] = school;
    } else {
      schools.push(school);
    }
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
    this.addAuditLog('SAVE_SCHOOL', `Saved school ${school.name} (${school.id})`);
  }

  public deleteSchool(schoolId: string): void {
    const schools = this.getSchools().filter((s) => s.id !== schoolId);
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
    this.addAuditLog('DELETE_SCHOOL', `Deleted school ${schoolId}`);
  }

  // --- Centres ---
  public getCentres(): ExamCentre[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CENTRES) || '[]');
  }

  public saveCentre(centre: ExamCentre): void {
    const centres = this.getCentres();
    const index = centres.findIndex((c) => c.id === centre.id);
    if (index >= 0) {
      centres[index] = centre;
    } else {
      centres.push(centre);
    }
    localStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify(centres));
    this.addAuditLog('SAVE_CENTRE', `Saved centre ${centre.name} (${centre.id})`);
  }

  public deleteCentre(centreId: string): void {
    const centres = this.getCentres().filter((c) => c.id !== centreId);
    localStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify(centres));
    this.addAuditLog('DELETE_CENTRE', `Deleted centre ${centreId}`);
  }

  // --- Teachers ---
  public getTeachers(): Teacher[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
  }

  public saveTeacher(teacher: Teacher): void {
    const teachers = this.getTeachers();
    const index = teachers.findIndex((t) => t.id === teacher.id);
    if (index >= 0) {
      teachers[index] = teacher;
    } else {
      teachers.push(teacher);
    }
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    this.addAuditLog('SAVE_TEACHER', `Saved teacher ${teacher.name} (${teacher.id})`);
  }

  public deleteTeacher(teacherId: string): void {
    const teachers = this.getTeachers().filter((t) => t.id !== teacherId);
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    this.addAuditLog('DELETE_TEACHER', `Deleted teacher ${teacherId}`);
  }

  // --- Duty History ---
  public getDutyHistory(): DutyHistory[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
  }

  public saveDutyHistory(history: DutyHistory[]): void {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }

  // --- Exam Cycles ---
  public getExamCycles(): ExamCycle[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CYCLES) || '[]');
  }

  public getActiveExamCycle(): ExamCycle {
    const cycles = this.getExamCycles();
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CYCLE);
    const active = cycles.find((c) => c.id === activeId) || cycles[0] || INITIAL_EXAM_CYCLES[0];
    return active;
  }

  public setActiveExamCycle(cycleId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CYCLE, cycleId);
    this.addAuditLog('CHANGE_EXAM_CYCLE', `Active cycle switched to ${cycleId}`);
  }

  // --- Allotments ---
  public getAllotments(examCycleId?: string): DutyAllotment[] {
    const all: DutyAllotment[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALLOTMENTS) || '[]');
    if (examCycleId) {
      return all.filter((a) => a.examCycleId === examCycleId);
    }
    return all;
  }

  public saveAllotments(newAllotments: DutyAllotment[], dutyType?: string, examCycleId?: string): void {
    let all = this.getAllotments();
    if (dutyType && examCycleId) {
      // Replace only allotments for this specific duty type and cycle
      all = all.filter((a) => !(a.dutyType === dutyType && a.examCycleId === examCycleId));
    }
    all.push(...newAllotments);
    localStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify(all));
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
      localStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify(all));
      this.addAuditLog(
        'MANUAL_OVERRIDE',
        `Manual override applied to allotment ${allotment.id} (Teacher: ${allotment.teacherName}, Centre: ${allotment.centreName})`
      );
    }
  }

  public deleteAllotment(allotmentId: string): void {
    const all = this.getAllotments().filter((a) => a.id !== allotmentId);
    localStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify(all));
    this.addAuditLog('DELETE_ALLOTMENT', `Removed allotment ${allotmentId}`);
  }

  // --- Practical Batches ---
  public getPracticalBatches(examCycleId?: string): PracticalBatch[] {
    const all: PracticalBatch[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BATCHES) || '[]');
    if (examCycleId) {
      return all.filter((b) => b.examCycleId === examCycleId);
    }
    return all;
  }

  public savePracticalBatches(batches: PracticalBatch[], examCycleId: string): void {
    let all = this.getPracticalBatches();
    all = all.filter((b) => b.examCycleId !== examCycleId);
    all.push(...batches);
    localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(all));
  }

  // --- Audit Trail ---
  public getAuditLogs(): AuditLog[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT) || '[]');
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
    // Keep last 500 logs
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(logs.slice(0, 500)));
  }

  // --- Full District Backup / Snapshot ---
  public createBackupJSON(): string {
    const data = {
      version: '1.0.0',
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
      if (!data.schools || !data.centres || !data.teachers) {
        return { success: false, message: 'Invalid backup file structure. Missing core master tables.' };
      }
      if (data.blocks) localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(data.blocks));
      if (data.schools) localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(data.schools));
      if (data.centres) localStorage.setItem(STORAGE_KEYS.CENTRES, JSON.stringify(data.centres));
      if (data.teachers) localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(data.teachers));
      if (data.dutyHistory) localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data.dutyHistory));
      if (data.examCycles) localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(data.examCycles));
      if (data.allotments) localStorage.setItem(STORAGE_KEYS.ALLOTMENTS, JSON.stringify(data.allotments));
      if (data.batches) localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(data.batches));

      this.addAuditLog('RESTORE_SNAPSHOT', `Database restored from backup timestamp ${data.exportedAt || 'Unknown'}`);
      return { success: true, message: 'District master database successfully restored!' };
    } catch (e: any) {
      return { success: false, message: `Failed to parse backup JSON: ${e.message}` };
    }
  }
}

export const db = new DatabaseService();
