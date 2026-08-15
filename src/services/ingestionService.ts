import * as XLSX from 'xlsx';
import { School, ExamCentre, Teacher, Block, TeacherDesignation, Subject, SchoolType, DutyHistory } from '../types';
import { geocodeInstitution, batchGeocodeItems } from './geocodingService';

// Safely obtain pdfjs-dist in both browser and Node.js environments
let pdfjsLib: any = null;
async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  try {
    if (typeof window === 'undefined') {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    } else {
      pdfjsLib = await import('pdfjs-dist');
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }
    }
  } catch {
    pdfjsLib = await import('pdfjs-dist');
  }
  return pdfjsLib;
}

export interface ParsedDataset {
  schools: School[];
  centres: ExamCentre[];
  teachers: Teacher[];
  history: DutyHistory[];
  rawRowCount: number;
  detectedType: 'TEACHERS' | 'SCHOOLS' | 'CENTRES' | 'DUTY_HISTORY' | 'MIXED_MASTER';
  warnings: string[];
  geocodedCount: number;
}

// Field Normalization Dictionaries
const FIELD_ALIASES = {
  id: ['id', 'teacher id', 'staff id', 'emis', 'emis id', 'emis number', 'udise', 'udise code', 'school id', 'school code', 'centre id', 'centre code', 'center id', 'center code', 'sl no', 's no', 'slno', 'sno', 'code'],
  name: ['name', 'teacher name', 'staff name', 'faculty name', 'name of the teacher', 'name of the staff', 'school name', 'name of the school', 'centre name', 'center name', 'institution name', 'institution'],
  designation: ['designation', 'post', 'cadre', 'designation of teacher', 'position'],
  role: ['role', 'allotted role', 'duty role', 'duty assigned', 'exam role', 'designation in exam'],
  dutyType: ['duty type', 'type of duty', 'exam type', 'category of duty'],
  year: ['year', 'exam year', 'academic year', 'session year'],
  subject: ['subject', 'handling subject', 'major', 'discipline', 'subject name', 'branch'],
  schoolName: ['school', 'parent school', 'school name', 'working school', 'present school', 'school address', 'current school', 'institution'],
  centreName: ['centre', 'exam centre', 'allotted centre', 'centre name', 'center name', 'assigned centre', 'place of duty'],
  address: ['address', 'location', 'place', 'taluk', 'village', 'town', 'school address', 'centre address'],
  block: ['block', 'block name', 'educational block', 'taluk', 'zone'],
  seniority: ['seniority', 'seniority rank', 'district seniority', 'seniority no', 'seniority number', 'rank', 'seniority order'],
  doj: ['date of joining', 'doj', 'joining date', 'date of appointment', 'appointment date', 'service from'],
  lat: ['lat', 'latitude', 'gps lat', 'geo lat', 'y'],
  lng: ['lng', 'lon', 'longitude', 'gps lng', 'geo lng', 'x', 'long'],
  exemption: ['exemption', 'is exempted', 'exempted', 'ph', 'medical', 'exemption reason', 'medical exemption', 'physically challenged'],
  phone: ['phone', 'mobile', 'mobile number', 'contact', 'cell', 'phone number'],
  email: ['email', 'email id', 'mail'],
  capacity: ['capacity', 'student capacity', 'strength', 'total students', '12th strength', '10th strength', 'halls', 'total halls'],
  clubbed: ['clubbed', 'clubbed schools', 'clubbed school ids', 'attached schools', 'mapped schools'],
  gender: ['gender', 'sex', 'm/f'],
  type: ['type', 'school type', 'category', 'management'],
};

/**
 * Finds the matching standardized key for a raw header string
 */
function matchHeaderKey(rawHeader: string): string | null {
  const clean = rawHeader.toLowerCase().trim().replace(/[_\-\.\/]/g, ' ').replace(/\s+/g, ' ');
  
  // 1. Exact match first
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((alias) => clean === alias)) {
      return key;
    }
  }

  // 2. Token / word boundary match
  const tokens = clean.split(' ');
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((alias) => tokens.includes(alias) || (alias.length > 3 && clean.includes(alias)))) {
      return key;
    }
  }

  return null;
}

/**
 * Normalizes designation to standard union types
 */
