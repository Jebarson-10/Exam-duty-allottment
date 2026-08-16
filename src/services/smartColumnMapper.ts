/**
 * Smart Column Mapper — Data-Content Fingerprinting Engine
 * 
 * Analyzes actual cell values (not just headers) to automatically detect
 * what each column in an uploaded spreadsheet contains. Works with any
 * header text, language, or format.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type StandardField =
  | 'id' | 'name' | 'designation' | 'subject' | 'schoolName'
  | 'address' | 'block' | 'seniority' | 'doj' | 'lat' | 'lng'
  | 'phone' | 'email' | 'exemption' | 'capacity' | 'clubbed'
  | 'gender' | 'type' | 'role' | 'dutyType' | 'year' | 'centreName'
  | 'skip';

export interface ColumnMapping {
  originalHeader: string;
  detectedField: StandardField | null;
  confidence: number;        // 0–100
  method: 'header' | 'data' | 'combined';
  sampleValues: string[];    // first 3 non-empty values for preview
}

export interface MappingProposal {
  sheetName: string;
  detectedEntityType: 'TEACHERS' | 'SCHOOLS' | 'CENTRES' | 'DUTY_HISTORY' | 'UNKNOWN';
  columns: ColumnMapping[];
  totalRows: number;
}

// ─── Header Alias Dictionary (kept for boosting, not sole source) ───

const HEADER_HINTS: Record<StandardField, string[]> = {
  id: ['id', 'teacher id', 'staff id', 'emis', 'emis id', 'emis number', 'udise', 'udise code', 'school id', 'school code', 'centre id', 'centre code', 'sl no', 's no', 'slno', 'sno', 'code', 'roll', 'serial', 'sr no'],
  name: ['name', 'teacher name', 'staff name', 'faculty name', 'name of the teacher', 'name of the staff', 'school name', 'name of the school', 'centre name', 'center name', 'institution name', 'institution', 'ஆசிரியர் பெயர்', 'பெயர்'],
  designation: ['designation', 'post', 'cadre', 'designation of teacher', 'position', 'பதவி'],
  role: ['role', 'allotted role', 'duty role', 'duty assigned', 'exam role', 'designation in exam', 'பணி'],
  dutyType: ['duty type', 'type of duty', 'exam type', 'category of duty'],
  year: ['year', 'exam year', 'academic year', 'session year', 'ஆண்டு'],
  subject: ['subject', 'handling subject', 'major', 'discipline', 'subject name', 'branch', 'பாடம்'],
  schoolName: ['school', 'parent school', 'school name', 'working school', 'present school', 'current school', 'institution', 'பள்ளி', 'பணிபுரியும் பள்ளி'],
  centreName: ['centre', 'exam centre', 'allotted centre', 'centre name', 'center name', 'assigned centre', 'place of duty', 'தேர்வு மையம்'],
  address: ['address', 'location', 'place', 'taluk', 'village', 'town', 'school address', 'centre address', 'முகவரி'],
  block: ['block', 'block name', 'educational block', 'zone', 'பிரிவு'],
  seniority: ['seniority', 'seniority rank', 'district seniority', 'seniority no', 'seniority number', 'rank', 'seniority order', 'முதுநிலை'],
  doj: ['date of joining', 'doj', 'joining date', 'date of appointment', 'appointment date', 'service from', 'சேர்ந்த நாள்'],
  lat: ['lat', 'latitude', 'gps lat', 'geo lat', 'y', 'அகலாங்கு'],
  lng: ['lng', 'lon', 'longitude', 'gps lng', 'geo lng', 'x', 'long', 'நெட்டாங்கு'],
  exemption: ['exemption', 'is exempted', 'exempted', 'ph', 'medical', 'exemption reason', 'medical exemption', 'physically challenged', 'விதிவிலக்கு'],
  phone: ['phone', 'mobile', 'mobile number', 'contact', 'cell', 'phone number', 'கைபேசி எண்', 'தொலைபேசி', 'தொடர்பு எண்'],
  email: ['email', 'email id', 'mail', 'e-mail', 'மின்னஞ்சல்'],
  capacity: ['capacity', 'student capacity', 'strength', 'total students', '12th strength', '10th strength', 'halls', 'total halls', 'மாணவர்கள்'],
  clubbed: ['clubbed', 'clubbed schools', 'clubbed school ids', 'attached schools', 'mapped schools'],
  gender: ['gender', 'sex', 'm/f', 'பாலினம்'],
  type: ['type', 'school type', 'category', 'management', 'வகை'],
  skip: [],
};

// ─── Known value dictionaries for data fingerprinting ────────────────

const KNOWN_DESIGNATIONS = new Set([
  'headmaster', 'headmistress', 'hm', 'principal', 'pg assistant', 'pg asst',
  'b.t. assistant', 'bt assistant', 'bt asst', 'b.t.', 'bt', 'p.g.',
  'physical education director', 'ped', 'pet', 'vocational instructor',
  'special teacher', 'post graduate assistant', 'graduate assistant',
]);

const KNOWN_SUBJECTS = new Set([
  'physics', 'chemistry', 'biology', 'botany', 'zoology', 'mathematics',
  'maths', 'math', 'computer science', 'cs', 'commerce', 'accountancy',
  'economics', 'history', 'tamil', 'english', 'general', 'hindi',
  'french', 'geography', 'civics', 'political science', 'physical education',
]);

const KNOWN_SCHOOL_TYPES = new Set([
  'government', 'govt', 'government aided', 'govt aided', 'aided',
  'matriculation', 'matric', 'self-finance', 'self finance', 'private',
  'cbse', 'icse', 'central',
]);

const KNOWN_GENDERS = new Set(['m', 'f', 'male', 'female', 'other', 'transgender']);

const KNOWN_DUTY_TYPES = new Set([
  'theory', 'practical', 'hall invigilation', 'invigilation', 'flying squad',
]);

const KNOWN_ROLES = new Set([
  'chief superintendent', 'department officer', 'internal examiner',
  'external examiner', 'hall invigilator', 'standby invigilator',
  'flying squad', 'route officer', 'observer',
]);

const ERODE_BLOCKS = new Set([
  'erode', 'erode urban', 'bhavani', 'gobichettipalayam', 'gobi',
  'perundurai', 'sathyamangalam', 'anthiyur', 'kodumudi', 'modakkurichi',
  'nambiyur', 'thalavadi', 'chennimalai', 'kavindapadi',
]);

const KNOWN_EXEMPTIONS = new Set([
  'yes', 'no', 'y', 'n', '0', '1', 'true', 'false', 'ph', 'pwd',
  'medical', 'physically challenged', 'disabled', 'exempted', 'not exempted',
]);

// ─── Fingerprint Analyzers ───────────────────────────────────────────

function sampleNonEmpty(values: any[], max: number = 20): string[] {
  const result: string[] = [];
  for (const v of values) {
    const s = String(v ?? '').trim();
    if (s && s !== 'undefined' && s !== 'null') {
      result.push(s);
      if (result.length >= max) break;
    }
  }
  return result;
}

function matchRate(values: string[], checker: (v: string) => boolean): number {
  if (values.length === 0) return 0;
  const matches = values.filter(checker).length;
  return (matches / values.length) * 100;
}

/**
 * Dictionary matcher: exact match always counts; substring match only for
 * keys of length >= 3 so short keys like 'cs', 'hm', 'bt', 'pg' can never
 * produce accidental substring hits (e.g. 'physics' contains 'cs').
 */
