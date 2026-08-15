// Top Header & Administrative Navigation for Erode District CEO Office

import React from 'react';
import { ExamCycle } from '../../types';
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
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  examCycles: ExamCycle[];
  activeCycle: ExamCycle;
  onCycleChange: (cycleId: string) => void;
  onOpenIngestion: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  examCycles,
  activeCycle,
  onCycleChange,
  onOpenIngestion,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ingest', label: 'Smart File Ingestion (Excel/PDF)', icon: UploadCloud },
    { id: 'map', label: 'GPS Coordinate Capture', icon: MapPin },
    { id: 'theory', label: 'Theory Allotment', icon: Sparkles },
    { id: 'practical', label: 'Practical Allotment', icon: FlaskConical },
    { id: 'hall', label: 'Hall Invigilation', icon: Grid },
    { id: 'schools', label: 'Schools Registry', icon: SchoolIcon },
    { id: 'centres', label: 'Exam Centres', icon: Building2 },
    { id: 'teachers', label: 'Faculty Database', icon: Users },
    { id: 'reports', label: 'Official Orders & PDF', icon: FileText },
    { id: 'audit', label: 'Audit & Cloud Backup', icon: Activity },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Topmost Official Bar */}
      <div className="bg-tnnavy-950 text-white px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-tngold-500/20 border border-tngold-400 flex items-center justify-center font-bold text-tngold-300 text-sm shadow-inner">
              🏛️
            </div>
            <div>
              <div className="font-extrabold tracking-wide text-[11px] text-slate-100 uppercase">
                GOVERNMENT OF TAMIL NADU · DEPARTMENT OF SCHOOL EDUCATION
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Chief Educational Officer (CEO), Erode District — Exam Duty Automation Portal
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Serverless Status */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Production Serverless (Rs. 0/mo)</span>
            </div>

            {/* Exam Cycle Switcher */}
            <div className="flex items-center space-x-1.5 bg-tnnavy-900 border border-tnnavy-700 px-2 py-0.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
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
              className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] transition shadow"
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
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-tnnavy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-tngold-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
