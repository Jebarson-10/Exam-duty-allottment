// Erode CEO Office Exam Duty Allotment System — Main Application Root

import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import {
  School,
  ExamCentre,
  Teacher,
  Block,
  DutyHistory,
  ExamCycle,
  DutyAllotment,
  PracticalBatch,
  AuditLog,
} from './types';
import { Header } from './components/common/Header';
import { useI18n } from './i18n';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { UniversalDataIngestionView } from './components/master/UniversalDataIngestionView';
import { DutyHistoryManager } from './components/history/DutyHistoryManager';
import { DistrictMap } from './components/map/DistrictMap';
import { TheoryAllotmentWizard } from './components/allotment/TheoryAllotmentWizard';
import { PracticalAllotmentWizard } from './components/allotment/PracticalAllotmentWizard';
import { HallAllotmentWizard } from './components/allotment/HallAllotmentWizard';
import { SchoolsManager } from './components/master/SchoolsManager';
import { CentresManager } from './components/master/CentresManager';
import { TeachersManager } from './components/master/TeachersManager';
import { OfficialReportView } from './components/reports/OfficialReportView';
import { AuditAndBackupView } from './components/audit/AuditAndBackupView';
import { ManualOverrideModal } from './components/override/ManualOverrideModal';

export function App() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [ready, setReady] = useState<boolean>(false);

  // Master State
  const [schools, setSchools] = useState<School[]>([]);
  const [centres, setCentres] = useState<ExamCentre[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dutyHistory, setDutyHistory] = useState<DutyHistory[]>([]);
  const [examCycles, setExamCycles] = useState<ExamCycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<ExamCycle | null>(null);
  const [allotments, setAllotments] = useState<DutyAllotment[]>([]);
  const [batches, setBatches] = useState<PracticalBatch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modal State
  const [overrideAllotment, setOverrideAllotment] = useState<DutyAllotment | null>(null);

  // Load database on mount
  const refreshData = () => {
    setBlocks(db.getBlocks());
    setSchools(db.getSchools());
    setCentres(db.getCentres());
    setTeachers(db.getTeachers());
    setDutyHistory(db.getDutyHistory());
    setExamCycles(db.getExamCycles());
    setActiveCycle(db.getActiveExamCycle());
    setAllotments(db.getAllotments());
    setBatches(db.getPracticalBatches());
    setAuditLogs(db.getAuditLogs());
  };

  useEffect(() => {
    let cancelled = false;
    // Probe the serverless backend (D1) and hydrate the local cache, then render.
    void db.initialize().then(() => {
      if (!cancelled) {
        refreshData();
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-tnnavy-800 to-tnnavy-950 flex items-center justify-center text-2xl shadow-lg">
          🏛️
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-slate-800">Erode District Exam Duty Portal</div>
          <div className="text-xs text-slate-500 mt-1">{t('dash.loading')}</div>
        </div>
        <div className="w-40 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-tnnavy-600 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!activeCycle) {
    return <div className="p-8 text-center text-sm font-semibold">Loading Erode District Master Database...</div>;
  }

  // --- Handlers ---
  const handleCycleChange = (cycleId: string) => {
    db.setActiveExamCycle(cycleId);
    refreshData();
  };

  const handleSaveSchool = (school: School) => {
    db.saveSchool(school);
    refreshData();
  };

  const handleDeleteSchool = (id: string) => {
    if (window.confirm(`Delete school record ${id}?`)) {
      db.deleteSchool(id);
      refreshData();
    }
  };

  const handleSaveCentre = (centre: ExamCentre) => {
    db.saveCentre(centre);
    refreshData();
  };

  const handleDeleteCentre = (id: string) => {
    if (window.confirm(`Delete examination centre ${id}?`)) {
      db.deleteCentre(id);
      refreshData();
    }
  };

  const handleSaveTeacher = (teacher: Teacher) => {
    db.saveTeacher(teacher);
    refreshData();
  };

  const handleDeleteTeacher = (id: string) => {
    if (window.confirm(`Delete faculty member ${id}?`)) {
      db.deleteTeacher(id);
      refreshData();
    }
  };

  const handleUpdateSchoolCoords = (schoolId: string, lat: number, lng: number) => {
    const school = schools.find((s) => s.id === schoolId);
    if (school) {
      db.saveSchool({ ...school, lat, lng });
      refreshData();
    }
  };

  const handleUpdateCentreCoords = (centreId: string, lat: number, lng: number) => {
    const centre = centres.find((c) => c.id === centreId);
    if (centre) {
      db.saveCentre({ ...centre, lat, lng });
      refreshData();
    }
  };

  const handleBatchUpdateSchools = (updatedSchools: School[]) => {
    db.batchSaveSchools(updatedSchools);
    refreshData();
  };

  const handleBatchUpdateCentres = (updatedCentres: ExamCentre[]) => {
    db.batchSaveCentres(updatedCentres);
    refreshData();
  };

  const handleSaveTheoryAllotments = (newAllotments: DutyAllotment[]) => {
    db.saveAllotments(newAllotments, 'Theory', activeCycle.id);
    refreshData();
  };

  const handleSavePracticalAllotments = (
    newAllotments: DutyAllotment[],
    newBatches: PracticalBatch[]
  ) => {
    db.saveAllotments(newAllotments, 'Practical', activeCycle.id);
    db.savePracticalBatches(newBatches, activeCycle.id);
    refreshData();
  };

  const handleSaveHallAllotments = (newAllotments: DutyAllotment[]) => {
    db.saveAllotments(newAllotments, 'Hall Invigilation', activeCycle.id);
    refreshData();
  };

  const handleCommitOverride = (updated: DutyAllotment) => {
    db.updateSingleAllotment(updated);
    refreshData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Official Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        examCycles={examCycles}
        activeCycle={activeCycle}
        onCycleChange={handleCycleChange}
        onOpenIngestion={() => setActiveTab('ingest')}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            schools={schools}
            centres={centres}
            teachers={teachers}
            blocks={blocks}
            allotments={allotments}
            activeCycle={activeCycle}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'ingest' && (
          <UniversalDataIngestionView
            blocks={blocks}
            onDataIngested={refreshData}
            onNavigateToMap={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'history' && (
          <DutyHistoryManager
            history={dutyHistory}
            teachers={teachers}
            centres={centres}
            activeCycle={activeCycle}
            onHistoryUpdated={refreshData}
          />
        )}

        {activeTab === 'map' && (
          <DistrictMap
            schools={schools}
            centres={centres}
            blocks={blocks}
            onUpdateSchoolCoords={handleUpdateSchoolCoords}
            onUpdateCentreCoords={handleUpdateCentreCoords}
            onBatchUpdateSchools={handleBatchUpdateSchools}
            onBatchUpdateCentres={handleBatchUpdateCentres}
          />
        )}

        {activeTab === 'theory' && (
          <TheoryAllotmentWizard
            centres={centres}
            schools={schools}
            teachers={teachers}
            history={dutyHistory}
            activeCycle={activeCycle}
            existingAllotments={allotments}
            onSaveAllotments={handleSaveTheoryAllotments}
            onOpenOverride={(a) => setOverrideAllotment(a)}
          />
        )}

        {activeTab === 'practical' && (
          <PracticalAllotmentWizard
            schools={schools}
            teachers={teachers}
            history={dutyHistory}
            activeCycle={activeCycle}
            existingAllotments={allotments}
            existingBatches={batches}
            onSaveAllotments={handleSavePracticalAllotments}
            onOpenOverride={(a) => setOverrideAllotment(a)}
          />
        )}

        {activeTab === 'hall' && (
          <HallAllotmentWizard
            centres={centres}
            schools={schools}
            teachers={teachers}
            history={dutyHistory}
            activeCycle={activeCycle}
            existingAllotments={allotments}
            onSaveAllotments={handleSaveHallAllotments}
            onOpenOverride={(a) => setOverrideAllotment(a)}
          />
        )}

        {activeTab === 'schools' && (
          <SchoolsManager
            schools={schools}
            blocks={blocks}
            onSaveSchool={handleSaveSchool}
            onDeleteSchool={handleDeleteSchool}
          />
        )}

        {activeTab === 'centres' && (
          <CentresManager
            centres={centres}
            schools={schools}
            blocks={blocks}
            onSaveCentre={handleSaveCentre}
            onDeleteCentre={handleDeleteCentre}
          />
        )}

        {activeTab === 'teachers' && (
          <TeachersManager
            teachers={teachers}
            schools={schools}
            onSaveTeacher={handleSaveTeacher}
            onDeleteTeacher={handleDeleteTeacher}
          />
        )}

        {activeTab === 'reports' && (
          <OfficialReportView
            allotments={allotments}
            schools={schools}
            centres={centres}
            teachers={teachers}
            activeCycle={activeCycle}
          />
        )}

        {activeTab === 'audit' && (
          <AuditAndBackupView
            auditLogs={auditLogs}
            onDataResetOrRestored={refreshData}
          />
        )}
      </main>

      {/* Manual Override & Conflict Modal */}
      {overrideAllotment && (
        <ManualOverrideModal
          isOpen={!!overrideAllotment}
          onClose={() => setOverrideAllotment(null)}
          allotment={overrideAllotment}
          teachers={teachers}
          centres={centres}
          schools={schools}
          history={dutyHistory}
          allAllotments={allotments}
          onCommitOverride={handleCommitOverride}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-tngold-500"></span>
            <span>{t('footer.line')}</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span>Serverless: Cloudflare Pages + D1 (SQLite) + R2</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>{t('footer.cost')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