function dictMatch(lower: string, dict: Set<string>): boolean {
  if (dict.has(lower)) return true;
  for (const key of dict) {
    if (key.length >= 3 && lower.includes(key)) return true;
  }
  return false;
}

/** Erode block names are short standalone labels, never long school names. */
function isBlockName(v: string): boolean {
  const lower = v.toLowerCase().trim();
  if (lower.length > 40) return false;
  return ERODE_BLOCKS.has(lower) || / block$/.test(lower) || / பிரிவு$/.test(lower);
}

/** School names in TN rosters carry recognisable institutional keywords. */
function isSchoolNameLike(v: string): boolean {
  const lower = v.toLowerCase();
  return /(^|\s)(ghss|ghs|hss|high school|higher secondary|matric|மேல்நிலை|பள்ளி|school|அரசு)\b|school/.test(lower) && v.length > 5;
}

function isPhoneLike(v: string): boolean {
  const digits = v.replace(/[\s\-\+\(\)]/g, '');
  return /^(\+91|91)?[6-9]\d{9}$/.test(digits);
}

function isLatitudeLike(v: string): boolean {
  const n = parseFloat(v);
  return !isNaN(n) && n >= 8.0 && n <= 37.0 && v.includes('.');
}

function isLongitudeLike(v: string): boolean {
  const n = parseFloat(v);
  return !isNaN(n) && n >= 68.0 && n <= 97.5 && v.includes('.');
}

