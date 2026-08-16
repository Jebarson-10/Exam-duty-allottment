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
import { useI18n } from '../../i18n';
import {
  School as SchoolIcon,
  Building2,
  Users,
  UploadCloud,
  ArrowRight,
  MapPin,
  Calendar,
  Sparkles,
  Layers,
  AlertCircle,
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
  const { t } = useI18n();
  const activeTeachers = teachers.filter((t) => !t.isExempted);
  const exemptedTeachers = teachers.filter((t) => t.isExempted);

  const cycleAllotments = allotments.filter((a) => a.examCycleId === activeCycle.id);
  const theoryAllotments = cycleAllotments.filter((a) => a.dutyType === 'Theory');
  const practicalAllotments = cycleAllotments.filter((a) => a.dutyType === 'Practical');
  const hallAllotments = cycleAllotments.filter((a) => a.dutyType === 'Hall Invigilation');

  // Theory required = 2 per centre (1 Chief + 1 Dept Officer)
  const theoryRequired = centres.length * 2;
  const theoryPercent = centres.length > 0
    ? Math.min(100, Math.round((theoryAllotments.length / (theoryRequired || 1)) * 100))
    : 0;

  // Distance compliance (% <= 10 km)
  const compliantDistanceCount = cycleAllotments.filter((a) => a.distanceKm <= 10).length;
  const distanceCompliancePercent =
    cycleAllotments.length > 0
      ? Math.round((compliantDistanceCount / cycleAllotments.length) * 100)
      : 100;

  const isDatabaseEmpty = schools.length === 0 && centres.length === 0 && teachers.length === 0;

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-tnnavy-950 via-tnnavy-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-tnnavy-800">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-tngold-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-tngold-500/20 border border-tngold-500/40 text-tngold-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-tngold-400" />
              <span>{t('dash.badge')}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t('dash.h1')}
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('dash.para', { blocks: blocks.length })}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 text-xs space-y-1.5 min-w-[220px]">
            <div className="text-slate-300 font-medium">{t('dash.activeCycle')}</div>
            <div className="text-sm font-extrabold text-amber-300">{activeCycle.label}</div>
            <div className="text-[11px] text-slate-400 flex items-center pt-1 border-t border-white/10">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              <span>{activeCycle.startDate} {t('dash.to')} {activeCycle.endDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty Database Prompt if fresh installation */}
      {isDatabaseEmpty && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
              <UploadCloud className="w-5 h-5 text-emerald-600" />
              <span>Ready for Master Data Ingestion</span>
            </div>
            <p className="text-xs text-emerald-800 max-w-2xl">
              Upload your district's official Excel spreadsheets (.xlsx, .xls, .csv) or official circular PDF files. The system will automatically map headers, parse teacher and school records, and <strong>geolocate them on OpenStreetMap automatically</strong>.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('ingest')}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{t('dash.emptyBtn')}</span>
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('dash.centres')}</div>
            <div className="text-3xl font-black text-slate-800 mt-1 tabular-nums">{centres.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{t('dash.centresSub', { blocks: blocks.length })}</div>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/15 to-red-600/5 text-red-600 border border-red-100">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('dash.schools')}</div>
            <div className="text-3xl font-black text-slate-800 mt-1 tabular-nums">{schools.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{t('dash.schoolsSub')}</div>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 text-blue-600 border border-blue-100">
            <SchoolIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('dash.faculty')}</div>
            <div className="text-3xl font-black text-slate-800 mt-1 tabular-nums">{activeTeachers.length}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {t('dash.exempted', { n: exemptedTeachers.length })}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 text-emerald-600 border border-emerald-100">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('dash.compliance')}</div>
            <div className="text-3xl font-black text-tnnavy-800 mt-1 tabular-nums">{distanceCompliancePercent}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{t('dash.within10')}</div>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/15 to-indigo-600/5 text-indigo-600 border border-indigo-100">
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
              {t('dash.module', { n: 1 })}
            </span>
            <span className="text-xs font-bold text-slate-600">{t('dash.allotted', { n: theoryAllotments.length })}</span>
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-800">Theory Duty Engine</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('dash.theoryDesc')}
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
            <span>{t('dash.launchTheory')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Practical Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-emerald-400 transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
              {t('dash.module', { n: 2 })}
            </span>
            <span className="text-xs font-bold text-slate-600">{t('dash.examiners', { n: practicalAllotments.length })}</span>
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-800">Practical Duty Engine</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('dash.practicalDesc')}
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
            <span>{t('dash.launchPractical')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hall Invigilation Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-blue-400 transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold uppercase">
              {t('dash.module', { n: 3 })}
            </span>
            <span className="text-xs font-bold text-slate-600">{t('dash.staff', { n: hallAllotments.length })}</span>
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-800">Hall Invigilation Engine</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('dash.hallDesc')}
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
            <span>{t('dash.launchHall')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
