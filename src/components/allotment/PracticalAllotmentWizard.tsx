// Practical Duty Allotment Wizard for Erode District

import React, { useState } from 'react';
import {
  School,
  Teacher,
  DutyHistory,
  DutyAllotment,
  PracticalBatch,
  PracticalEngineConfig,
  ExamCycle,
} from '../../types';
import {
  generatePracticalDutyAllotment,
  DEFAULT_PRACTICAL_CONFIG,
  PracticalAllotmentResult,
} from '../../services/engine/practicalDutyEngine';
import {
  FlaskConical,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  ArrowLeftRight,
  Save,
  Clock,
  Layers,
  MapPin,
} from 'lucide-react';

interface PracticalAllotmentWizardProps {
  schools: School[];
  teachers: Teacher[];
  history: DutyHistory[];
  activeCycle: ExamCycle;
  existingAllotments: DutyAllotment[];
  existingBatches: PracticalBatch[];
  onSaveAllotments: (allotments: DutyAllotment[], batches: PracticalBatch[]) => void;
  onOpenOverride: (allotment: DutyAllotment) => void;
}

export const PracticalAllotmentWizard: React.FC<PracticalAllotmentWizardProps> = ({
  schools,
  teachers,
  history,
  activeCycle,
  existingAllotments,
  existingBatches,
  onSaveAllotments,
  onOpenOverride,
}) => {
  const [config, setConfig] = useState<PracticalEngineConfig>(DEFAULT_PRACTICAL_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<PracticalAllotmentResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  const currentPracticalAllotments = existingAllotments.filter(
    (a) => a.dutyType === 'Practical' && a.examCycleId === activeCycle.id
  );

  const handleRunEngine = () => {
    setIsGenerating(true);
    setSaveSuccess(false);

    setTimeout(() => {
      const result = generatePracticalDutyAllotment(
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
    onSaveAllotments(generationResult.allotments, generationResult.batches);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const displayList = generationResult ? generationResult.allotments : currentPracticalAllotments;

  return (
    <div className="space-y-4">
      {/* Engine Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-tnnavy-900 text-white rounded-2xl p-6 shadow-md border border-teal-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-100 text-[11px] font-bold tracking-wide uppercase border border-emerald-600">
                Module 2 · Practical Examinations
              </span>
              <span className="text-amber-300 text-xs font-semibold">{activeCycle.label}</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Practical Duty Engine (Batches, FN/AN & Paired Role Swapping)
            </h1>
            <p className="text-xs text-emerald-100/80 max-w-2xl">
              Partitions science students into 50-student batches across Physics, Chemistry, Biology, CS; pairs Internal + External examiners; and swaps roles year-over-year.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-teal-800/80 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl border border-teal-600 transition"
            >
              <Settings2 className="w-4 h-4 text-slate-300" />
              <span>Configure Engine</span>
            </button>

            <button
              onClick={handleRunEngine}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Splitting Batches & Pairing...' : 'Generate Practical Allotment'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Configuration */}
        {showConfig && (
          <div className="mt-5 pt-4 border-t border-teal-700 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-black/20 p-4 rounded-xl">
            <div className="flex items-center space-x-2">
              <span>Standard Batch Size:</span>
              <input
                type="number"
                value={config.batchSize}
                onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) || 50 })}
                className="w-16 bg-teal-950 border border-teal-600 rounded px-2 py-0.5 text-center text-white"
              />
              <span>Students</span>
            </div>

            <div className="flex items-center space-x-2">
              <span>Max Window / School:</span>
              <input
                type="number"
                value={config.maxDaysPerSchool}
                onChange={(e) => setConfig({ ...config, maxDaysPerSchool: parseInt(e.target.value) || 3 })}
                className="w-16 bg-teal-950 border border-teal-600 rounded px-2 py-0.5 text-center text-white"
              />
              <span>Days</span>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.roleSwapEnforced}
                onChange={(e) => setConfig({ ...config, roleSwapEnforced: e.target.checked })}
                className="rounded text-emerald-500"
              />
              <span>Enforce Year-over-Year Role Swap</span>
            </label>
          </div>
        )}
      </div>

      {/* Engine Stats */}
      {generationResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Practical Batches Formed</div>
              <div className="text-lg font-bold text-slate-800 mt-0.5">
                {generationResult.batches.length} Batches
              </div>
              <div className="text-[10px] text-slate-500">Across 6 practical subjects</div>
            </div>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Examiners Deployed</div>
              <div className="text-lg font-bold text-emerald-700 mt-0.5">
                {generationResult.stats.totalAllotted} Roles
              </div>
              <div className="text-[10px] text-slate-500">Internal + External pairs</div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">External Travel Radius</div>
              <div className="text-lg font-bold text-tnnavy-800 mt-0.5">
                {generationResult.stats.avgDistanceKm} km
              </div>
              <div className="text-[10px] text-slate-500">Avg external commute</div>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Unassigned Batches</div>
              <div className="text-lg font-bold text-rose-600 mt-0.5">
                {generationResult.unassignedBatches.length}
              </div>
              <div className="text-[10px] text-slate-500">Missing external faculty</div>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Table & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800">
              Practical Examiner Deployment Schedule ({displayList.length} assignments)
            </h3>
            <p className="text-xs text-slate-500">
              Parallel FN/AN laboratory sessions with verified subject qualifications
            </p>
          </div>

          {generationResult && (
            <button
              onClick={handleSaveDraft}
              className="flex items-center space-x-1.5 px-4 py-2 bg-tnnavy-800 text-white rounded-lg text-xs font-bold shadow hover:bg-tnnavy-900 transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Practical Schedule</span>
            </button>
          )}
        </div>

        {saveSuccess && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
            Practical batches and examiner schedule saved to database!
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Examination Lab (School)</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Examiner Name</th>
                <th className="py-3 px-4">Parent Institution</th>
                <th className="py-3 px-4 text-center">Session</th>
                <th className="py-3 px-4 text-center">Distance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No practical allotments generated yet. Click "Generate Practical Allotment" above.
                  </td>
                </tr>
              ) : (
                displayList.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {a.centreName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-tnnavy-700 bg-tnnavy-50 px-2 py-0.5 rounded border border-tnnavy-200 text-[11px]">
                        {a.subject}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.role === 'Internal Examiner'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {a.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{a.teacherName}</div>
                      <div className="text-[10px] text-slate-400">{a.teacherDesignation}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {schoolMap.get(a.teacherSchoolId || '') || a.teacherSchoolId}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[11px]">
                        {a.session || 'FN'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-slate-600">{a.distanceKm} km</span>
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
