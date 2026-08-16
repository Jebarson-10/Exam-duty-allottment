import * as XLSX from 'xlsx';
import { School, ExamCentre, Teacher, Block, TeacherDesignation, Subject, SchoolType, DutyHistory } from '../types';
import { geocodeInstitution, batchGeocodeItems } from './geocodingService';
import { SmartColumnMapper, ColumnMapping, MappingProposal } from './smartColumnMapper';
import {
  normalizeTamilText,
  tamilToDesignation,
  tamilToSubject,
  tamilToSchoolType,
  tamilToGender,
  tamilToBlockName,
  tamilToDutyType,
  tamilToRole,
  isTruthilyExemptedTamil,
  TAMIL_BLOCK_ALIASES,
} from './tamilData';

// Re-export for external consumers
export type { ColumnMapping, MappingProposal };

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

/**
 * Extracts a clean header + data-row table from a worksheet.
 * Government circular files frequently carry banner/title rows above the real
 * header row, so the header is chosen heuristically from the first few rows
 * (most text cells, fewest numeric cells), and duplicate header names are
 * de-duplicated so object keys stay unique.
 */
function extractSheetTable(ws: any): { headers: string[]; rows: Record<string, any>[] } {
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false }) as any[][];
  const nonEmpty = aoa.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
  if (nonEmpty.length < 2) return { headers: [], rows: [] };

  let headerIdx = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < Math.min(5, nonEmpty.length - 1); i++) {
    const filled = nonEmpty[i].map((c: any) => String(c ?? '').trim()).filter(Boolean);
    const numeric = filled.filter((c) => c !== '' && !isNaN(Number(c))).length;
    const score = filled.length * 2 + (filled.length - numeric) * 1.5 - numeric * 2 - i * 0.5;
    if (score > bestScore) {
      bestScore = score;
      headerIdx = i;
    }
  }

  const seen = new Map<string, number>();
  const headers = nonEmpty[headerIdx].map((c: any, i: number) => {
    let name = String(c ?? '').trim() || `Column ${i + 1}`;
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count > 0) name = `${name} (${count + 1})`;
    return name;
  });

  const rows = nonEmpty.slice(headerIdx + 1).map((r) => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? '';
    });
    return obj;
  });

  return { headers, rows };
}

/** Values that explicitly mean "not exempted" despite being non-empty. */
const NOT_EXEMPTED_VALUES = new Set(['no', 'n', 'false', '0', 'nil', 'none', '-', '--', 'not exempted']);

function isTruthilyExempted(raw: any): boolean {
  if (raw === undefined || raw === null) return false;
  const s = String(raw).trim().toLowerCase();
  if (s === '') return false;
  const tamil = isTruthilyExemptedTamil(s);
  if (tamil !== null) return tamil;
  return !NOT_EXEMPTED_VALUES.has(s);
}

/** Normalises DOJ values: ISO strings pass through, Excel serials become ISO dates. */
function normalizeDateValue(raw: any): string | undefined {
  if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
  if (typeof raw === 'number' || /^\d{5}$/.test(String(raw).trim())) {
    const serial = Number(raw);
    if (serial > 20000 && serial < 60000) {
      const ms = (serial - 25569) * 86400 * 1000; // Excel epoch 1899-12-30 → Unix
      return new Date(ms).toISOString().split('T')[0];
    }
  }
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/); // DD/MM/YYYY (Indian convention)
  if (m) {
    const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return s;
}

/**
 * Normalizes designation to standard union types (English or Tamil input)
 */
function normalizeDesignation(raw: string): TeacherDesignation {
  const cleaned = normalizeTamilText(raw);
  const tamil = tamilToDesignation(cleaned);
  if (tamil) return tamil;
  const lower = cleaned.toLowerCase();
  if (lower.includes('headmaster') || lower.includes('hm') || lower.includes('head master') || lower.includes('headmistress')) return 'Headmaster';
  if (lower.includes('principal')) return 'Principal';
  if (lower.includes('pg') || lower.includes('post graduate') || lower.includes('pg asst') || lower.includes('p.g')) return 'PG Assistant';
  if (lower.includes('bt') || lower.includes('b.t') || lower.includes('graduate asst') || lower.includes('b.ed')) return 'B.T. Assistant';
  if (lower.includes('vocational')) return 'Vocational Instructor';
  if (lower.includes('ped') || lower.includes('physical education') || lower.includes('pet')) return 'Physical Education Director';
  return 'PG Assistant';
}

/**
 * Normalizes subject string (English or Tamil input)
 */
