// Bulk Master Data Import / Export Module (CSV & Excel)

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { School, ExamCentre, Teacher, Block } from '../../types';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface BulkImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  centres: ExamCentre[];
  teachers: Teacher[];
  blocks: Block[];
  onImportSchools: (schools: School[]) => void;
  onImportCentres: (centres: ExamCentre[]) => void;
  onImportTeachers: (teachers: Teacher[]) => void;
}

export const BulkImportExportModal: React.FC<BulkImportExportModalProps> = ({
  isOpen,
  onClose,
  schools,
  centres,
  teachers,
  blocks,
  onImportSchools,
  onImportCentres,
  onImportTeachers,
}) => {
  const [activeTab, setActiveTab] = useState<'TEACHERS' | 'SCHOOLS' | 'CENTRES'>('TEACHERS');
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  // Template Download Generator
  const downloadTemplate = (type: 'TEACHERS' | 'SCHOOLS' | 'CENTRES') => {
    let headers: any[] = [];
    let filename = '';

    if (type === 'TEACHERS') {
      headers = [
        {
          'Teacher ID': 'TCH-101',
          'Name': 'Thiru. K. Murugesan',
          'Gender (M/F)': 'M',
          'School ID': 'SCH-01',
          'Designation': 'PG Assistant',
          'Subject': 'Physics',
          'Seniority Rank': 105,
          'Date of Joining (YYYY-MM-DD)': '2016-06-01',
          'Home Latitude': 11.3418,
          'Home Longitude': 77.7212,
          'Is Exempted (0/1)': 0,
          'Exemption Reason': '',
          'Phone': '9443100101',
        },
      ];
      filename = 'Erode_Teachers_Master_Template.xlsx';
    } else if (type === 'SCHOOLS') {
      headers = [
        {
          'School ID': 'SCH-50',
          'School Name': 'Govt Model HSS, Erode',
          'Address': 'Brough Road, Erode',
          'Latitude': 11.3418,
          'Longitude': 77.7212,
          'Block ID': 'BLK-ERD',
          'Type': 'Government',
          '12th Strength': 250,
          '10th Strength': 280,
        },
      ];
      filename = 'Erode_Schools_Master_Template.xlsx';
    } else if (type === 'CENTRES') {
      headers = [
        {
          'Centre ID': 'CTR-50',
          'Centre Name': 'Govt Model GHSS Centre',
          'Address': 'Brough Road, Erode',
          'Latitude': 11.3418,
          'Longitude': 77.7212,
          'Block ID': 'BLK-ERD',
          'Host School ID': 'SCH-01',
          'Student Capacity': 400,
          'Total Halls': 20,
          'Clubbed School IDs (comma separated)': 'SCH-01, SCH-04',
        },
      ];
      filename = 'Erode_Centres_Master_Template.xlsx';
    }

    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, filename);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          setUploadStatus({ success: false, message: 'The uploaded file is empty.' });
          return;
        }

        if (activeTab === 'TEACHERS') {
          const parsedTeachers: Teacher[] = rawData.map((r, i) => ({
            id: r['Teacher ID'] || r['id'] || `TCH-IMP-${i + 1}`,
            name: r['Name'] || r['name'] || `Teacher ${i + 1}`,
            gender: (r['Gender (M/F)'] || r['gender'] || 'M') as any,
            schoolId: r['School ID'] || r['schoolId'] || schools[0]?.id || 'SCH-01',
            designation: r['Designation'] || r['designation'] || 'PG Assistant',
            subject: r['Subject'] || r['subject'] || 'Physics',
            seniorityRank: parseInt(r['Seniority Rank'] || r['seniorityRank'] || 999),
            dateOfJoining: r['Date of Joining (YYYY-MM-DD)'] || r['dateOfJoining'] || '2018-06-01',
            homeLat: parseFloat(r['Home Latitude'] || r['homeLat'] || 11.3418),
            homeLng: parseFloat(r['Home Longitude'] || r['homeLng'] || 77.7212),
            isExempted: String(r['Is Exempted (0/1)'] || r['isExempted']) === '1' || String(r['isExempted']).toLowerCase() === 'true',
            exemptionReason: r['Exemption Reason'] || r['exemptionReason'] || '',
            phone: String(r['Phone'] || r['phone'] || '9443100000'),
          }));

          onImportTeachers(parsedTeachers);
          setUploadStatus({ success: true, message: `Successfully imported ${parsedTeachers.length} teachers!` });
        } else if (activeTab === 'SCHOOLS') {
          const parsedSchools: School[] = rawData.map((r, i) => ({
            id: r['School ID'] || r['id'] || `SCH-IMP-${i + 1}`,
            name: r['School Name'] || r['name'] || `School ${i + 1}`,
            address: r['Address'] || r['address'] || 'Erode District',
            lat: parseFloat(r['Latitude'] || r['lat'] || 11.3418),
            lng: parseFloat(r['Longitude'] || r['lng'] || 77.7212),
            blockId: r['Block ID'] || r['blockId'] || 'BLK-ERD',
            type: r['Type'] || r['type'] || 'Government',
            studentStrength12th: parseInt(r['12th Strength'] || r['studentStrength12th'] || 200),
            studentStrength10th: parseInt(r['10th Strength'] || r['studentStrength10th'] || 200),
          }));

          onImportSchools(parsedSchools);
          setUploadStatus({ success: true, message: `Successfully imported ${parsedSchools.length} schools!` });
        } else if (activeTab === 'CENTRES') {
          const parsedCentres: ExamCentre[] = rawData.map((r, i) => ({
            id: r['Centre ID'] || r['id'] || `CTR-IMP-${i + 1}`,
            name: r['Centre Name'] || r['name'] || `Centre ${i + 1}`,
            address: r['Address'] || r['address'] || 'Erode District',
            lat: parseFloat(r['Latitude'] || r['lat'] || 11.3418),
            lng: parseFloat(r['Longitude'] || r['lng'] || 77.7212),
            blockId: r['Block ID'] || r['blockId'] || 'BLK-ERD',
            schoolId: r['Host School ID'] || r['schoolId'],
            capacity: parseInt(r['Student Capacity'] || r['capacity'] || 300),
            totalHalls: parseInt(r['Total Halls'] || r['totalHalls'] || 15),
            clubbedSchoolIds: String(r['Clubbed School IDs (comma separated)'] || r['clubbedSchoolIds'] || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          }));

          onImportCentres(parsedCentres);
          setUploadStatus({ success: true, message: `Successfully imported ${parsedCentres.length} exam centres!` });
        }
      } catch (err: any) {
        setUploadStatus({ success: false, message: `Import error: ${err.message}` });
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-tnnavy-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Bulk Master Data Import / Export (Excel & CSV)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold">
            &times;
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Tab Selector */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(['TEACHERS', 'SCHOOLS', 'CENTRES'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setUploadStatus(null);
                }}
                className={`flex-1 py-1.5 font-bold rounded-md transition text-center ${
                  activeTab === tab ? 'bg-white text-tnnavy-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'TEACHERS' ? `Teachers (${teachers.length})` : tab === 'SCHOOLS' ? `Schools (${schools.length})` : `Centres (${centres.length})`}
              </button>
            ))}
          </div>

          {/* Template Download Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="font-bold text-blue-900 text-xs">Download Standard Excel Template</div>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Download pre-formatted spreadsheet template with sample column headers and validations.
              </p>
            </div>
            <button
              onClick={() => downloadTemplate(activeTab)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition text-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .xlsx</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-tnnavy-500 transition bg-slate-50">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="font-bold text-slate-700 mb-1">Select Excel (.xlsx) or CSV file to import</div>
            <p className="text-[11px] text-slate-500 mb-3">
              Matches headers automatically and merges/updates existing records.
            </p>
            <label className="inline-flex items-center space-x-2 px-4 py-2 bg-tnnavy-800 text-white rounded-lg font-bold cursor-pointer hover:bg-tnnavy-900 transition shadow">
              <Upload className="w-4 h-4" />
              <span>Browse File</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Status Message */}
          {uploadStatus && (
            <div
              className={`p-3 rounded-lg flex items-center text-xs font-semibold ${
                uploadStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}
            >
              {uploadStatus.success ? (
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0" />
              )}
              <span>{uploadStatus.message}</span>
            </div>
          )}

          <div className="pt-2 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
