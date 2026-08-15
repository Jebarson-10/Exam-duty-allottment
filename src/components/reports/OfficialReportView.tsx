// Official Reports & Export Suite for Erode District CEO Office

import React, { useState } from 'react';
import { DutyAllotment, School, ExamCentre, Teacher, ExamCycle } from '../../types';
import { ExportService } from '../../services/exportService';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  CheckCircle2,
  Building2,
  Users,
  ShieldCheck,
} from 'lucide-react';

interface OfficialReportViewProps {
  allotments: DutyAllotment[];
  schools: School[];
  centres: ExamCentre[];
  teachers: Teacher[];
  activeCycle: ExamCycle;
}

export const OfficialReportView: React.FC<OfficialReportViewProps> = ({
  allotments,
  schools,
  centres,
  teachers,
  activeCycle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dutyTypeFilter, setDutyTypeFilter] = useState<'ALL' | 'Theory' | 'Practical' | 'Hall Invigilation'>('ALL');
  const [selectedAllotmentForPreview, setSelectedAllotmentForPreview] = useState<DutyAllotment | null>(null);
  const [missingCentreWarnings, setMissingCentreWarnings] = useState<number>(0);

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const centreMap = new Map(centres.map((c) => [c.id, c]));
  const schoolMap = new Map(schools.map((s) => [s.id, s]));

  const filteredAllotments = allotments.filter((a) => {
    const matchSearch =
      (a.teacherName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.centreName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = dutyTypeFilter === 'ALL' || a.dutyType === dutyTypeFilter;
    return matchSearch && matchType;
  });

  const handleExportExcel = () => {
    ExportService.exportToExcel(
      allotments,
      schools,
      centres,
      teachers,
      activeCycle,
      `Erode_CEO_Exam_Allotment_${activeCycle.standard}.xlsx`
    );
  };

  const handleExportMasterPDF = () => {
    ExportService.generateMasterCentreChartPDF(
      allotments,
      centres,
      schools,
      activeCycle
    );
  };

  const handleGenerateIndividualOrderPDF = (allotment: DutyAllotment) => {
    const teacher = teacherMap.get(allotment.teacherId);
    const centre = centreMap.get(allotment.centreId);
    
    if (!centre) {
      console.warn(`Skipping allotment ${allotment.id}: Centre ${allotment.centreId} not found.`);
      setMissingCentreWarnings(prev => prev + 1);
      return;
    }

    const school = teacher ? schoolMap.get(teacher.schoolId) : null;

    if (teacher && school) {
      ExportService.generateOfficialAppointmentOrderPDF(
        allotment,
        teacher,
        centre,
        school,
        activeCycle
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Batch Export Actions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-tnnavy-50 text-tnnavy-800 rounded-xl border border-tnnavy-200">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-800">
                Official Proceedings & Appointment Orders Suite
              </h2>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                {activeCycle.standard} Standard
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate authenticated appointment orders, school-wise relieving notices, and master district charts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow hover:bg-emerald-800 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Full Workbook (.xlsx)</span>
          </button>

          <button
            onClick={handleExportMasterPDF}
            className="flex items-center space-x-1.5 px-4 py-2 bg-tnnavy-800 text-white rounded-xl text-xs font-bold shadow hover:bg-tnnavy-900 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Download Master PDF Chart</span>
          </button>
        </div>
      </div>

      {missingCentreWarnings > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl shadow-sm text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <span>Warning: {missingCentreWarnings} allotment(s) skipped because the corresponding exam centre data is missing.</span>
          </div>
          <button onClick={() => setMissingCentreWarnings(0)} className="text-amber-600 hover:text-amber-800 underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Filter & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative md:col-span-3">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search roster by staff name, centre, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-tnnavy-500 outline-none"
          />
        </div>

        <div>
          <select
            value={dutyTypeFilter}
            onChange={(e) => setDutyTypeFilter(e.target.value as any)}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-semibold"
          >
            <option value="ALL">All Duty Modules ({allotments.length})</option>
            <option value="Theory">Theory Duty</option>
            <option value="Practical">Practical Duty</option>
            <option value="Hall Invigilation">Hall Invigilation</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">Designation & Subject</th>
                <th className="py-3 px-4">Parent Institution</th>
                <th className="py-3 px-4">Allotted Exam Centre</th>
                <th className="py-3 px-4">Duty Role</th>
                <th className="py-3 px-4 text-center">Distance</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAllotments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No allotments found. Please generate allotments from the Theory, Practical, or Hall wizards first.
                  </td>
                </tr>
              ) : (
                filteredAllotments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{a.teacherName}</div>
                      <div className="text-[10px] text-slate-400">ID: {a.teacherId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700 font-medium">{a.teacherDesignation}</div>
                      <div className="text-[11px] text-tnnavy-600 font-semibold">{a.teacherSubject || 'General'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {schoolMap.get(a.teacherSchoolId || '')?.name || a.teacherSchoolId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{a.centreName}</div>
                      <div className="text-[10px] text-slate-400">
                        {a.hallNumber ? `Hall ${a.hallNumber}` : a.session || 'Full Day'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-tnnavy-50 text-tnnavy-800 border border-tnnavy-200">
                        {a.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                      {a.distanceKm} km
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleGenerateIndividualOrderPDF(a)}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-tnnavy-800 text-white rounded font-bold text-[11px] hover:bg-tnnavy-900 shadow-sm transition"
                        title="Download CEO Office Appointment Order PDF"
                      >
                        <Download className="w-3 h-3" />
                        <span>Order PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