function normalizeSubject(raw: string): Subject {
  const cleaned = normalizeTamilText(raw);
  const tamil = tamilToSubject(cleaned);
  if (tamil) return tamil;
  const lower = cleaned.toLowerCase();
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
   * Phase 1: Read the file and propose smart column mappings using data fingerprinting.
   * Returns MappingProposal[] for user review before actual parsing.
   */
  public static proposeFromSpreadsheet(
    fileBuffer: ArrayBuffer | string
  ): { proposals: MappingProposal[]; workbook: any; warnings: string[] } {
    let wb;
    try {
      wb = typeof fileBuffer === 'string'
        ? XLSX.read(fileBuffer, { type: 'binary' })
        : XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { proposals: [], workbook: null, warnings: ['Failed to parse file: ' + msg] };
    }

    const proposals: MappingProposal[] = [];
    const warnings: string[] = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const { headers, rows: rawRows } = extractSheetTable(ws);
      if (headers.length === 0 || rawRows.length === 0) continue;
      if (rawRows.length > 50000) {
        warnings.push(`Sheet "${sheetName}" has ${rawRows.length} rows — exceeds 50,000 row limit. Please split the file.`);
        continue;
      }

      const sampleRows = rawRows.slice(0, 20);
      const proposal = SmartColumnMapper.proposeMapping(sheetName, headers, sampleRows, rawRows.length);
      proposals.push(proposal);
    }

    return { proposals, workbook: wb, warnings };
  }

  /**
   * Phase 2: Parse the spreadsheet using confirmed column mappings from user review.
   */
  public static async parseWithConfirmedMappings(
    workbook: any,
    confirmedMappings: Map<string, ColumnMapping[]>,
    confirmedEntityTypes: Map<string, string>,
    existingBlocks: Block[] = []
  ): Promise<ParsedDataset> {
    const allSchools: School[] = [];
    const allCentres: ExamCentre[] = [];
    const allTeachers: Teacher[] = [];
    const allHistory: DutyHistory[] = [];
    const warnings: string[] = [];
    let rawRowCount = 0;

    // Lookup accepts both English and Tamil block/taluk names
    const blockLookup = new Map<string, string>();
    for (const b of existingBlocks) {
      blockLookup.set(b.name.toLowerCase(), b.id);
      if (b.code) blockLookup.set(b.code.toLowerCase(), b.id);
    }
    for (const [tamil, english] of Object.entries(TAMIL_BLOCK_ALIASES)) {
      const id = blockLookup.get(english) || blockLookup.get(`${english} block`);
      if (id) blockLookup.set(tamil, id);
    }
    const resolveBlockId = (raw: any): string => {
      const s = normalizeTamilText(String(raw || '')).toLowerCase();
      return (
        blockLookup.get(s) ||
        blockLookup.get(tamilToBlockName(s) || '') ||
        existingBlocks[0]?.id ||
        'BLK-ERD'
      );
    };

    for (const sheetName of workbook.SheetNames) {
      const mappings = confirmedMappings.get(sheetName);
      if (!mappings) continue;

      const ws = workbook.Sheets[sheetName];
      const { rows: rawRows } = extractSheetTable(ws);
      if (rawRows.length === 0 || rawRows.length > 50000) continue;

      rawRowCount += rawRows.length;

      // Build headerMap from confirmed mappings: fieldName → originalHeader
      const headerMap: Record<string, string> = {};
      for (const m of mappings) {
        if (m.detectedField && m.detectedField !== 'skip') {
          headerMap[m.detectedField] = m.originalHeader;
        }
      }

      const entityType = confirmedEntityTypes.get(sheetName) || 'UNKNOWN';

      // The same logical "name" column can be auto-mapped to name/schoolName/
      // centreName depending on header wording — resolve per entity type so a
      // "School Name" or "Centre Name" header is never silently dropped.
      if (entityType === 'CENTRES') {
        headerMap.name = headerMap.name || headerMap.centreName || headerMap.schoolName;
      } else if (entityType === 'SCHOOLS' || entityType === 'UNKNOWN') {
        headerMap.name = headerMap.name || headerMap.schoolName || headerMap.centreName;
      }

      if (!headerMap.name && !headerMap.id) {
        warnings.push(`Sheet "${sheetName}" has no recognisable name or ID column. Map at least one column to "name" and retry. Skipped.`);
        continue;
      }

      if (entityType === 'DUTY_HISTORY') {
        const centreHeader = headerMap.centreName || headerMap.schoolName || headerMap.name;
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const rawYearStr = String(row[headerMap.year] || '2025');
          // "2023-2024" academic years: the exam is held in the LATER year.
          const ayMatch = rawYearStr.match(/^(20\d\d)\s*[-–]\s*(?:20)?(\d{2})$/);
          const yearMatch = rawYearStr.match(/\b(20\d\d)\b/);
          const yearNum = ayMatch
            ? parseInt(ayMatch[1].slice(0, 2) + ayMatch[2])
            : yearMatch
            ? parseInt(yearMatch[1])
            : 2025;
          const academicYear = rawYearStr.includes('-') ? rawYearStr : `${yearNum - 1}-${yearNum}`;
          const rawTName = row[headerMap.name] || row[headerMap.id] || `Teacher ${i + 1}`;
          const rawTId = row[headerMap.id] || `TCH-${rawTName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`;
          const rawCName = row[centreHeader] || `Exam Centre ${i + 1}`;
          const rawCId = `CTR-${rawCName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`;
          const rawRole = (row[headerMap.role]
            ? tamilToRole(String(row[headerMap.role])) || String(row[headerMap.role])
            : 'Hall Invigilator') as any;
          const rawDutyType = (row[headerMap.dutyType]
            ? tamilToDutyType(String(row[headerMap.dutyType])) || String(row[headerMap.dutyType])
            : 'Theory') as any;

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
      } else if (entityType === 'TEACHERS') {
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const rawName = row[headerMap.name] || `Teacher ${i + 1}`;
          const rawId = row[headerMap.id] || `TCH-IMP-${Date.now()}-${i + 1}`;
          const rawSchool = row[headerMap.schoolName] || row[headerMap.address] || 'Erode High School';
          const rawDesig = row[headerMap.designation] || 'PG Assistant';
          const rawSub = row[headerMap.subject] || 'Physics';
          const parsedSeniority = parseInt(row[headerMap.seniority]);
          const rawSeniority = isNaN(parsedSeniority) ? (i + 1) : parsedSeniority;
          const rawDoj = normalizeDateValue(row[headerMap.doj]) || '2016-06-01';
          const rawPhone = String(row[headerMap.phone] || '9443100000');
          const rawExempt = isTruthilyExempted(row[headerMap.exemption]);
          const rawGender = tamilToGender(row[headerMap.gender]) ||
            (String(row[headerMap.gender] || '').trim().toLowerCase().startsWith('f') ? 'F' : 'M');
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
            gender: rawGender,
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
      } else if (entityType === 'CENTRES') {
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const rawName = row[headerMap.name] || `Exam Centre ${i + 1}`;
          const rawId = row[headerMap.id] || `CTR-IMP-${Date.now()}-${i + 1}`;
          const rawAddress = row[headerMap.address] || rawName;
          const parsedCap = parseInt(row[headerMap.capacity]);
          const rawCap = isNaN(parsedCap) ? 350 : parsedCap;
          const rawLat = parseFloat(row[headerMap.lat]);
          const rawLng = parseFloat(row[headerMap.lng]);
          const blockId = resolveBlockId(row[headerMap.block]);

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
        // Schools or unknown — treat as school data
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const rawName = row[headerMap.name] || `School ${i + 1}`;
          const rawId = row[headerMap.id] || `SCH-IMP-${Date.now()}-${i + 1}`;
          const rawAddress = row[headerMap.address] || rawName;
          const rawLat = parseFloat(row[headerMap.lat]);
          const rawLng = parseFloat(row[headerMap.lng]);
          const rawType = (tamilToSchoolType(String(row[headerMap.type] || '')) ||
            (row[headerMap.type] || 'Government')) as SchoolType;
          const parsedCap = parseInt(row[headerMap.capacity]);
          const rawCap = isNaN(parsedCap) ? 200 : parsedCap;
          const blockId = resolveBlockId(row[headerMap.block]);

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
   * Backward-compatible: auto-proposes mappings, auto-confirms them, and parses in one call.
   * Used by tests and legacy code paths.
   */
  public static async parseSpreadsheet(
    fileBuffer: ArrayBuffer | string,
    existingBlocks: Block[] = []
  ): Promise<ParsedDataset> {
    const { proposals, workbook, warnings: proposeWarnings } = this.proposeFromSpreadsheet(fileBuffer);

    if (!workbook || proposals.length === 0) {
      return {
        teachers: [], schools: [], centres: [], history: [],
        rawRowCount: 0, detectedType: 'MIXED_MASTER',
        warnings: proposeWarnings, geocodedCount: 0,
      };
    }

    // Auto-confirm all proposals as-is
    const confirmedMappings = new Map<string, ColumnMapping[]>();
    const confirmedEntityTypes = new Map<string, string>();
    for (const p of proposals) {
      confirmedMappings.set(p.sheetName, p.columns);
      confirmedEntityTypes.set(p.sheetName, p.detectedEntityType);
    }

    const result = await this.parseWithConfirmedMappings(workbook, confirmedMappings, confirmedEntityTypes, existingBlocks);
    result.warnings = [...proposeWarnings, ...result.warnings];
    return result;
  }

  /**
   * Parses uploaded official CEO office notification PDF into structured records
   */
  public static async parsePDF(
    fileBuffer: ArrayBuffer,
    existingBlocks: Block[] = []
  ): Promise<ParsedDataset> {
    const pdfjs = await getPdfJs();
    let pdfDoc;
    try {
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(fileBuffer) });
      pdfDoc = await loadingTask.promise;
    } catch (error: any) {
      return { schools: [], centres: [], teachers: [], history: [], rawRowCount: 0, detectedType: 'TEACHERS', warnings: ['Failed to load PDF: ' + error.message], geocodedCount: 0 };
    }
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
        const lineMatch = line.match(/(?:(\d+)\s+)?([A-Z][a-zA-Z\.\s]{3,30})\s+(PG Assistant|B\.T\.\s*Assistant|Headmaster|Principal|HM)\s+([A-Za-z][A-Za-z\s]*[A-Za-z])\s+(.+)/i);

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
