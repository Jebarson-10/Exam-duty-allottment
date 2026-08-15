// Audit Trail, Cloudflare Zero-Cost Monitor & Backup / Restore System

import React, { useState } from 'react';
import { AuditLog } from '../../types';
import { db } from '../../services/db';
import {
  Database,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  Cloud,
  Activity,
} from 'lucide-react';

interface AuditAndBackupViewProps {
  auditLogs: AuditLog[];
  onDataResetOrRestored: () => void;
}

export const AuditAndBackupView: React.FC<AuditAndBackupViewProps> = ({
  auditLogs,
  onDataResetOrRestored,
}) => {
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  const handleDownloadBackup = () => {
    const jsonStr = db.createBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Erode_CEO_Exam_Database_Snapshot_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg({ success: true, text: 'District Master Database Snapshot downloaded successfully!' });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = db.restoreFromJSON(content);
      if (res.success) {
        setStatusMsg({ success: true, text: res.message });
        onDataResetOrRestored();
      } else {
        setStatusMsg({ success: false, text: res.message });
      }
    };
    reader.readAsText(file);
  };

  const handleClearDatabase = () => {
    if (window.confirm('CAUTION: Are you sure you want to clear all school, centre, teacher, and allotment tables? This is irreversible unless you have a snapshot backup.')) {
      db.clearAllData();
      setStatusMsg({ success: true, text: 'Database master tables cleared successfully.' });
      onDataResetOrRestored();
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cloudflare Zero-Cost Headroom Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-tnnavy-950 to-slate-900 text-white rounded-2xl p-5 border border-slate-700 shadow-sm">
        <div className="flex items-center space-x-2.5 mb-3">
          <Cloud className="w-5 h-5 text-sky-400" />
          <h2 className="text-sm font-bold tracking-wide">
            Cloudflare Serverless Infrastructure & Free Tier Ceiling Monitor
          </h2>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
            Target Cost: Rs. 0 / month (Indefinitely)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-slate-400 text-[11px] font-medium">Cloudflare D1 Storage</div>
            <div className="text-base font-bold text-sky-300 mt-0.5">Active / 5.0 GB</div>
            <div className="text-[10px] text-emerald-400 mt-1">&lt; 0.1% of Free Ceiling</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-slate-400 text-[11px] font-medium">D1 Daily DB Reads</div>
            <div className="text-base font-bold text-sky-300 mt-0.5">Active / 5,000,000</div>
            <div className="text-[10px] text-emerald-400 mt-1">&lt; 0.01% of Free Ceiling</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-slate-400 text-[11px] font-medium">D1 Daily DB Writes</div>
            <div className="text-base font-bold text-sky-300 mt-0.5">Active / 100,000</div>
            <div className="text-[10px] text-emerald-400 mt-1">&lt; 0.1% of Free Ceiling</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-slate-400 text-[11px] font-medium">R2 Backup Storage</div>
            <div className="text-base font-bold text-sky-300 mt-0.5">Snapshots / 10.0 GB</div>
            <div className="text-[10px] text-emerald-400 mt-1">Zero Egress Fees</div>
          </div>
        </div>
      </div>

      {/* Backup & Snapshot Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Database Snapshots & Disaster Recovery</h3>
              <p className="text-xs text-slate-500">
                Download verified full-district JSON snapshots for Cloudflare R2 backup archiving or offline migration
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadBackup}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-tnnavy-800 text-white rounded-lg text-xs font-bold hover:bg-tnnavy-900 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Full Snapshot</span>
            </button>

            <label className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <span>Restore from Snapshot</span>
              <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
            </label>

            <button
              onClick={handleClearDatabase}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Database Tables</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-lg flex items-center text-xs font-bold ${
              statusMsg.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {statusMsg.text}
          </div>
        )}
      </div>

      {/* Audit Logs Trail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-tnnavy-700" />
            <h3 className="font-bold text-sm text-slate-800">
              System Audit Trail Log ({auditLogs.length} events logged)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Immutable Action Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User / Operator</th>
                <th className="py-3 px-4">Action Code</th>
                <th className="py-3 px-4">Event Details & Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-4 text-tnnavy-800 font-semibold">
                    {log.userEmail}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans text-xs">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
