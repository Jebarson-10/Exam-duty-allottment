// Multi-Year Duty History Ledger & Cross-Cycle Feedback Manager
// Displays, manages, and analyzes persistent historical exam allotments across academic cycles

import React, { useState } from 'react';
import { DutyHistory, Teacher, ExamCentre, ExamCycle } from '../../types';
import { db } from '../../services/db';
import { computeFairnessMetrics } from '../../services/engine/fairness';
import {
  History,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  RotateCw,
  Award,
  Users,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DutyHistoryManagerProps {
  history: DutyHistory[];
  teachers: Teacher[];
  centres: ExamCentre[];
  activeCycle: ExamCycle;
  onHistoryUpdated: () => void;
}

export const DutyHistoryManager: React.FC<DutyHistoryManagerProps> = ({
  history,
  teachers,
  centres,
  activeCycle,
  onHistoryUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedDutyType, setSelectedDutyType] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'BURDEN_ANALYSIS'>('LEDGER');

  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeacherId, setNewTeacherId] = useState('');
  const [newCentreId, setNewCentreId] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear() - 1);
  const [newDutyType, setNewDutyType] = useState<'Theory' | 'Practical' | 'Hall Invigilation'>('Theory');
  const [newRole, setNewRole] = useState<'Chief Superintendent' | 'Department Officer' | 'Internal Examiner' | 'External Examiner' | 'Hall Invigilator'>('Chief Superintendent');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Derive unique years in history
  const uniqueYears = Array.from(new Set(history.map((h) => h.year))).sort((a, b) => b - a);

  // Filtered History
  const filteredHistory = history.filter((h) => {
    const matchesYear = selectedYear === 'ALL' || h.year.toString() === selectedYear;
    const matchesType = selectedDutyType === 'ALL' || h.dutyType === selectedDutyType;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      h.teacherName?.toLowerCase().includes(q) ||
      h.teacherId.toLowerCase().includes(q) ||
      h.centreName?.toLowerCase().includes(q) ||
      h.centreId.toLowerCase().includes(q) ||
      h.role.toLowerCase().includes(q);

    return matchesYear && matchesType && matchesSearch;
  });

  // Calculate teacher fairness metrics from persistent history
  const currentYear = new Date().getFullYear();
  const fairnessMap = computeFairnessMetrics(teachers, history, currentYear);

  const handleSyncCurrentCycle = () => {
    db.syncAllotmentsToHistory(activeCycle.id);
    onHistoryUpdated();
    setActionSuccessMsg(`Synchronized all active allotments for ${activeCycle.label} into the Multi-Year History Ledger!`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleAddManualHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherId || !newCentreId) {
      alert('Please select both a Teacher and an Exam Centre');
      return;
    }

    const t = teachers.find((tch) => tch.id === newTeacherId);
    const c = centres.find((ctr) => ctr.id === newCentreId);

    const record: DutyHistory = {
      id: `HIST-MANUAL-${Date.now()}`,
      teacherId: newTeacherId,
      teacherName: t?.name,
      year: newYear,
      academicYear: `${newYear - 1}-${newYear}`,
      dutyType: newDutyType,
      centreId: newCentreId,
      centreName: c?.name,
      role: newRole,
      allotmentDate: `${newYear}-03-15`,
      notes: 'Manually archived past duty record',
    };

    db.saveSingleDutyHistory(record);
    setIsAddModalOpen(false);
    onHistoryUpdated();
    setActionSuccessMsg(`Added historical duty record for ${t?.name || newTeacherId}`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleDeleteHistory = (id: string) => {
    if (window.confirm('Delete this historical duty record? This will affect fairness and 2-year no-repeat calculations.')) {
      db.deleteDutyHistory(id);
      onHistoryUpdated();
    }
  };

  const exportHistoryToExcel = () => {
    const data = history.map((h, idx) => ({
      'Sl. No': idx + 1,
      'Academic Year': h.academicYear || `${h.year - 1}-${h.year}`,
      'Exam Year': h.year,
      'Teacher ID': h.teacherId,
      'Teacher Name': h.teacherName || h.teacherId,
      'Duty Type': h.dutyType,
      'Assigned Role': h.role,
      'Exam Centre ID': h.centreId,
      'Exam Centre Name': h.centreName || h.centreId,
      'Allotment Date': h.allotmentDate || '',
      'Notes': h.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Duty History Archive');
    XLSX.writeFile(wb, `Erode_District_Exam_Duty_MultiYear_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-tnnavy-950 to-indigo-950 rounded-2xl p-6 text-white border border-tnnavy-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Multi-Year Allotment History & Cross-Cycle Ledger</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Persistent Duty Archive & Burden Rotation Ledger
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every generated allotment and historical roster is permanently logged here. The constraint engines automatically reference this ledger to enforce the <strong>2-Year No-Repeat rule</strong>, <strong>Practical examiner role swaps</strong>, and <strong>equitable workload fairness</strong> across cycles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={handleSyncCurrentCycle}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md transition"
            >
              <RotateCw className="w-4 h-4" />
              <span>Sync Active Cycle Allotments</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-tnnavy-800 hover:bg-tnnavy-700 text-white rounded-xl font-bold border border-tnnavy-600 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Past Duty Record</span>
            </button>

            <button
              onClick={exportHistoryToExcel}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Ledger (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center text-xs font-bold text-emerald-800">
          <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Duties Logged</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{history.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {uniqueYears.length || 1} academic sessions</div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <History className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Faculty Engaged</div>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {new Set(history.map((h) => h.teacherId)).size}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Out of {teachers.length} total teachers</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Cycle Sync</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {history.filter((h) => h.examCycleId === activeCycle.id).length}
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Saved in current cycle</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Historical Centres</div>
            <div className="text-2xl font-black text-red-700 mt-1">
              {new Set(history.map((h) => h.centreId)).size}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Protected by 2-Yr No-Repeat</div>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          {/* Subtabs */}
          <div className="flex space-x-2 text-xs">
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-4 py-2 rounded-xl font-bold transition ${
                activeTab === 'LEDGER'
                  ? 'bg-tnnavy-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Allotments Ledger ({filteredHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('BURDEN_ANALYSIS')}
              className={`px-4 py-2 rounded-xl font-bold transition ${
                activeTab === 'BURDEN_ANALYSIS'
                  ? 'bg-tnnavy-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Faculty Burden & Rotation Scores ({teachers.length})
            </button>
          </div>

          {/* Filters & Search */}
          {activeTab === 'LEDGER' && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search teacher, centre, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-tnnavy-500 outline-none text-xs w-56"
                />
              </div>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 font-semibold outline-none"
              >
                <option value="ALL">All Exam Years</option>
                {uniqueYears.map((y) => (
                  <option key={y} value={y.toString()}>
                    Year {y}
                  </option>
                ))}
              </select>

              <select
                value={selectedDutyType}
                onChange={(e) => setSelectedDutyType(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 font-semibold outline-none"
              >
                <option value="ALL">All Duty Types</option>
                <option value="Theory">Theory Duty</option>
                <option value="Practical">Practical Duty</option>
                <option value="Hall Invigilation">Hall Invigilation</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Ledger Table */}
        {activeTab === 'LEDGER' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Session / Year</th>
                  <th className="py-3 px-4">Teacher Name & ID</th>
                  <th className="py-3 px-4">Duty Type</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Exam Centre</th>
                  <th className="py-3 px-4">Origin Cycle</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No historical duty records found. Synchronize active allotments or import past years' sheets.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-slate-800">{rec.academicYear || rec.year}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{rec.teacherName || rec.teacherId}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{rec.teacherId}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.dutyType === 'Theory'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : rec.dutyType === 'Practical'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {rec.dutyType}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{rec.role}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-800">{rec.centreName || rec.centreId}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{rec.centreId}</div>
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-slate-500">
                        {rec.notes || rec.examCycleId || 'Manual Archive'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteHistory(rec.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Burden & Rotation Score Analysis */}
        {activeTab === 'BURDEN_ANALYSIS' && (
          <div className="p-4 space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <strong>Rotation Policy:</strong> Teachers with <span className="text-emerald-700 font-bold">Lowest Penalty Score (0)</span> receive first priority for new duty allotments. Teachers who served last year receive higher penalty weight.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Teacher Name</th>
                    <th className="py-2.5 px-3">Designation & Subject</th>
                    <th className="py-2.5 px-3 text-center">Total Lifetime Duties</th>
                    <th className="py-2.5 px-3 text-center">Last Duty Year</th>
                    <th className="py-2.5 px-3 text-center">Fairness Penalty Score</th>
                    <th className="py-2.5 px-3 text-center">Allotment Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((t, idx) => {
                    const metrics = fairnessMap.get(t.id) || {
                      totalDutiesCount: 0,
                      lastDutyYear: 0,
                      fairnessPenaltyScore: 0,
                    };

                    const priorityTier =
                      metrics.fairnessPenaltyScore === 0
                        ? 'High Priority (Fresh)'
                        : metrics.fairnessPenaltyScore < 50
                        ? 'Normal Priority'
                        : 'Deprioritized (Recent Duty)';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{t.name}</td>
                        <td className="py-2 px-3 text-slate-600">{t.designation} · {t.subject}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">
                          {metrics.totalDutiesCount}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {metrics.lastDutyYear ? metrics.lastDutyYear : 'Never Served'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-tnnavy-800">
                          {metrics.fairnessPenaltyScore}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              metrics.fairnessPenaltyScore === 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : metrics.fairnessPenaltyScore < 50
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {priorityTier}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Manual Add Past Duty Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-800">Add Historical Duty Record</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddManualHistory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Select Teacher / Faculty</label>
                <select
                  value={newTeacherId}
                  onChange={(e) => setNewTeacherId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                  required
                >
                  <option value="">-- Choose Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.designation} - {t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Exam Centre Where Duty Was Performed</label>
                <select
                  value={newCentreId}
                  onChange={(e) => setNewCentreId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                  required
                >
                  <option value="">-- Choose Exam Centre --</option>
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Exam Year</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(parseInt(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Duty Type</label>
                  <select
                    value={newDutyType}
                    onChange={(e) => setNewDutyType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Practical">Practical</option>
                    <option value="Hall Invigilation">Hall Invigilation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Role Performed</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                >
                  <option value="Chief Superintendent">Chief Superintendent</option>
                  <option value="Department Officer">Department Officer</option>
                  <option value="Internal Examiner">Internal Examiner</option>
                  <option value="External Examiner">External Examiner</option>
                  <option value="Hall Invigilator">Hall Invigilator</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-tnnavy-900 hover:bg-tnnavy-800 text-white rounded-xl font-bold shadow"
                >
                  Save Record to Archive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
