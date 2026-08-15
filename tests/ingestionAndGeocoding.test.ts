// Vitest Automated Tests for Automatic Geocoding and Universal Ingestion Engine

import { describe, it, expect } from 'vitest';
import { findLocalityCoordinates, geocodeInstitution, batchGeocodeItems } from '../src/services/geocodingService';
import { IngestionService } from '../src/services/ingestionService';
import * as XLSX from 'xlsx';
import { OFFICIAL_ERODE_BLOCKS } from '../src/services/db';

describe('1. Automatic Geocoding Engine Tests', () => {
  it('correctly resolves GPS coordinates for Erode district localities', () => {
    const bhavaniRes = findLocalityCoordinates('Govt Girls HSS, Bhavani');
    expect(bhavaniRes).not.toBeNull();
    expect(bhavaniRes?.lat).toBeCloseTo(11.4485, 2);
    expect(bhavaniRes?.lng).toBeCloseTo(77.6833, 2);

    const gobiRes = findLocalityCoordinates('Diamond Jubilee School, Gobichettipalayam, Erode');
    expect(gobiRes).not.toBeNull();
    expect(gobiRes?.lat).toBeCloseTo(11.4552, 2);
    expect(gobiRes?.lng).toBeCloseTo(77.4377, 2);

    const sathyRes = findLocalityCoordinates('Govt Boys HSS, Sathyamangalam');
    expect(sathyRes).not.toBeNull();
    expect(sathyRes?.lat).toBeCloseTo(11.5034, 2);
    expect(sathyRes?.lng).toBeCloseTo(77.2415, 2);

    const perunduraiRes = findLocalityCoordinates('Perundurai Town, Erode');
    expect(perunduraiRes).not.toBeNull();
    expect(perunduraiRes?.lat).toBeCloseTo(11.2764, 2);
  });

  it('batch geocodes institutions without coordinates automatically', async () => {
    const unlocatedSchools: { name: string; address: string; lat?: number; lng?: number }[] = [
      { name: 'Govt Higher Secondary School, Anthiyur', address: 'Anthiyur, Erode' },
      { name: 'Govt Higher Secondary School, Kodumudi', address: 'Kodumudi' },
    ];

    const geocoded = await batchGeocodeItems(unlocatedSchools);
    expect(geocoded.length).toBe(2);
    expect(geocoded[0].lat).toBeDefined();
    expect(geocoded[0].lat!).toBeGreaterThan(11.0);
    expect(geocoded[0].lng!).toBeGreaterThan(77.0);
    expect(geocoded[1].lat!).toBeGreaterThan(11.0);
  });
});

describe('2. Universal Excel / CSV Ingestion Engine Tests', () => {
  it('parses Excel file with flexible Tamil Nadu column headers into structured faculty records', async () => {
    // Create an in-memory workbook with Tamil Nadu School Education headers
    const sampleTeacherRows = [
      {
        'EMIS Number': '33100100101',
        'Staff Name': 'Thiru. A. Murugesan',
        'Post': 'PG Assistant',
        'Handling Subject': 'Physics',
        'Parent School': 'Govt Model GHSS, Erode',
        'District Seniority': 15,
        'Date of Appointment': '2012-06-01',
        'Contact No': '9443199001',
        'PH / Medical Exemption': '',
      },
      {
        'EMIS Number': '33100100102',
        'Staff Name': 'Tmt. S. Kavitha',
        'Post': 'Headmaster',
        'Handling Subject': 'Mathematics',
        'Parent School': 'Govt Boys HSS, Bhavani',
        'District Seniority': 3,
        'Date of Appointment': '2005-07-15',
        'Contact No': '9443199002',
        'PH / Medical Exemption': 'Locomotor Disability 50%',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleTeacherRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Roll');
    const binaryBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await IngestionService.parseSpreadsheet(binaryBuffer, OFFICIAL_ERODE_BLOCKS);

    expect(parsed.teachers.length).toBe(2);
    expect(parsed.teachers[0].name).toBe('Thiru. A. Murugesan');
    expect(parsed.teachers[0].designation).toBe('PG Assistant');
    expect(parsed.teachers[0].subject).toBe('Physics');
    expect(parsed.teachers[0].seniorityRank).toBe(15);
    expect(parsed.teachers[0].isExempted).toBe(false);

    expect(parsed.teachers[1].name).toBe('Tmt. S. Kavitha');
    expect(parsed.teachers[1].designation).toBe('Headmaster');
    expect(parsed.teachers[1].isExempted).toBe(true);
    expect(parsed.teachers[1].exemptionReason).toContain('Locomotor Disability');

    // Schools referenced by teachers should be automatically extracted and geocoded
    expect(parsed.schools.length).toBeGreaterThan(0);
    expect(parsed.schools[0].lat).toBeGreaterThan(11.0);
    expect(parsed.schools[0].lng).toBeGreaterThan(77.0);
  });
});
