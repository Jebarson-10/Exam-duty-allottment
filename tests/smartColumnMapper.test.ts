// Vitest tests for the Smart Column Mapper (data-content fingerprinting) and
// the hardened ingestion pipeline (banner rows, per-entity name resolution,
// exemption truthiness, Excel serial dates).

import { describe, it, expect } from 'vitest';
import { SmartColumnMapper } from '../src/services/smartColumnMapper';
import { IngestionService } from '../src/services/ingestionService';
import { findLocalityCoordinates } from '../src/services/geocodingService';
import { tamilToSubject, tamilToDesignation, tamilToBlockName } from '../src/services/tamilData';
import { STRINGS } from '../src/i18n';
import * as XLSX from 'xlsx';
import { OFFICIAL_ERODE_BLOCKS } from '../src/services/db';

describe('3. Smart Column Mapper — data fingerprinting', () => {
  const rows = (data: Record<string, any>[]) => data;

  it('detects fields from generic numbered headers by analyzing cell content only', () => {
    const sampleRows = rows([
      { 'Column 1': '9443100001', 'Column 2': '11.3418', 'Column 3': '77.7212', 'Column 4': '2012-06-01', 'Column 5': 'Thiru. A. Murugesan' },
      { 'Column 1': '9443100002', 'Column 2': '11.4485', 'Column 3': '77.6833', 'Column 4': '2005-07-15', 'Column 5': 'Tmt. S. Kavitha' },
      { 'Column 1': '9443100003', 'Column 2': '11.4552', 'Column 3': '77.4377', 'Column 4': '2016-03-01', 'Column 5': 'Dr. R. Anbumani' },
    ]);
    const mapping = SmartColumnMapper.autoMapColumns(Object.keys(sampleRows[0]), sampleRows);
    const fieldOf = (h: string) => mapping.find((m) => m.originalHeader === h)?.detectedField;

    expect(fieldOf('Column 1')).toBe('phone');
    expect(fieldOf('Column 2')).toBe('lat');
    expect(fieldOf('Column 3')).toBe('lng');
    expect(fieldOf('Column 4')).toBe('doj');
    expect(fieldOf('Column 5')).toBe('name');
  });

  it('detects designation and subject from Tamil headers via value fingerprints', () => {
    const sampleRows = rows([
      { 'ஆசிரியர் பெயர்': 'Thiru. A. Murugesan', 'பதவி': 'PG Assistant', 'பாடம்': 'Physics' },
      { 'ஆசிரியர் பெயர்': 'Tmt. S. Kavitha', 'பதவி': 'Headmaster', 'பாடம்': 'Mathematics' },
      { 'ஆசிரியர் பெயர்': 'Dr. R. Anbumani', 'பதவி': 'Principal', 'பாடம்': 'Chemistry' },
    ]);
    const mapping = SmartColumnMapper.autoMapColumns(Object.keys(sampleRows[0]), sampleRows);
    const fieldOf = (h: string) => mapping.find((m) => m.originalHeader === h)?.detectedField;

    expect(fieldOf('ஆசிரியர் பெயர்')).toBe('name');
    expect(fieldOf('பதவி')).toBe('designation');
    expect(fieldOf('பாடம்')).toBe('subject');
  });

  it('never confuses long school names with block names', () => {
    const schoolValues = ['Govt Model GHSS, Erode', 'Govt Boys HSS, Bhavani', 'Diamond Jubilee School, Gobichettipalayam'];
    const blockValues = ['Erode', 'Bhavani', 'Gobichettipalayam'];

    const schoolCol = SmartColumnMapper.analyzeColumn('Institution', schoolValues);
    const blockCol = SmartColumnMapper.analyzeColumn('Zone', blockValues);

    expect(schoolCol.field).not.toBe('block');
    expect(blockCol.field).toBe('block');
  });

  it('detects entity type from mapped fields and sheet name', () => {
    const teacherCols = SmartColumnMapper.autoMapColumns(
      ['Name', 'Post', 'Subject'],
      rows([{ Name: 'A. Ravi', Post: 'PG Assistant', Subject: 'Tamil' }])
    );
    expect(SmartColumnMapper.detectEntityType(teacherCols, 'Sheet1')).toBe('TEACHERS');

    const historyCols = SmartColumnMapper.autoMapColumns(
      ['Teacher', 'Year', 'Allotted Centre', 'Duty Role'],
      rows([
        { Teacher: 'A. Ravi', Year: '2024', 'Allotted Centre': 'GHSS Erode', 'Duty Role': 'Hall Invigilator' },
        { Teacher: 'B. Rani', Year: '2023', 'Allotted Centre': 'GHSS Bhavani', 'Duty Role': 'Department Officer' },
      ])
    );
    expect(SmartColumnMapper.detectEntityType(historyCols, 'Sheet1')).toBe('DUTY_HISTORY');
  });
});

