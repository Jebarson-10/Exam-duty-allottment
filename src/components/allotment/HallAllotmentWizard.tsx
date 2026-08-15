// Hall Invigilation Allotment Wizard for Erode District

import React, { useState } from 'react';
import {
  ExamCentre,
  School,
  Teacher,
  DutyHistory,
  DutyAllotment,
  HallEngineConfig,
  ExamCycle,
} from '../../types';
import {
  generateHallInvigilationAllotment,
  DEFAULT_HALL_CONFIG,
  HallAllotmentResult,
} from '../../services/engine/hallInvigilationEngine';
import {
  LayoutGrid,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Users,
  Save,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface HallAllotmentWizardProps {
  centres: ExamCentre[];
  schools: School[];
  teachers: Teacher[];
  history: DutyHistory[];
  activeCycle: ExamCycle;
  existingAllotments: DutyAllotment[];
  onSaveAllotments: (allotments: DutyAllotment[]) => void;
  onOpenOverride: (allotment: DutyAllotment) => void;
}

export const HallAllotmentWizard: React.FC<HallAllotmentWizardProps> = ({
  centres,
  schools,
  teachers,
  history,
  activeCycle,
  existingAllotments,
  onSaveAllotments,
  onOpenOverride,
}) => {
  const [config, setConfig] = useState<HallEngineConfig>(DEFAULT_HALL_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<HallAllotmentResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  const currentHallAllotments = existingAllotments.filter(
    (a) => a.dutyType === 'Hall Invigilation' && a.examCycleId === activeCycle.id
  );

  const handleRunEngine = () => {
    setIsGenerating(true);
    setSaveSuccess(false);

    setTimeout(() => {
      const result = generateHallInvigilationAllotment(
        centres,
        schools,
        teachers,
        history,
        activeCycle.id,
        config
      );
      setGenerationResult(result);
      setIsGenerating(false);
    }, 250);
  };

  const handleSaveDraft = () => {
    if (!generationResult) return;
    onSaveAllotments(generationResult.allotments);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const displayList = generationResult ? generationResult.allotments : currentHallAllotments;

  return (
    <div className="space-y-4">
      {/* Engine Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-tnnavy-900 text-white rounded-2xl p-6 shadow-md border border-blue-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-800 text-blue-100 text-[11px] font-bold tracking-wide uppercase border border-blue-600">
                Module 3 · Hall Invigilation & Standby Pool
              </span>
              <span className="text-amber-300 text-xs font-semibold">{activeCycle.label}</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Hall Invigilation Engine (20 Students/Hall & 10% Standby Pool)
            </h1>
            <p className="text-xs text-blue-100/80 max-w-2xl">
              Computes halls needed (Students / 20), assigns 1 teacher per hall, reserves 10% emergency standby pool, and enforces 2-year no-repeat and &le; 10 km distance.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-blue-900/80 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl border border-blue-700 transition"
            >
              <Settings2 className="w-4 h-4 text-slate-300" />
              <span>Configure Engine</span>
            </button>

            <button
              onClick={handleRunEngine}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Allocating Invigilators...' : 'Generate Hall Allotment'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Configuration */}
        {showConfig && (
          <div className="mt-5 pt-4 border-t border-blue-700 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-black/20 p-4 rounded-xl">
            <div className="flex items-center space-x-2">
              <span>Students Per Hall:</span>
              <input
                type="number"
                value={config.studentsPerHall}
                onChange={(e) => setConfig({ ...config, studentsPerHall: parseInt(e.target.value) || 20 })}
                className="w-16 bg-blue-950 border border-blue-600 rounded px-2 py-0.5 text-center text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span>Standby Ratio:</span>
              <input
                type="number"
                step="0.05"
                value={config.standbyPercentage}
                onChange={(e) => setConfig({ ...config, standbyPercentage: parseFloat(e.target.value) || 0.1 })}
                className="w-16 bg-blue-950 border border-blue-600 rounded px-2 py-0.5 text-center text-white"
              />
              <span>(10% = 0.10)</span>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.excludeExempted}
                onChange={(e) => setConfig({ ...config, excludeExempted: e.target.checked })}
                className="rounded text-blue-500"
              />
              <span>Exclude Exempted / Medical Staff</span>
            </label>
          </div>
        )}
      </div>

      {/* Engine Stats */}
      {generationResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Total Halls Staffed</div>
              <div className="text-lg font-bold text-slate-800 mt-0.5">
                {generationResult.stats.totalAllotted - generationResult.stats.standbyCount} Halls
              </div>
              <div className="text-[10px] text-slate-500">1 invigilator per 20 students</div>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <LayoutGrid className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Standby Pool Assigned</div>
              <div className="text-lg font-bold text-amber-700 mt-0.5">
                {generationResult.stats.standbyCount} Invigilators
              </div>
              <div className="text-[10px] text-slate-500">10% emergency buffer</div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Avg Travel Distance</div>
              <div className="text-lg font-bold text-tnnavy-800 mt-0.5">
                {generationResult.stats.avgDistanceKm} km
              </div>
              <div className="text-[10px] text-slate-500">Max: {generationResult.stats.maxDistanceKm} km</div>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Total Staff Deployed</div>
              <div className="text-lg font-bold text-emerald-700 mt-0.5">
                {generationResult.stats.totalAllotted}
              </div>
              <div className="text-[10px] text-slate-500">100% capacity met</div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Table & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800">
              Hall & Standby Invigilation Roster ({displayList.length} staff)
            </h3>
            <p className="text-xs text-slate-500">
              Assigned hall numbers, centre locations, and verified distances
            </p>
          </div>

          {generationResult && (
            <button
              onClick={handleSaveDraft}
              className="flex items-center space-x-1.5 px-4 py-2 bg-tnnavy-800 text-white rounded-lg text-xs font-bold shadow hover:bg-tnnavy-900 transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Hall Allotment</span>
            </button>
          )}
        </div>

        {saveSuccess && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
            Hall invigilator allotments saved to database!
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Exam Centre</th>
                <th className="py-3 px-4 text-center">Hall / Standby</th>
                <th className="py-3 px-4">Assigned Invigilator</th>
                <th className="py-3 px-4">Designation & Subject</th>
                <th className="py-3 px-4">Parent School</th>
                <th className="py-3 px-4 text-center">Distance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No hall invigilation allotments generated yet. Click "Generate Hall Allotment" above.
                  </td>
                </tr>
              ) : (
                displayList.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {a.centreName}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {a.role === 'Standby Invigilator' ? (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-bold text-[10px]">
                          Standby Pool
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full font-bold text-[10px]">
                          Hall {a.hallNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{a.teacherName}</div>
                      <div className="text-[10px] text-slate-400">{a.teacherId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700 font-medium">{a.teacherDesignation}</div>
                      <div className="text-[11px] text-tnnavy-600 font-semibold">{a.teacherSubject}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {schoolMap.get(a.teacherSchoolId || '') || a.teacherSchoolId}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-slate-700">{a.distanceKm} km</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onOpenOverride(a)}
                        className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-semibold text-[11px] transition"
                      >
                        Swap
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
