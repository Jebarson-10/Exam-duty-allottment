// Universal Data Ingestion & Auto-Geocoding Portal
// Handles drag-and-drop Excel, CSV, and PDF uploads, automatically parses tables, and geocodes GPS coordinates on maps.

import React, { useState } from 'react';
import { IngestionService, ParsedDataset } from '../../services/ingestionService';
import { School, ExamCentre, Teacher, Block } from '../../types';
import { db } from '../../services/db';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Sparkles,
  School as SchoolIcon,
  Building2,
  Users,
  Save,
  Download,
  RotateCcw,
  Compass,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface UniversalDataIngestionViewProps {
  blocks: Block[];
  onDataIngested: () => void;
  onNavigateToMap: () => void;
}

export const UniversalDataIngestionView: React.FC<UniversalDataIngestionViewProps> = ({
  blocks,
  onDataIngested,
  onNavigateToMap,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedDataset | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'TEACHERS' | 'SCHOOLS' | 'CENTRES'>('TEACHERS');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSaveSuccess(false);
    setProgressStatus(`Reading file "${file.name}"...`);

    try {
      const isPDF = file.name.toLowerCase().endsWith('.pdf');
      const arrayBuffer = await file.arrayBuffer();

      let result: ParsedDataset;
      if (isPDF) {
        setProgressStatus('Extracting text and tabular rosters from PDF...');
        result = await IngestionService.parsePDF(arrayBuffer, blocks);
      } else {
        setProgressStatus('Parsing spreadsheet columns and auto-geocoding institution coordinates...');
        result = await IngestionService.parseSpreadsheet(arrayBuffer, blocks);
      }

      setParsedData(result);
      if (result.teachers.length > 0) setActivePreviewTab('TEACHERS');
      else if (result.schools.length > 0) setActivePreviewTab('SCHOOLS');
      else if (result.centres.length > 0) setActivePreviewTab('CENTRES');
      setProgressStatus('');
    } catch (err: any) {
      alert(`Ingestion Error: ${err.message}`);
      setProgressStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommitToDatabase = () => {
    if (!parsedData) return;

    if (parsedData.schools.length > 0) {
      db.batchSaveSchools(parsedData.schools);
    }
    if (parsedData.centres.length > 0) {
      db.batchSaveCentres(parsedData.centres);
    }
    if (parsedData.teachers.length > 0) {
      db.batchSaveTeachers(parsedData.teachers);
    }

    setSaveSuccess(true);
    onDataIngested();
    setTimeout(() => setSaveSuccess(false), 5000);
  };

  const downloadStandardTemplate = (type: 'TEACHERS' | 'SCHOOLS' | 'CENTRES') => {
    let headers: any[] = [];
    let filename = '';

    if (type === 'TEACHERS') {
      headers = [
        {
          'Teacher ID': 'TCH-1001',
          'Staff Name': 'Dr. S. Meenakshi',
          'Gender': 'F',
          'School Name': 'Govt Model GHSS, Erode',
          'Designation': 'Principal',
          'Subject': 'Physics',
          'District Seniority Rank': 1,
          'Date of Joining': '2001-06-12',
          'Phone': '9443100001',
          'Is Exempted': '0',
          'Exemption Reason': '',
        },
        {
          'Teacher ID': 'TCH-1002',
          'Staff Name': 'Thiru. K. Sengottaiyan',
          'Gender': 'M',
          'School Name': 'Govt Boys HSS, Bhavani',
          'Designation': 'Headmaster',
          'Subject': 'Mathematics',
          'District Seniority Rank': 2,
          'Date of Joining': '2002-07-15',
          'Phone': '9443100002',
          'Is Exempted': '0',
          'Exemption Reason': '',
        },
      ];
      filename = 'Erode_Official_Teachers_Template.xlsx';
    } else if (type === 'SCHOOLS') {
      headers = [
        {
          'School ID': 'SCH-01',
          'School Official Name': 'Govt Model Girls Higher Secondary School, Erode',
          'Address': 'Brough Road, Erode - 638001',
          'Block Name': 'Erode Urban',
          'School Type': 'Government',
          '12th Strength': 280,
          '10th Strength': 310,
        },
        {
          'School ID': 'SCH-02',
          'School Official Name': 'Govt Boys Higher Secondary School, Bhavani',
          'Address': 'Cauvery Nagar, Bhavani - 638301',
          'Block Name': 'Bhavani',
          'School Type': 'Government',
          '12th Strength': 250,
          '10th Strength': 280,
        },
      ];
      filename = 'Erode_Official_Schools_Template.xlsx';
    } else if (type === 'CENTRES') {
      headers = [
        {
          'Centre ID': 'CTR-01',
          'Centre Name': 'Govt Model GHSS Centre, Erode',
          'Address': 'Brough Road, Erode - 638001',
          'Block Name': 'Erode Urban',
          'Student Capacity': 450,
          'Total Halls': 23,
          'Clubbed School Names (comma separated)': 'Govt Model Girls HSS, Mahajana HSS',
        },
      ];
      filename = 'Erode_Official_Centres_Template.xlsx';
    }

    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6">
      {/* Hero Ingestion Box */}
      <div className="bg-gradient-to-r from-tnnavy-950 via-tnnavy-900 to-slate-900 rounded-2xl p-6 text-white border border-tnnavy-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Smart Document Ingestion & Auto-Geocoding Engine</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Universal Excel, CSV & PDF Roster Ingestion
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upload official CEO Office teacher lists, school lists, exam centre circulars, or PDF orders. The system automatically normalizes fields, links institutions, and <strong>fetches GPS map coordinates automatically</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => downloadStandardTemplate('TEACHERS')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-tnnavy-800/90 hover:bg-tnnavy-700 text-white rounded-lg border border-tnnavy-600 transition font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Teacher Template</span>
            </button>
            <button
              onClick={() => downloadStandardTemplate('SCHOOLS')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-tnnavy-800/90 hover:bg-tnnavy-700 text-white rounded-lg border border-tnnavy-600 transition font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>School Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-tnnavy-600 p-8 text-center transition bg-slate-50/50 shadow-sm">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-tnnavy-50 text-tnnavy-800 mx-auto flex items-center justify-center border border-tnnavy-200">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">
              Drag & Drop or Select Excel (.xlsx, .xls), CSV (.csv), or PDF (.pdf) File
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Supports official EMIS rosters, staff postings, exam centre notifications, and circular PDFs.
            </p>
          </div>

          <div>
            <label className="inline-flex items-center space-x-2 px-5 py-2.5 bg-tnnavy-900 hover:bg-tnnavy-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <span>Select Document to Ingest</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv, .pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
            </label>
          </div>

          {isProcessing && (
            <div className="pt-2 text-xs font-semibold text-tnnavy-700 animate-pulse flex items-center justify-center space-x-2">
              <Compass className="w-4 h-4 animate-spin text-tnnavy-600" />
              <span>{progressStatus || 'Processing document and fetching GPS coordinates...'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ingestion Results & Preview Card */}
      {parsedData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
                  Detected: {parsedData.detectedType.replace('_', ' ')}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {parsedData.rawRowCount} total records extracted
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {parsedData.schools.length} Schools · {parsedData.centres.length} Centres · {parsedData.teachers.length} Teachers ({parsedData.geocodedCount} GPS locations auto-mapped)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onNavigateToMap}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition"
              >
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>View on GPS Map</span>
              </button>

              <button
                onClick={handleCommitToDatabase}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                <Save className="w-4 h-4" />
                <span>Save to Master Database</span>
              </button>
            </div>
          </div>

          {saveSuccess && (
            <div className="mx-5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600 shrink-0" />
              <span>
                All parsed records and auto-geocoded map coordinates have been successfully committed to the Erode District Master Database!
              </span>
            </div>
          )}

          {/* Sub-Tabs for Preview */}
          <div className="px-5">
            <div className="flex space-x-2 border-b border-slate-200 pb-2 text-xs">
              {parsedData.teachers.length > 0 && (
                <button
                  onClick={() => setActivePreviewTab('TEACHERS')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activePreviewTab === 'TEACHERS'
                      ? 'bg-tnnavy-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Teachers ({parsedData.teachers.length})
                </button>
              )}
              {parsedData.schools.length > 0 && (
                <button
                  onClick={() => setActivePreviewTab('SCHOOLS')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activePreviewTab === 'SCHOOLS'
                      ? 'bg-tnnavy-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Schools & GPS Coordinates ({parsedData.schools.length})
                </button>
              )}
              {parsedData.centres.length > 0 && (
                <button
                  onClick={() => setActivePreviewTab('CENTRES')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activePreviewTab === 'CENTRES'
                      ? 'bg-tnnavy-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Exam Centres ({parsedData.centres.length})
                </button>
              )}
            </div>
          </div>

          {/* Tabular Preview */}
          <div className="overflow-x-auto px-5 pb-5">
            {activePreviewTab === 'TEACHERS' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Teacher ID</th>
                    <th className="py-2.5 px-3">Teacher Name</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Parent School</th>
                    <th className="py-2.5 px-3 text-center">Seniority</th>
                    <th className="py-2.5 px-3 text-center">Exempted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedData.teachers.slice(0, 20).map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-medium text-slate-700">{t.id}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{t.name}</td>
                      <td className="py-2 px-3 text-slate-600">{t.designation}</td>
                      <td className="py-2 px-3 font-semibold text-tnnavy-700">{t.subject}</td>
                      <td className="py-2 px-3 text-slate-600">{t.schoolId}</td>
                      <td className="py-2 px-3 text-center font-bold">#{t.seniorityRank}</td>
                      <td className="py-2 px-3 text-center">
                        {t.isExempted ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-bold">
                            Yes
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activePreviewTab === 'SCHOOLS' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">School Name</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Auto-Geocoded GPS Coordinates</th>
                    <th className="py-2.5 px-3 text-center">Map Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedData.schools.slice(0, 20).map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{s.name}</td>
                      <td className="py-2 px-3 text-slate-600">{s.address}</td>
                      <td className="py-2 px-3 font-medium text-slate-700">{s.type}</td>
                      <td className="py-2 px-3 font-mono text-tnnavy-700 font-semibold">
                        {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                          <MapPin className="w-3 h-3 mr-1" />
                          Marked on Map
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activePreviewTab === 'CENTRES' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Centre Name</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3 text-center">Capacity</th>
                    <th className="py-2.5 px-3">GPS Location</th>
                    <th className="py-2.5 px-3">Clubbed Schools</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedData.centres.slice(0, 20).map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{c.name}</td>
                      <td className="py-2 px-3 text-slate-600">{c.address}</td>
                      <td className="py-2 px-3 text-center font-bold text-tnnavy-800">{c.capacity}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</td>
                      <td className="py-2 px-3 text-slate-600">{c.clubbedSchoolIds?.join(', ') || 'Self'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {parsedData.rawRowCount > 20 && (
              <div className="pt-3 text-center text-slate-400 text-[11px] italic">
                Showing first 20 records of {parsedData.rawRowCount}. All records will be committed to the master database.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
