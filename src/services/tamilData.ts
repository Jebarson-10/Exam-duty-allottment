// Tamil Language Knowledge Base for the Erode Exam Duty Portal
// Single source of truth for Tamil ↔ English domain vocabulary so that
// Tamil-language rosters (headers and cell values) are understood natively:
// columns are fingerprinted, values normalized to canonical English types,
// blocks resolved, and institutions geocoded by their Tamil names.

import { TeacherDesignation, Subject, SchoolType, DutyType, DutyRole } from '../types';

/** Strips zero-width joiners and excess punctuation that Tamil PDFs/Excel exports carry. */
export function normalizeTamilText(raw: string): string {
  return (raw || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const hasTamil = (s: string): boolean => /[\u0B80-\u0BFF]/.test(s);

// ─── Designations ────────────────────────────────────────────────────
// Ordered: longest keyword first so "தலைமை ஆசிரியர்" wins over "ஆசிரியர்".
const TAMIL_DESIGNATION_MAP: Array<[string, TeacherDesignation]> = [
  ['தலைமை ஆசிரியர்', 'Headmaster'],
  ['தலைமையாசிரியர்', 'Headmaster'],
  ['தலைமைஆசிரியர்', 'Headmaster'],
  ['முதுகலை உதவியாளர்', 'PG Assistant'],
  ['முதுநிலை உதவியாளர்', 'PG Assistant'],
  ['முதுகலை ஆசிரியர்', 'PG Assistant'],
  ['பட்டதாரி ஆசிரியர்', 'B.T. Assistant'],
  ['இளநிலை ஆசிரியர்', 'B.T. Assistant'],
  ['இளநிலை உதவியாளர்', 'B.T. Assistant'],
  ['உடற்கல்வி இயக்குநர்', 'Physical Education Director'],
  ['உடற்கல்வி ஆசிரியர்', 'Physical Education Director'],
  ['தொழிற்கல்வி ஆசிரியர்', 'Vocational Instructor'],
  ['தொழில்நுட்ப ஆசிரியர்', 'Vocational Instructor'],
  ['சிறப்பு ஆசிரியர்', 'Special Teacher'],
];

// ─── Subjects ────────────────────────────────────────────────────────
const TAMIL_SUBJECT_MAP: Array<[string, Subject]> = [
  ['இயற்பியல்', 'Physics'],
  ['வேதியியல்', 'Chemistry'],
  ['உயிரியல்', 'Biology'],
  ['தாவரவியல்', 'Botany'],
  ['விலங்கியல்', 'Zoology'],
  ['கணிதம்', 'Mathematics'],
  ['கணினி அறிவியல்', 'Computer Science'],
  ['கணினி', 'Computer Science'],
  ['தமிழ்', 'Tamil'],
  ['ஆங்கிலம்', 'English'],
  ['வணிகவியல்', 'Commerce'],
  ['கணக்கியல்', 'Accountancy'],
  ['பொருளியல்', 'Economics'],
  ['வரலாறு', 'History'],
];

// ─── School types (management) ───────────────────────────────────────
const TAMIL_SCHOOL_TYPE_MAP: Array<[string, SchoolType]> = [
  ['அரசு நிதியுதவி', 'Government Aided'],
  ['நிதியுதவி பெறும்', 'Government Aided'],
  ['அரசு', 'Government'],
  ['கணக்கீட்டுப் பள்ளி', 'Matriculation'],
  ['மெட்ரிகுலேஷன்', 'Matriculation'],
  ['சுயநிதி', 'Self-Finance'],
];

// ─── Educational blocks (Tamil ↔ canonical English) ──────────────────
export const TAMIL_BLOCK_ALIASES: Record<string, string> = {
  'ஈரோடு': 'erode',
  'ஈரோடு நகரம்': 'erode urban',
  'பவானி': 'bhavani',
  'கோபிசெட்டிபாளையம்': 'gobichettipalayam',
  'கோபி': 'gobichettipalayam',
  'பெருந்துறை': 'perundurai',
  'சத்தியமங்கலம்': 'sathyamangalam',
  'சத்தி': 'sathyamangalam',
  'அந்தியூர்': 'anthiyur',
  'கொடுமுடி': 'kodumudi',
  'மொடக்குறிச்சி': 'modakkurichi',
  'நம்பியூர்': 'nambiyur',
  'தாளவாடி': 'thalavadi',
  'சென்னிமலை': 'chennimalai',
  'காவிந்தபாடி': 'kavindapadi',
};

// ─── Genders / boolean words / exemptions ────────────────────────────
const TAMIL_GENDER_MAP: Record<string, 'M' | 'F' | 'Other'> = {
  'ஆண்': 'M',
  'பெண்': 'F',
  'மற்றவை': 'Other',
  'இதர': 'Other',
};

/** Tamil words that mean "no" in an exemption column. */
export const TAMIL_NEGATIVE_WORDS = new Set(['இல்லை', 'இல்ல', 'வேண்டாம்', 'பரவாயில்லை']);

/** Tamil words that affirm an exemption/condition. */
export const TAMIL_AFFIRMATIVE_WORDS = new Set(['ஆம்', 'உண்டு']);

export const TAMIL_EXEMPTION_KEYWORDS = new Set([
  'விதிவிலக்கு', 'மருத்துவ', 'ஊனம்', 'ஊன்றுகோல்',
  'ஓய்வு', 'மருத்துவக் குழு', 'குறைபாடு',
]);

// ─── Duty vocabulary ─────────────────────────────────────────────────
const TAMIL_DUTY_TYPE_MAP: Array<[string, DutyType]> = [
  ['கோட்பாட்டுத் தேர்வு', 'Theory'],
  ['கோட்பாடு', 'Theory'],
  ['எழுத்துத் தேர்வு', 'Theory'],
  ['செயல்முறைத் தேர்வு', 'Practical'],
  ['செயல்முறை', 'Practical'],
  ['அரங்க கண்காணிப்பு', 'Hall Invigilation'],
  ['கண்காணிப்பு', 'Hall Invigilation'],
];

const TAMIL_ROLE_MAP: Array<[string, DutyRole]> = [
  ['முதன்மை கண்காணிப்பாளர்', 'Chief Superintendent'],
  ['முதன்மைக் கண்காணிப்பாளர்', 'Chief Superintendent'],
  ['துறை அதிகாரி', 'Department Officer'],
  ['உள் தேர்வாளர்', 'Internal Examiner'],
  ['வெளி தேர்வாளர்', 'External Examiner'],
  ['வெளித் தேர்வாளர்', 'External Examiner'],
  ['கண்காணிப்பாளர்', 'Hall Invigilator'],
  ['கூடுதல் கண்காணிப்பாளர்', 'Standby Invigilator'],
  ['சுற்று அணி', 'Flying Squad'],
  ['பாதை அதிகாரி', 'Route Officer'],
];

// ─── Public translation helpers ──────────────────────────────────────

function lookupTamil(raw: string, map: Array<[string, unknown]>): string | null {
  const s = normalizeTamilText(String(raw || ''));
  if (!hasTamil(s)) return null;
  for (const [tamil, canonical] of map) {
    if (s.includes(tamil)) return canonical as string;
  }
  return null;
}

/** தலைமை ஆசிரியர் → Headmaster (returns null for non-Tamil input). */
export function tamilToDesignation(raw: string): TeacherDesignation | null {
  return (lookupTamil(raw, TAMIL_DESIGNATION_MAP) as TeacherDesignation) || null;
}

/** இயற்பியல் → Physics (returns null for non-Tamil input). */
export function tamilToSubject(raw: string): Subject | null {
  return (lookupTamil(raw, TAMIL_SUBJECT_MAP) as Subject) || null;
}

/** அரசு நிதியுதவி → Government Aided (returns null for non-Tamil input). */
export function tamilToSchoolType(raw: string): SchoolType | null {
  return (lookupTamil(raw, TAMIL_SCHOOL_TYPE_MAP) as SchoolType) || null;
}

/** ஆண்/பெண்/மற்றவை → M/F/Other (returns null for non-Tamil input). */
export function tamilToGender(raw: string): 'M' | 'F' | 'Other' | null {
  const s = normalizeTamilText(String(raw || '')).toLowerCase();
  return TAMIL_GENDER_MAP[s] ?? null;
}

/** பவானி → bhavani; canonicalises a Tamil block/taluk name (null if not Tamil). */
export function tamilToBlockName(raw: string): string | null {
  const s = normalizeTamilText(String(raw || '')).toLowerCase();
  if (!hasTamil(s)) return null;
  if (TAMIL_BLOCK_ALIASES[s]) return TAMIL_BLOCK_ALIASES[s];
  for (const [tamil, english] of Object.entries(TAMIL_BLOCK_ALIASES)) {
    if (s.includes(tamil)) return english;
  }
  return null;
}

/** செயல்முறைத் தேர்வு → Practical (returns null for non-Tamil input). */
export function tamilToDutyType(raw: string): DutyType | null {
  return (lookupTamil(raw, TAMIL_DUTY_TYPE_MAP) as DutyType) || null;
}

/** முதன்மை கண்காணிப்பாளர் → Chief Superintendent (returns null for non-Tamil input). */
export function tamilToRole(raw: string): DutyRole | null {
  return (lookupTamil(raw, TAMIL_ROLE_MAP) as DutyRole) || null;
}

/** Truthiness for Tamil exemption cells: இல்லை → false, ஆம்/உண்டு → true. */
export function isTruthilyExemptedTamil(raw: any): boolean | null {
  const s = normalizeTamilText(String(raw ?? '')).toLowerCase();
  if (!hasTamil(s) || s === '') return null;
  if (TAMIL_NEGATIVE_WORDS.has(s)) return false;
  if (TAMIL_AFFIRMATIVE_WORDS.has(s)) return true;
  for (const kw of TAMIL_EXEMPTION_KEYWORDS) {
    if (s.includes(kw)) return true;
  }
  return true; // any other Tamil free-text is an exemption reason
}
