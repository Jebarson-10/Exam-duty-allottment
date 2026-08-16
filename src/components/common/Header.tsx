// Top Header & Administrative Navigation for Erode District CEO Office

import React, { useEffect, useState } from 'react';
import { ExamCycle } from '../../types';
import { db } from '../../services/db';
import { CloudStatus } from '../../services/api';
import {
  LayoutDashboard,
  UploadCloud,
  School as SchoolIcon,
  Building2,
  Users,
  MapPin,
  Sparkles,
  FlaskConical,
  Grid,
  FileText,
  Activity,
  Calendar,
  History,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  examCycles: ExamCycle[];
  activeCycle: ExamCycle;
  onCycleChange: (cycleId: string) => void;
  onOpenIngestion: () => void;
}

const STATUS_META: Record<CloudStatus, { label: string; className: string; Icon: typeof Cloud }> = {
  checking: { label: 'Connecting…', className: 'bg-slate-500/15 text-slate-300 border-slate-400/30', Icon: RefreshCw },
  online: { label: 'Cloud Synced · D1', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: Cloud },
  syncing: { label: 'Syncing to Cloud…', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30', Icon: RefreshCw },
  offline: { label: 'Local-First Mode', className: 'bg-slate-500/15 text-slate-300 border-slate-400/30', Icon: CloudOff },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  examCycles,
  activeCycle,
  onCycleChange,
  onOpenIngestion,
}) => {
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(db.cloudStatus);

  useEffect(() => db.onCloudStatusChange(setCloudStatus), []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
    { id: 'ingest', label: 'Smart File Ingestion (Excel/PDF)', icon: UploadCloud, group: 'Overview' },
    { id: 'history', label: 'Duty History Ledger', icon: History, group: 'Overview' },
    { id: 'map', label: 'GPS Coordinate Capture', icon: MapPin, group: 'Overview' },
    { id: 'theory', label: 'Theory Allotment', icon: Sparkles, group: 'Allotment Engines' },
    { id: 'practical', label: 'Practical Allotment', icon: FlaskConical, group: 'Allotment Engines' },
    { id: 'hall', label: 'Hall Invigilation', icon: Grid, group: 'Allotment Engines' },
    { id: 'schools', label: 'Schools Registry', icon: SchoolIcon, group: 'Master Registers' },
    { id: 'centres', label: 'Exam Centres', icon: Building2, group: 'Master Registers' },
    { id: 'teachers', label: 'Faculty Database', icon: Users, group: 'Master Registers' },
    { id: 'reports', label: 'Official Orders & PDF', icon: FileText, group: 'Governance' },
    { id: 'audit', label: 'Audit & Cloud Backup', icon: Activity, group: 'Governance' },
  ];
  const groups = ['Overview', 'Allotment Engines', 'Master Registers', 'Governance'];
  const status = STATUS_META[cloudStatus];
  const StatusIcon = status.Icon;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      {/* Topmost Official Bar */}
      <div className="bg-gradient-to-r from-tnnavy-950 via-tnnavy-900 to-tnnavy-950 text-white px-4 sm:px-6 py-2 relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-tngold-500/60 to-transparent" />
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-tngold-400/30 to-tngold-600/10 border border-tngold-400/40 flex items-center justify-center text-lg shadow-inner">
              🏛️
            </div>
            <div>
              <div className="font-extrabold tracking-[0.08em] text-[11px] text-slate-100 uppercase">
                Government of Tamil Nadu · Department of School Education
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Chief Educational Officer (CEO), Erode District — Exam Duty Automation Portal
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Live Backend Status */}
            <div
              title={
                cloudStatus === 'online'
                  ? 'Connected to Cloudflare D1 — all changes sync automatically'
                  : cloudStatus === 'offline'
                  ? 'No serverless backend detected — data is stored locally in this browser'
                  : cloudStatus === 'syncing'
                  ? 'Pushing district snapshot to Cloudflare D1…'
                  : 'Probing serverless backend…'
              }
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${status.className}`}
            >
              <StatusIcon className={`w-3 h-3 ${cloudStatus === 'checking' || cloudStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{status.label}</span>
            </div>

            {/* Exam Cycle Switcher */}
            <div className="flex items-center space-x-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-tngold-400" />
              <select
                value={activeCycle.id}
                onChange={(e) => onCycleChange(e.target.value)}
                className="bg-transparent text-white text-[11px] font-semibold outline-none cursor-pointer"
              >
                {examCycles.map((c) => (
                  <option key={c.id} value={c.id} className="bg-tnnavy-950 text-white">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ingest Action Button */}
            <button
              onClick={onOpenIngestion}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-b from-tngold-400 to-tngold-600 hover:from-tngold-300 hover:to-tngold-500 text-tnnavy-950 font-extrabold rounded-lg text-[11px] transition shadow-md"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Ingest Master File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none text-xs">
          {tabs.map((tab, ix) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showDivider = ix > 0 && tab.group !== tabs[ix - 1].group;
            return (
              <React.Fragment key={tab.id}>
                {showDivider && (
                  <div className="w-px my-2 bg-slate-200 shrink-0" />
                )}
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-tnnavy-900 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-tngold-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