describe('4. Ingestion pipeline hardening', () => {
  it('parses a schools sheet whose name column is headed "School Name" (not dropped)', async () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'School ID': 'SCH-01', 'School Name': 'Govt Model GHSS, Erode', 'Block Name': 'Erode Urban', 'School Type': 'Government' },
      { 'School ID': 'SCH-02', 'School Name': 'Govt Boys HSS, Bhavani', 'Block Name': 'Bhavani', 'School Type': 'Government' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Schools');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await IngestionService.parseSpreadsheet(buffer, OFFICIAL_ERODE_BLOCKS);
    expect(parsed.schools.length).toBe(2);
    expect(parsed.schools[0].name).toBe('Govt Model GHSS, Erode');
    expect(parsed.schools[1].name).toBe('Govt Boys HSS, Bhavani');
  });

  it('skips banner/title rows above the real header row', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['CHIEF EDUCATIONAL OFFICER, ERODE DISTRICT'],
      ['Public Examination Duty List 2026'],
      ['EMIS Number', 'Staff Name', 'Post', 'Handling Subject', 'Contact No'],
      ['33100100101', 'Thiru. A. Murugesan', 'PG Assistant', 'Physics', '9443199001'],
      ['33100100102', 'Tmt. S. Kavitha', 'Headmaster', 'Mathematics', '9443199002'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Roll');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await IngestionService.parseSpreadsheet(buffer, OFFICIAL_ERODE_BLOCKS);
    expect(parsed.teachers.length).toBe(2);
    expect(parsed.teachers[0].name).toBe('Thiru. A. Murugesan');
    expect(parsed.teachers[0].phone).toBe('9443199001');
  });

  it('treats "No"/"N" exemption values as NOT exempted', async () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'EMIS Number': '33100100101', 'Staff Name': 'A. Ravi', 'Post': 'PG Assistant', 'Handling Subject': 'Physics', 'PH / Medical Exemption': 'No' },
      { 'EMIS Number': '33100100102', 'Staff Name': 'B. Rani', 'Post': 'PG Assistant', 'Handling Subject': 'Chemistry', 'PH / Medical Exemption': 'Medical Board' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await IngestionService.parseSpreadsheet(buffer, OFFICIAL_ERODE_BLOCKS);
    expect(parsed.teachers[0].isExempted).toBe(false);
    expect(parsed.teachers[1].isExempted).toBe(true);
    expect(parsed.teachers[1].exemptionReason).toBe('Medical Board');
  });

  it('converts Excel serial and DD/MM/YYYY dates to ISO for date of joining', async () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'EMIS Number': '33100100101', 'Staff Name': 'A. Ravi', 'Post': 'PG Assistant', 'Handling Subject': 'Physics', 'Date of Appointment': '15/07/2005' },
      { 'EMIS Number': '33100100102', 'Staff Name': 'B. Rani', 'Post': 'PG Assistant', 'Handling Subject': 'Chemistry', 'Date of Appointment': 42466 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await IngestionService.parseSpreadsheet(buffer, OFFICIAL_ERODE_BLOCKS);
    expect(parsed.teachers[0].dateOfJoining).toBe('2005-07-15');
    expect(parsed.teachers[1].dateOfJoining).toBe('2016-04-06');
  });
});

