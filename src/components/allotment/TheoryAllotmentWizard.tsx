// Theory Duty Allotment Wizard for Erode District

import React, { useState } from 'react';
import {
  ExamCentre,
  School,
  Teacher,
  DutyHistory,
  DutyAllotment,
  TheoryEngineConfig,
  ExamCycle,
} from '../../types';
import {
  generateTheoryDutyAllotment,
  DEFAULT_THEORY_CONFIG,
  TheoryAllotmentResult,
} from '../../services/engine/theoryDutyEngine';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  ShieldCheck,
  Building2,
  Save,
  FileSpreadsheet,
  FileText,
  Clock,
  MapPin,
  HelpCircle,
} from 'lucide-react';

interface TheoryAllotmentWizardProps {
  centres: ExamCentre[];
  schools: School[];
  teachers: Teacher[];
  history: DutyHistory[];
  activeCycle: ExamCycle;
  existingAllotments: DutyAllotment[];
  onSaveAllotments: (allotments: DutyAllotment[]) => void;
  onOpenOverride: (allotment: DutyAllotment) => void;
}

export const TheoryAllotmentWizard: React.FC<TheoryAllotmentWizardProps> = ({
  centres,
  schools,
  teachers,
  history,
  activeCycle,
  existingAllotments,
  onSaveAllotments,
  onOpenOverride,
}) => {
  const [config, setConfig] = useState<TheoryEngineConfig>(DEFAULT_THEORY_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<TheoryAllotmentResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  // Existing theory allotments for active cycle
  const currentTheoryAllotments = existingAllotments.filter(
    (a) => a.dutyType === 'Theory' && a.examCycleId === activeCycle.id
  );

  const handleRunEngine = () => {
    setIsGenerating(true);
    setSaveSuccess(false);

    // Give UI a micro-task tick for instant responsive feeling
    setTimeout(() => {
      const result = generateTheoryDutyAllotment(
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

  const displayList = generationResult ? generationResult.allotments : currentTheoryAllotments;

  return (
    <div className="space-y-4">
      {/* Engine Banner */}
      <div className="bg-gradient-to-r from-tnnavy-900 via-tnnavy-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-tnnavy-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-tnnavy-700 text-tnnavy-100 text-[11px] font-bold tracking-wide uppercase border border-tnnavy-500">
                Module 1 · State Board Public Exams
              </span>
              <span className="text-amber-300 text-xs font-semibold">
                {activeCycle.label}
              </span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Theory Duty Allotment Engine (HMs, Chief & Dept Officers)
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Strictly enforces HM exclusion from own/clubbed schools, 2-year no-repeat centre rule, &le; 10 km Haversine radius, and seniority fallback.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-tnnavy-800/80 hover:bg-tnnavy-700 text-white text-xs font-semibold rounded-xl border border-tnnavy-600 transition"
            >
              <Settings2 className="w-4 h-4 text-slate-300" />
              <span>Configure Rules</span>
            </button>

            <button
              onClick={handleRunEngine}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Solving Constraints...' : 'Generate Theory Allotment'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Configuration */}
        {showConfig && (
          <div className="mt-5 pt-4 border-t border-tnnavy-700 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-tnnavy-950/60 p-4 rounded-xl">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.excludeOwnSchool}
                onChange={(e) => setConfig({ ...config, excludeOwnSchool: e.target.checked })}
                className="rounded text-emerald-500"
              />
              <span>Exclude HM from Own School</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.excludeClubbedSchools}
                onChange={(e) => setConfig({ ...config, excludeClubbedSchools: e.target.checked })}
                className="rounded text-emerald-500"
              />
              <span>Exclude Clubbed Schools sharing centre</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.twoYearNoRepeat}
                onChange={(e) => setConfig({ ...config, twoYearNoRepeat: e.target.checked })}
                className="rounded text-emerald-500"
              />
              <span>2-Year No-Repeat Centre Rule</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.seniorityFallback}
                onChange={(e) => setConfig({ ...config, seniorityFallback: e.target.checked })}
                className="rounded text-emerald-500"
              />
              <span>Fallback to Senior PG by Seniority</span>
            </label>

            <div className="flex items-center space-x-2">
              <span>Max Distance:</span>
              <input
                type="number"
                value={config.maxDistanceKm}
                onChange={(e) => setConfig({ ...config, maxDistanceKm: parseInt(e.target.value) || 10 })}
                className="w-16 bg-tnnavy-900 border border-tnnavy-600 rounded px-2 py-0.5 text-center text-white"
              />
              <span>km</span>
            </div>
          </div>
        )}
      </div>

      {/* Engine Stats Breakdown */}
      {generationResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Total Required / Allotted</div>
              <div className="text-lg font-bold text-slate-800 mt-0.5">
                {generationResult.stats.totalAllotted} / {generationResult.stats.totalRequired}
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
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
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Senior PG Fallbacks</div>
              <div className="text-lg font-bold text-amber-700 mt-0.5">
                {generationResult.stats.fallbackCount}
              </div>
              <div className="text-[10px] text-slate-500">When HMs short in block</div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Rule Warnings</div>
              <div className="text-lg font-bold text-rose-600 mt-0.5">
                {generationResult.violations.length}
              </div>
              <div className="text-[10px] text-slate-500">Edge-case distance alerts</div>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Warnings Banner if any */}
      {generationResult && generationResult.violations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
          <div className="font-bold flex items-center text-amber-800">
            <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600" />
            <span>Rule Engine Diagnostics & Fallback Notifications ({generationResult.violations.length})</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800/90 pl-1">
            {generationResult.violations.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Allotment Table & Save Action */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800">
              Generated Theory Duty Allotments ({displayList.length} staff)
            </h3>
            <p className="text-xs text-slate-500">
              Chief Superintendents & Department Officers allocated across {centres.length} exam centres
            </p>
          </div>

          {generationResult && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveDraft}
                className="flex items-center space-x-1.5 px-4 py-2 bg-tnnavy-800 text-white rounded-lg text-xs font-bold shadow hover:bg-tnnavy-900 transition"
              >
                <Save className="w-4 h-4" />
                <span>Save Allotment to System</span>
              </button>
            </div>
          )}
        </div>

        {saveSuccess && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
            Theory duty allotments successfully saved to district master database!
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Exam Centre</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Allotted Teacher</th>
                <th className="py-3 px-4">Designation & Subject</th>
                <th className="py-3 px-4">Parent School</th>
                <th className="py-3 px-4 text-center">Distance</th>
                <th className="py-3 px-4 text-right">Manual Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No theory duty allotments generated yet. Click "Generate Theory Allotment" above.
                  </td>
                </tr>
              ) : (
                displayList.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{a.centreName}</div>
                      <div className="text-[11px] text-slate-400">{a.centreId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center ${
                          a.role === 'Chief Superintendent'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {a.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{a.teacherName}</div>
                      <div className="text-[11px] text-slate-400">ID: {a.teacherId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700 font-medium">{a.teacherDesignation}</div>
                      <div className="text-[11px] text-tnnavy-600 font-semibold">{a.teacherSubject}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {schoolMap.get(a.teacherSchoolId || '') || a.teacherSchoolId}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          a.distanceKm <= 10
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {a.distanceKm} km
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onOpenOverride(a)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-semibold text-[11px] transition"
                      >
                        Swap / Override
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