function normalizeDesignation(raw: string): TeacherDesignation {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('headmaster') || lower.includes('hm') || lower.includes('head master') || lower.includes('headmistress')) return 'Headmaster';
  if (lower.includes('principal')) return 'Principal';
  if (lower.includes('pg') || lower.includes('post graduate') || lower.includes('pg asst') || lower.includes('p.g')) return 'PG Assistant';
  if (lower.includes('bt') || lower.includes('b.t') || lower.includes('graduate asst') || lower.includes('b.ed')) return 'B.T. Assistant';
  if (lower.includes('vocational')) return 'Vocational Instructor';
  if (lower.includes('ped') || lower.includes('physical education') || lower.includes('pet')) return 'Physical Education Director';
  return 'PG Assistant';
}

/**
 * Normalizes subject string
 */
function normalizeSubject(raw: string): Subject {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('phy')) return 'Physics';
  if (lower.includes('chem')) return 'Chemistry';
  if (lower.includes('bio')) return 'Biology';
  if (lower.includes('bot')) return 'Botany';
  if (lower.includes('zoo')) return 'Zoology';
  if (lower.includes('math')) return 'Mathematics';
  if (lower.includes('cs') || lower.includes('comp') || lower.includes('computer')) return 'Computer Science';
  if (lower.includes('tam')) return 'Tamil';
  if (lower.includes('eng')) return 'English';
  if (lower.includes('comm')) return 'Commerce';
  if (lower.includes('acc')) return 'Accountancy';
  if (lower.includes('eco')) return 'Economics';
  if (lower.includes('hist')) return 'History';
  return 'General';
}