describe('5. Native Tamil language support', () => {
  it('translates Tamil domain vocabulary to canonical values', () => {
    expect(tamilToSubject('இயற்பியல்')).toBe('Physics');
    expect(tamilToSubject('கணிதம்')).toBe('Mathematics');
    expect(tamilToSubject('தமிழ்')).toBe('Tamil');
    expect(tamilToDesignation('தலைமை ஆசிரியர்')).toBe('Headmaster');
    expect(tamilToDesignation('முதுகலை உதவியாளர்')).toBe('PG Assistant');
    expect(tamilToBlockName('பவானி')).toBe('bhavani');
    expect(tamilToBlockName('கோபிசெட்டிபாளையம்')).toBe('gobichettipalayam');
  });

  it('ingests a fully Tamil roster (Tamil headers and values) into normalized records', async () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'ஆசிரியர் பெயர்': 'திரு. முருகேசன்', 'பதவி': 'தலைமை ஆசிரியர்', 'பாடம்': 'இயற்பியல்', 'பணிபுரியும் பள்ளி': 'அரசு மேல்நிலைப் பள்ளி, பவானி', 'பாலினம்': 'ஆண்', 'தொடர்புக்கு': '9443100001', 'விதிவிலக்கு': 'இல்லை' },
      { 'ஆசிரியர் பெயர்': 'திருமதி. கவிதா', 'பதவி': 'முதுகலை உதவியாளர்', 'பாடம்': 'கணிதம்', 'பணிபுரியும் பள்ளி': 'அரசு மேல்நிலைப் பள்ளி, பவானி', 'பாலினம்': 'பெண்', 'தொடர்புக்கு': '9443100002', 'விதிவிலக்கு': 'மருத்துவக் குழு' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ஆசிரியர்கள்');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await IngestionService.parseSpreadsheet(buffer, OFFICIAL_ERODE_BLOCKS);
    expect(parsed.teachers.length).toBe(2);
    expect(parsed.teachers[0].name).toBe('திரு. முருகேசன்');
    expect(parsed.teachers[0].designation).toBe('Headmaster');
    expect(parsed.teachers[0].subject).toBe('Physics');
    expect(parsed.teachers[0].gender).toBe('M');
    expect(parsed.teachers[0].isExempted).toBe(false);
    expect(parsed.teachers[1].designation).toBe('PG Assistant');
    expect(parsed.teachers[1].subject).toBe('Mathematics');
    expect(parsed.teachers[1].gender).toBe('F');
    expect(parsed.teachers[1].isExempted).toBe(true);
  });

  it('resolves Tamil block names to official block IDs during school ingestion', async () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'பள்ளியின் பெயர்': 'அரசு மேல்நிலைப் பள்ளி, பவானி', 'கல்வி வட்டம்': 'பவானி', 'பள்ளி வகை': 'அரசு' },
      { 'பள்ளியின் பெயர்': 'அரசு மேல்நிலைப் பள்ளி, பெருந்துறை', 'கல்வி வட்டம்': 'பெருந்துறை', 'பள்ளி வகை': 'அரசு நிதியுதவி' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'பள்ளிகள்');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await IngestionService.parseSpreadsheet(buffer, OFFICIAL_ERODE_BLOCKS);
    expect(parsed.schools.length).toBe(2);
    expect(parsed.schools[0].blockId).toBe('BLK-BHV');
    expect(parsed.schools[1].blockId).toBe('BLK-PRD');
    expect(parsed.schools[0].type).toBe('Government');
    expect(parsed.schools[1].type).toBe('Government Aided');
  });

  it('geocodes institutions named in Tamil via the locality dictionary', () => {
    const match = findLocalityCoordinates('அரசு மேல்நிலைப் பள்ளி, பவானி');
    expect(match).not.toBeNull();
    expect(match?.lat).toBeCloseTo(11.4485, 2);
    expect(match?.lng).toBeCloseTo(77.6833, 2);

    const gobi = findLocalityCoordinates('கோபிசெட்டிபாளையம்');
    expect(gobi?.lat).toBeCloseTo(11.4552, 2);
  });

  it('keeps every UI string available in both English and Tamil', () => {
    for (const [key, entry] of Object.entries(STRINGS)) {
      expect(key, `key ${key}`).toBeTruthy();
      expect(entry.length, `key ${key}`).toBe(2);
      expect(entry[0].trim(), `English for ${key}`).not.toBe('');
      expect(entry[1].trim(), `Tamil for ${key}`).not.toBe('');
    }
    // Spot-check a known bilingual pair
    expect(STRINGS['nav.theory'][1]).toBe('கோட்பாட்டுத் தேர்வு ஒதுக்கீடு');
  });
});

describe('6. Official centre numbers (மைய எண்)', () => {
  it('detects centre-number columns from English and Tamil headers', () => {
    const en = SmartColumnMapper.analyzeColumn('Centre No', ['33101401', '33101402']);
    expect(en.field).toBe('centreNumber');

    const ta = SmartColumnMapper.analyzeColumn('மைய எண்', ['101', '102']);
    expect(ta.field).toBe('centreNumber');
  });

  it('captures centre numbers during ingestion and uses them as stable IDs', async () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Centre No': '33101401', 'Centre Name': 'Govt Model GHSS Centre, Erode', 'Block Name': 'Erode Urban', 'Student Capacity': 450 },
      { 'Centre No': '33101402', 'Centre Name': 'Govt Boys HSS Centre, Bhavani', 'Block Name': 'Bhavani', 'Student Capacity': 380 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Centres');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await IngestionService.parseSpreadsheet(buffer, OFFICIAL_ERODE_BLOCKS);
    expect(parsed.centres.length).toBe(2);
    expect(parsed.centres[0].centreNumber).toBe('33101401');
    expect(parsed.centres[1].centreNumber).toBe('33101402');
    expect(parsed.centres[0].id).toBe('CTR-33101401');
    expect(parsed.centres[1].id).toBe('CTR-33101402');
  });
});