function isDateLike(v: string): boolean {
  if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(v)) return true;
  if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(v)) return true;
  if (/^\d{5}$/.test(v) && parseInt(v) > 30000 && parseInt(v) < 50000) return true;
  const d = new Date(v);
  return !isNaN(d.getTime()) && d.getFullYear() > 1950 && d.getFullYear() < 2100;
}

function isEmailLike(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isNameLike(v: string): boolean {
  if (v.length < 3 || v.length > 80) return false;
  if (/^\d+$/.test(v)) return false;
  if (/[\u0B80-\u0BFF]/.test(v) && v.length > 3) return true;
  const words = v.split(/[\s,]+/).filter(w => w.length > 0);
  if (words.length >= 1 && words.length <= 8) {
    const letterWords = words.filter(w => /^[A-Za-z\.\-']+$/.test(w));
    // Mostly letter-words; a stray token like "50%" disqualifies the value.
    return letterWords.length >= 1 && (letterWords.length / words.length) >= 0.75;
  }
  return false;
}

function isSmallInteger(v: string): boolean {
  const n = parseInt(v);
  return !isNaN(n) && n >= 0 && n <= 10000 && String(n) === v.trim();
}

function isCapacityLike(v: string): boolean {
  const n = parseInt(v);
  return !isNaN(n) && n >= 10 && n <= 5000 && String(n) === v.trim();
}

function isAddressLike(v: string): boolean {
  if (v.length < 10) return false;
  const lower = v.toLowerCase();
  const keywords = ['road', 'street', 'nagar', 'colony', 'puram', 'district', 'taluk', 'post', 'pin', 'near', 'opp'];
  return keywords.some(k => lower.includes(k)) || /\d{6}/.test(v);
}

function isYearLike(v: string): boolean {
  const n = parseInt(v);
  if (!isNaN(n) && n >= 2000 && n <= 2035) return true;
  return /\b20\d{2}\s*[-–]\s*(20)?\d{2}\b/.test(v);
}

function isSequentialIntegers(values: string[]): boolean {
  const nums = values.map(v => parseInt(v)).filter(n => !isNaN(n));
  if (nums.length < 3) return false;
  let sequential = 0;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === nums[i - 1] + 1) sequential++;
  }
  return (sequential / (nums.length - 1)) > 0.6;
}

// ─── Main Smart Column Mapper ────────────────────────────────────────

export class SmartColumnMapper {

  static analyzeColumn(
    header: string,
    sampleValues: string[]
  ): { field: StandardField | null; confidence: number; method: 'header' | 'data' | 'combined' } {

    const clean = header.toLowerCase().trim().replace(/[_\-\.\/]/g, ' ').replace(/\s+/g, ' ');
    const tokens = clean.split(' ');
    const values = sampleValues.filter(v => v.trim() !== '');

    // Phase 1: Header matching
    let headerField: StandardField | null = null;
    let headerConfidence = 0;

    for (const [field, aliases] of Object.entries(HEADER_HINTS) as [StandardField, string[]][]) {
      if (field === 'skip') continue;
      if (aliases.some(a => clean === a)) {
        headerField = field;
        headerConfidence = 60;
        break;
      }
      if (aliases.some(a => tokens.includes(a) || (a.length > 3 && clean.includes(a)))) {
        headerField = field;
        headerConfidence = 40;
        break;
      }
    }

    // Phase 2: Data fingerprinting
    if (values.length === 0) {
      return { field: headerField, confidence: headerConfidence, method: 'header' };
    }

    type Candidate = { field: StandardField; score: number };
    const candidates: Candidate[] = [];

    const phoneRate = matchRate(values, isPhoneLike);
    if (phoneRate > 50) candidates.push({ field: 'phone', score: phoneRate });

    const emailRate = matchRate(values, isEmailLike);
    if (emailRate > 50) candidates.push({ field: 'email', score: emailRate });

    const latRate = matchRate(values, isLatitudeLike);
    if (latRate > 60) candidates.push({ field: 'lat', score: latRate });

    const lngRate = matchRate(values, isLongitudeLike);
    if (lngRate > 60) candidates.push({ field: 'lng', score: lngRate });

    const dateRate = matchRate(values, isDateLike);
    if (dateRate > 50) candidates.push({ field: 'doj', score: dateRate });

    const desigRate = matchRate(values, v => dictMatch(v.toLowerCase().trim(), KNOWN_DESIGNATIONS));
    if (desigRate > 40) candidates.push({ field: 'designation', score: desigRate });

    const subjectRate = matchRate(values, v => dictMatch(v.toLowerCase().trim(), KNOWN_SUBJECTS));
    if (subjectRate > 40) candidates.push({ field: 'subject', score: subjectRate });

    const genderRate = matchRate(values, v => KNOWN_GENDERS.has(v.toLowerCase().trim()));
    if (genderRate > 60) candidates.push({ field: 'gender', score: genderRate });

    const typeRate = matchRate(values, v => dictMatch(v.toLowerCase().trim(), KNOWN_SCHOOL_TYPES));
    if (typeRate > 50) candidates.push({ field: 'type', score: typeRate });

    const dutyTypeRate = matchRate(values, v => KNOWN_DUTY_TYPES.has(v.toLowerCase().trim()));
    if (dutyTypeRate > 50) candidates.push({ field: 'dutyType', score: dutyTypeRate });

    const roleRate = matchRate(values, v => dictMatch(v.toLowerCase().trim(), KNOWN_ROLES));
    if (roleRate > 40) candidates.push({ field: 'role', score: roleRate });

    const blockRate = matchRate(values, isBlockName);
    if (blockRate > 40) candidates.push({ field: 'block', score: blockRate });

    const schoolNameRate = matchRate(values, isSchoolNameLike);
    if (schoolNameRate > 50) candidates.push({ field: 'schoolName', score: schoolNameRate * 0.7 });

    const exemptRate = matchRate(values, v => KNOWN_EXEMPTIONS.has(v.toLowerCase().trim()));
    if (exemptRate > 60) candidates.push({ field: 'exemption', score: exemptRate });

    const yearRate = matchRate(values, isYearLike);
    if (yearRate > 60) candidates.push({ field: 'year', score: yearRate });

    const addressRate = matchRate(values, isAddressLike);
    if (addressRate > 40) candidates.push({ field: 'address', score: addressRate });

    if (isSequentialIntegers(values)) {
      const allSmall = matchRate(values, isSmallInteger);
      if (allSmall > 80) {
        const first = parseInt(values[0]);
        if (first === 1 || first === 0) {
          candidates.push({ field: 'seniority', score: 75 });
        } else {
          candidates.push({ field: 'id', score: 60 });
        }
      }
    }

    if (candidates.every(c => c.field !== 'seniority')) {
      const capRate = matchRate(values, isCapacityLike);
      if (capRate > 70 && !isSequentialIntegers(values)) {
        candidates.push({ field: 'capacity', score: capRate * 0.7 });
      }
    }

    if (candidates.length === 0 || candidates.every(c => c.score < 50)) {
      // Weak-evidence name guess: require at least 2 samples so a single
      // free-text cell (e.g. an exemption reason) can't claim the 'name' slot.
      const nameRate = matchRate(values, isNameLike);
      if (values.length >= 2 && nameRate > 50) {
        candidates.push({ field: 'name', score: nameRate * 0.8 });
      }
    }

    // Phase 3: Combine header + data signals
    candidates.sort((a, b) => b.score - a.score);
    const topDataCandidate = candidates[0] || null;

    if (headerField && topDataCandidate && headerField === topDataCandidate.field) {
      return {
        field: headerField,
        confidence: Math.min(98, headerConfidence + topDataCandidate.score * 0.4),
        method: 'combined',
      };
    }

    if (topDataCandidate && topDataCandidate.score > 70) {
      if (!headerField || headerConfidence < 50) {
        return {
          field: topDataCandidate.field,
          confidence: Math.min(95, topDataCandidate.score),
          method: 'data',
        };
      }
    }

    if (headerField && (!topDataCandidate || topDataCandidate.score < 40)) {
      return { field: headerField, confidence: headerConfidence, method: 'header' };
    }

    if (topDataCandidate && topDataCandidate.score > 40) {
      if (headerConfidence < 40) {
        return { field: topDataCandidate.field, confidence: topDataCandidate.score * 0.85, method: 'data' };
      }
      return { field: headerField, confidence: headerConfidence * 0.7, method: 'header' };
    }

    return { field: headerField, confidence: headerConfidence, method: headerField ? 'header' : 'data' };
  }

  static autoMapColumns(
    headers: string[],
    sampleRows: Record<string, any>[],
  ): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];
    const usedFields = new Set<StandardField>();

    const analyses = headers.map(header => {
      const columnValues = sampleRows.map(row => String(row[header] ?? ''));
      const samples = sampleNonEmpty(columnValues, 20);
      const preview = sampleNonEmpty(columnValues, 3);
      const result = this.analyzeColumn(header, samples);
      return { header, ...result, preview };
    });

    const sorted = [...analyses].sort((a, b) => b.confidence - a.confidence);

    const fieldAssignments = new Map<string, StandardField | null>();
    for (const analysis of sorted) {
      if (!analysis.field || analysis.confidence <= 20) {
        // Unusable guess — leave unmapped for the user to assign manually.
        fieldAssignments.set(analysis.header, null);
      } else if (!usedFields.has(analysis.field)) {
        fieldAssignments.set(analysis.header, analysis.field);
        usedFields.add(analysis.field);
      } else if (analysis.field === 'name' && !usedFields.has('schoolName')) {
        // Two name-like columns: the weaker one is most plausibly the institution.
        fieldAssignments.set(analysis.header, 'schoolName');
        usedFields.add('schoolName');
      } else if (analysis.field === 'name' && !usedFields.has('centreName')) {
        fieldAssignments.set(analysis.header, 'centreName');
        usedFields.add('centreName');
      } else {
        fieldAssignments.set(analysis.header, null);
      }
    }

    for (const analysis of analyses) {
      mappings.push({
        originalHeader: analysis.header,
        detectedField: fieldAssignments.get(analysis.header) ?? null,
        confidence: analysis.confidence,
        method: analysis.method,
        sampleValues: analysis.preview,
      });
    }

    return mappings;
  }

  static detectEntityType(
    mappings: ColumnMapping[],
    sheetName: string
  ): 'TEACHERS' | 'SCHOOLS' | 'CENTRES' | 'DUTY_HISTORY' | 'UNKNOWN' {
    const fields = new Set(mappings.filter(m => m.detectedField).map(m => m.detectedField));
    const lowerSheet = sheetName.toLowerCase();

    if (fields.has('year') && (fields.has('role') || fields.has('centreName'))) return 'DUTY_HISTORY';
    if (lowerSheet.includes('history') || lowerSheet.includes('duty')) return 'DUTY_HISTORY';

    if (fields.has('designation') || fields.has('subject') || fields.has('seniority')) return 'TEACHERS';
    if (lowerSheet.includes('teacher') || lowerSheet.includes('staff') || lowerSheet.includes('faculty')) return 'TEACHERS';

    if (fields.has('capacity') || fields.has('clubbed')) return 'CENTRES';
    if (lowerSheet.includes('centre') || lowerSheet.includes('center')) return 'CENTRES';

    if (fields.has('type') || fields.has('block')) return 'SCHOOLS';
    if (lowerSheet.includes('school') || lowerSheet.includes('institution')) return 'SCHOOLS';

    return 'UNKNOWN';
  }

  static proposeMapping(
    sheetName: string,
    headers: string[],
    sampleRows: Record<string, any>[],
    totalRows: number
  ): MappingProposal {
    const columns = this.autoMapColumns(headers, sampleRows);
    const detectedEntityType = this.detectEntityType(columns, sheetName);
    return { sheetName, detectedEntityType, columns, totalRows };
  }
}