export class IngestionService {
  /**
   * Main entry point to parse an uploaded Excel or CSV file
   */
  public static async parseSpreadsheet(
    fileBuffer: ArrayBuffer | string,
    existingBlocks: Block[] = []
  ): Promise<ParsedDataset> {
    const wb = typeof fileBuffer === 'string'
      ? XLSX.read(fileBuffer, { type: 'binary' })
      : XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });

    const allSchools: School[] = [];
    const allCentres: ExamCentre[] = [];
    const allTeachers: Teacher[] = [];
    const allHistory: DutyHistory[] = [];
    const warnings: string[] = [];
    let rawRowCount = 0;

    const blockLookup = new Map(existingBlocks.map((b) => [b.name.toLowerCase(), b.id]));

    // Iterate over all sheets in the workbook
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rawRows.length === 0) continue;

      rawRowCount += rawRows.length;
      const firstRow = rawRows[0];
      const rawHeaders = Object.keys(firstRow);

      // Build header map: normalizedKey -> originalHeader
      const headerMap: Record<string, string> = {};
      for (const h of rawHeaders) {
        const matched = matchHeaderKey(h);
        if (matched) headerMap[matched] = h;
      }

      // Determine entity type of this sheet
      const isHistorySheet = !!((headerMap.year || headerMap.role) && (headerMap.centreName || headerMap.name || sheetName.toLowerCase().includes('history') || sheetName.toLowerCase().includes('duty')));
      const isTeacherSheet = !isHistorySheet && !!(headerMap.designation || headerMap.subject || headerMap.seniority);
      const isCentreSheet = !isHistorySheet && !isTeacherSheet && !!(headerMap.capacity || headerMap.clubbed || sheetName.toLowerCase().includes('centre'));
      const isSchoolSheet = !isHistorySheet && !isTeacherSheet && !isCentreSheet;

      if (isHistorySheet) {
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const rawYearStr = String(row[headerMap.year] || '2025');
          const yearMatch = rawYearStr.match(/\b(20\d\d)\b/);
          const yearNum = yearMatch ? parseInt(yearMatch[1]) : 2025;
          const academicYear = rawYearStr.includes('-') ? rawYearStr : `${yearNum - 1}-${yearNum}`;
          const rawTName = row[headerMap.name] || row[headerMap.id] || `Teacher ${i + 1}`;
          const rawTId = row[headerMap.id] || `TCH-${rawTName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`;
          const rawCName = row[headerMap.centreName] || row[headerMap.schoolName] || `Exam Centre ${i + 1}`;
          const rawCId = `CTR-${rawCName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`;
          const rawRole = (row[headerMap.role] || 'Hall Invigilator') as any;
          const rawDutyType = (row[headerMap.dutyType] || 'Theory') as any;

          allHistory.push({
            id: `HIST-IMP-${Date.now()}-${i + 1}`,
            teacherId: String(rawTId),
            teacherName: String(rawTName),
            year: yearNum,
            academicYear,
            dutyType: rawDutyType,
            centreId: String(rawCId),
            centreName: String(rawCName),
            role: rawRole,
            allotmentDate: `${yearNum}-03-10`,
            notes: 'Imported historical allotment archive',
          });
        }
      } else if (isTeacherSheet) {
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const rawName = row[headerMap.name] || `Teacher ${i + 1}`;
          const rawId = row[headerMap.id] || `TCH-IMP-${Date.now()}-${i + 1}`;
          const rawSchool = row[headerMap.schoolName] || row[headerMap.address] || 'Erode High School';
          const rawDesig = row[headerMap.designation] || 'PG Assistant';
          const rawSub = row[headerMap.subject] || 'Physics';
          const rawSeniority = parseInt(row[headerMap.seniority]) || (i + 1);
          const rawDoj = row[headerMap.doj] ? String(row[headerMap.doj]) : '2016-06-01';
          const rawPhone = String(row[headerMap.phone] || '9443100000');
          const rawExempt = !!(row[headerMap.exemption] && String(row[headerMap.exemption]).toLowerCase() !== '0' && String(row[headerMap.exemption]).toLowerCase() !== 'false');
          const rawLat = parseFloat(row[headerMap.lat]);
          const rawLng = parseFloat(row[headerMap.lng]);

          // Link or create school
          let schoolId = `SCH-${rawSchool.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`;
          if (!allSchools.some((s) => s.id === schoolId || s.name.toLowerCase() === rawSchool.toLowerCase())) {
            allSchools.push({
              id: schoolId,
              name: rawSchool,
              address: 'Erode District',
              lat: 11.3418,
              lng: 77.7212,
              blockId: existingBlocks[0]?.id || 'BLK-ERD',
              type: 'Government',
              studentStrength12th: 200,
              studentStrength10th: 200,
            });
          } else {
            const found = allSchools.find((s) => s.name.toLowerCase() === rawSchool.toLowerCase());
            if (found) schoolId = found.id;
          }

          allTeachers.push({
            id: String(rawId),
            name: String(rawName),
            gender: 'M',
            schoolId,
            designation: normalizeDesignation(String(rawDesig)),
            subject: normalizeSubject(String(rawSub)),
            seniorityRank: rawSeniority,
            dateOfJoining: rawDoj,
            homeLat: !isNaN(rawLat) ? rawLat : undefined,
            homeLng: !isNaN(rawLng) ? rawLng : undefined,
            isExempted: rawExempt,
            exemptionReason: rawExempt ? String(row[headerMap.exemption]) : undefined,
            phone: rawPhone,
          });
        }
      } else if (isCentreSheet) {
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const rawName = row[headerMap.name] || `Exam Centre ${i + 1}`;
          const rawId = row[headerMap.id] || `CTR-IMP-${Date.now()}-${i + 1}`;
          const rawAddress = row[headerMap.address] || rawName;
          const rawCap = parseInt(row[headerMap.capacity]) || 350;
          const rawLat = parseFloat(row[headerMap.lat]);
          const rawLng = parseFloat(row[headerMap.lng]);
          const rawBlock = (row[headerMap.block] || '').toLowerCase();
          const blockId = blockLookup.get(rawBlock) || existingBlocks[0]?.id || 'BLK-ERD';

          const clubbedList = String(row[headerMap.clubbed] || '')
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter(Boolean);

          allCentres.push({
            id: String(rawId),
            name: String(rawName),
            address: String(rawAddress),
            lat: !isNaN(rawLat) ? rawLat : 11.3418,
            lng: !isNaN(rawLng) ? rawLng : 77.7212,
            blockId,
            capacity: rawCap,
            totalHalls: Math.ceil(rawCap / 20),
            clubbedSchoolIds: clubbedList,
          });
        }
      } else {
        // School Sheet
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const rawName = row[headerMap.name] || `School ${i + 1}`;
          const rawId = row[headerMap.id] || `SCH-IMP-${Date.now()}-${i + 1}`;
          const rawAddress = row[headerMap.address] || rawName;
          const rawLat = parseFloat(row[headerMap.lat]);
          const rawLng = parseFloat(row[headerMap.lng]);
          const rawType = (row[headerMap.type] || 'Government') as SchoolType;
          const rawCap = parseInt(row[headerMap.capacity]) || 200;
          const rawBlock = (row[headerMap.block] || '').toLowerCase();
          const blockId = blockLookup.get(rawBlock) || existingBlocks[0]?.id || 'BLK-ERD';

          allSchools.push({
            id: String(rawId),
            name: String(rawName),
            address: String(rawAddress),
            lat: !isNaN(rawLat) ? rawLat : 11.3418,
            lng: !isNaN(rawLng) ? rawLng : 77.7212,
            blockId,
            type: rawType,
            studentStrength12th: rawCap,
            studentStrength10th: rawCap,
          });
        }
      }
    }

    // Auto-Geocode schools and centres that need coordinates
    let geocodedCount = 0;
    const geocodedSchools = await batchGeocodeItems(allSchools);
    const geocodedCentres = await batchGeocodeItems(allCentres);
    geocodedCount = geocodedSchools.length + geocodedCentres.length;

    let detectedType: 'TEACHERS' | 'SCHOOLS' | 'CENTRES' | 'DUTY_HISTORY' | 'MIXED_MASTER' = 'MIXED_MASTER';
    if (allHistory.length > 0 && allTeachers.length === 0) detectedType = 'DUTY_HISTORY';
    else if (allTeachers.length > 0 && allCentres.length === 0 && allSchools.length === 0) detectedType = 'TEACHERS';
    else if (allCentres.length > 0 && allTeachers.length === 0) detectedType = 'CENTRES';
    else if (allSchools.length > 0 && allTeachers.length === 0) detectedType = 'SCHOOLS';

    return {
      schools: geocodedSchools,
      centres: geocodedCentres,
      teachers: allTeachers,
      history: allHistory,
      rawRowCount,
      detectedType,
      warnings,
      geocodedCount,
    };
  }

  /**
   * Parses uploaded official CEO office notification PDF into structured records
   */
  public static async parsePDF(
    fileBuffer: ArrayBuffer,
    existingBlocks: Block[] = []
  ): Promise<ParsedDataset> {
    const pdfjs = await getPdfJs();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(fileBuffer) });
    const pdfDoc = await loadingTask.promise;
    const allTeachers: Teacher[] = [];
    const allSchools: School[] = [];
    const warnings: string[] = [];

    let totalText = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageLines: string[] = [];
      let currentLine = '';
      let lastY = -1;

      for (const item of textContent.items as any[]) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          if (currentLine.trim()) pageLines.push(currentLine.trim());
          currentLine = '';
        }
        currentLine += ' ' + item.str;
        lastY = item.transform[5];
      }
      if (currentLine.trim()) pageLines.push(currentLine.trim());

      totalText += pageLines.join('\n') + '\n';

      // Parse structured line items from page text
      for (const line of pageLines) {
        // Regex pattern matching: [SNo/EMIS] [Name with Thiru/Tmt/Dr] [Designation] [Subject] [School]
        const lineMatch = line.match(/(?:(\d+)\s+)?([A-Z][a-zA-Z\.\s]{3,30})\s+(PG Assistant|B\.T\.\s*Assistant|Headmaster|Principal|HM)\s+([A-Za-z]+)\s+(.+)/i);

        if (lineMatch) {
          const rawId = lineMatch[1] ? `TCH-PDF-${lineMatch[1]}` : `TCH-PDF-${Date.now()}-${allTeachers.length + 1}`;
          const rawName = lineMatch[2].trim();
          const rawDesig = normalizeDesignation(lineMatch[3]);
          const rawSub = normalizeSubject(lineMatch[4]);
          const rawSchool = lineMatch[5].trim();

          let schoolId = `SCH-${rawSchool.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`;
          if (!allSchools.some((s) => s.id === schoolId || s.name.toLowerCase() === rawSchool.toLowerCase())) {
            allSchools.push({
              id: schoolId,
              name: rawSchool,
              address: 'Erode District',
              lat: 11.3418,
              lng: 77.7212,
              blockId: existingBlocks[0]?.id || 'BLK-ERD',
              type: 'Government',
              studentStrength12th: 150,
            });
          }

          allTeachers.push({
            id: rawId,
            name: rawName,
            gender: 'M',
            schoolId,
            designation: rawDesig,
            subject: rawSub,
            seniorityRank: allTeachers.length + 1,
            dateOfJoining: '2016-06-01',
            isExempted: false,
            phone: '9443100000',
          });
        }
      }
    }

    // Auto-Geocode any discovered schools
    const geocodedSchools = await batchGeocodeItems(allSchools);

    return {
      schools: geocodedSchools,
      centres: [],
      teachers: allTeachers,
      history: [],
      rawRowCount: allTeachers.length,
      detectedType: 'TEACHERS',
      warnings: allTeachers.length === 0 ? ['No tabular teacher patterns detected in PDF. Please ensure standard PDF document.'] : [],
      geocodedCount: geocodedSchools.length,
    };
  }
}
