// Dashboard Overview for Erode District CEO Office Exam Duty Portal

import React from 'react';
import {
  School,
  ExamCentre,
  Teacher,
  DutyAllotment,
  ExamCycle,
  Block,
} from '../../types';
import {
  School as SchoolIcon,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Calendar,
  Sparkles,
  Award,
  Layers,
} from 'lucide-react';

interface DashboardOverviewProps {
  schools: School[];
  centres: ExamCentre[];
  teachers: Teacher[];
  blocks: Block[];
  allotments: DutyAllotment[];
  activeCycle: ExamCycle;
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  schools,
  centres,
  teachers,
  blocks,
  allotments,
  activeCycle,
  onNavigateTab,
}) => {
  const activeTeachers = teachers.filter((t) => !t.isExempted);
  const exemptedTeachers = teachers.filter((t) => t.isExempted);

  const cycleAllotments = allotments.filter((a) => a.examCycleId === activeCycle.id);
  const theoryAllotments = cycleAllotments.filter((a) => a.dutyType === 'Theory');
  const practicalAllotments = cycleAllotments.filter((a) => a.dutyType === 'Practical');
  const hallAllotments = cycleAllotments.filter((a) => a.dutyType === 'Hall Invigilation');

  // Theory required = 2 per centre (1 Chief + 1 Dept Officer)
  const theoryRequired = centres.length * 2;
  const theoryPercent = Math.min(100, Math.round((theoryAllotments.length / (theoryRequired || 1)) * 100));

  // Distance compliance (% <= 10 km)
  const compliantDistanceCount = cycleAllotments.filter((a) => a.distanceKm <= 10).length;
  const distanceCompliancePercent =
    cycleAllotments.length > 0
      ? Math.round((compliantDistanceCount / cycleAllotments.length) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-tnnavy-950 via-tnnavy-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-tnnavy-800">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-tngold-500/20 border border-tngold-500/40 text-tngold-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-tngold-400" />
              <span>Erode CEO Office Examination Command Center</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              State Board Public Examinations Duty Allotment System
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Automating Theory Duty (HMs/Chief/DO), Practical Laboratories, and Hall Invigilation across {blocks.length} Educational Blocks with strict &le; 10 km distance, 2-year no-repeat, and equitable fairness rules.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 text-xs space-y-1.5 min-w-[220px]">
            <div className="text-slate-300 font-medium">Active Exam Cycle:</div>
            <div className="text-sm font-extrabold text-amber-300">{activeCycle.label}</div>
            <div className="text-[11px] text-slate-400 flex items-center pt-1 border-t border-white/10">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              <span>{activeCycle.startDate} to {activeCycle.endDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Exam Centres</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{centres.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {blocks.length} blocks</div>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Schools Master</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{schools.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Govt & Aided HSS</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <SchoolIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Faculty Pool</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{activeTeachers.length}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {exemptedTeachers.length} staff exempted
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Distance Compliance</div>
            <div className="text-2xl font-black text-tnnavy-800 mt-1">{distanceCompliancePercent}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Within 10 km limit</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Engine Workspaces Quick Launcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Theory Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-tnnavy-400 transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold uppercase">
              Module 1
            </span>
            <span className="text-xs font-bold text-slate-600">{theoryAllotments.length} Allotted</span>
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-800">Theory Duty Engine</h3>
            <p className="text-xs text-slate-500 mt-1">
              Chief Superintendents & Department Officers with HM own-school exclusions and seniority fallback.
            </p>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${theoryPercent}%` }}
            ></div>
          </div>

          <button
            onClick={() => onNavigateTab('theory')}
            className="w-full py-2 bg-slate-50 hover:bg-tnnavy-800 hover:text-white text-tnnavy-900 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition border border-slate-200"
          >
            <span>Launch Theory Wizard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Practical Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-emerald-400 transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
              Module 2
            </span>
            <span className="text-xs font-bold text-slate-600">{practicalAllotments.length} Examiners</span>
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-800">Practical Duty Engine</h3>
            <p className="text-xs text-slate-500 mt-1">
              50-student batch splits, parallel FN/AN sessions, and automatic paired role swapping.
            </p>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{ width: practicalAllotments.length > 0 ? '100%' : '0%' }}
            ></div>
          </div>

          <button
            onClick={() => onNavigateTab('practical')}
            className="w-full py-2 bg-slate-50 hover:bg-emerald-700 hover:text-white text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition border border-slate-200"
          >
            <span>Launch Practical Wizard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hall Invigilation Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-blue-400 transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold uppercase">
              Module 3
            </span>
            <span className="text-xs font-bold text-slate-600">{hallAllotments.length} Staff</span>
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-800">Hall Invigilation Engine</h3>
            <p className="text-xs text-slate-500 mt-1">
              1 invigilator per 20 students + 10% standby pool with 2-year no-repeat and exemption filters.
            </p>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: hallAllotments.length > 0 ? '100%' : '0%' }}
            ></div>
          </div>

          <button
            onClick={() => onNavigateTab('hall')}
            className="w-full py-2 bg-slate-50 hover:bg-blue-700 hover:text-white text-blue-900 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition border border-slate-200"
          >
            <span>Launch Hall Wizard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
