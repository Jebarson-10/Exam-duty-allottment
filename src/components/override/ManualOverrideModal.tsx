// Manual Override & Conflict Auditor Modal for Erode District

import React, { useState, useEffect } from 'react';
import {
  DutyAllotment,
  Teacher,
  ExamCentre,
  School,
  DutyHistory,
  RuleViolation,
} from '../../types';
import { evaluateTeacherCentreDistance } from '../../services/engine/haversine';
import {
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  MapPin,
  Building2,
  FileEdit,
  Info,
} from 'lucide-react';

interface ManualOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  allotment: DutyAllotment | null;
  teachers: Teacher[];
  centres: ExamCentre[];
  schools: School[];
  history: DutyHistory[];
  allAllotments: DutyAllotment[];
  onCommitOverride: (updatedAllotment: DutyAllotment) => void;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  isOpen,
  onClose,
  allotment,
  teachers,
  centres,
  schools,
  history,
  allAllotments,
  onCommitOverride,
}) => {
  if (!isOpen || !allotment) return null;

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(allotment.teacherId);
  const [overrideReason, setOverrideReason] = useState<string>(allotment.overrideReason || '');
  const [liveViolations, setLiveViolations] = useState<RuleViolation[]>([]);
  const [candidateDistance, setCandidateDistance] = useState<number>(allotment.distanceKm);

  const centre = centres.find((c) => c.id === allotment.centreId);
  const currentTeacher = teachers.find((t) => t.id === allotment.teacherId);
  const candidateTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  // Re-run real-time conflict detector whenever selected teacher changes
  useEffect(() => {
    if (!candidateTeacher || !centre) return;

    const violations: RuleViolation[] = [];
    const teacherSchool = schools.find((s) => s.id === candidateTeacher.schoolId);
    const schoolCoords = teacherSchool
      ? { lat: teacherSchool.lat, lng: teacherSchool.lng }
      : { lat: 11.3418, lng: 77.7212 };
    const homeCoords =
      candidateTeacher.homeLat && candidateTeacher.homeLng
        ? { lat: candidateTeacher.homeLat, lng: candidateTeacher.homeLng }
        : null;

    // 1. Distance evaluation
    const distRes = evaluateTeacherCentreDistance(
      schoolCoords,
      { lat: centre.lat, lng: centre.lng },
      homeCoords,
      10
    );
    setCandidateDistance(distRes.minDistanceKm);

    if (!distRes.isWithinDistance) {
      violations.push({
        code: 'DISTANCE_VIOLATION',
        severity: 'warning',
        message: `Distance Warning: Teacher is ${distRes.minDistanceKm} km from centre (exceeds standard 10 km limit).`,
        distanceKm: distRes.minDistanceKm,
      });
    }

    // 2. Own school / clubbed school evaluation
    if (allotment.dutyType !== 'Practical') {
      const excludedIds = new Set<string>();
      if (centre.schoolId) excludedIds.add(centre.schoolId);
      if (centre.clubbedSchoolIds) centre.clubbedSchoolIds.forEach((id) => excludedIds.add(id));

      if (excludedIds.has(candidateTeacher.schoolId)) {
        violations.push({
          code: 'OWN_SCHOOL_VIOLATION',
          severity: 'error',
          message: `Rule Violation: Teacher belongs to own or clubbed school for this centre!`,
        });
      }
    }

    // 3. Exemption check
    if (candidateTeacher.isExempted) {
      violations.push({
        code: 'EXEMPTED_STAFF',
        severity: 'error',
        message: `Exemption Conflict: Staff is flagged as exempted (${candidateTeacher.exemptionReason || 'Medical reason'}).`,
      });
    }

    // 4. 2-Year Repeat Check
    const currentYear = new Date().getFullYear();
    const servedRecently = history.some(
      (h) =>
        h.teacherId === candidateTeacher.id &&
        h.centreId === centre.id &&
        h.year >= currentYear - 2
    );
    if (servedRecently) {
      violations.push({
        code: 'REPEAT_CENTRE_2YEAR',
        severity: 'warning',
        message: `2-Year Rule Warning: Staff served at this same centre in the last 2 years.`,
      });
    }

    // 5. Double Booking Check
    const otherDuties = allAllotments.filter(
      (a) => a.teacherId === candidateTeacher.id && a.id !== allotment.id
    );
    if (otherDuties.length > 0) {
      violations.push({
        code: 'DOUBLE_BOOKING',
        severity: 'error',
        message: `Double Booking Alert: Teacher is already assigned to ${otherDuties.length} other duty (${otherDuties.map((d) => d.role).join(', ')}).`,
      });
    }

    setLiveViolations(violations);
  }, [selectedTeacherId, allotment, centre, candidateTeacher, schools, history, allAllotments]);

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateTeacher || !centre) return;

    const updated: DutyAllotment = {
      ...allotment,
      teacherId: candidateTeacher.id,
      teacherName: candidateTeacher.name,
      teacherDesignation: candidateTeacher.designation,
      teacherSubject: candidateTeacher.subject,
      teacherSchoolId: candidateTeacher.schoolId,
      distanceKm: candidateDistance,
      isManualOverride: true,
      overrideReason: overrideReason || 'Administrative reassignment by CEO Office',
      updatedAt: new Date().toISOString(),
    };

    onCommitOverride(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-tnnavy-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">Manual Override & Conflict Inspector</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold">
            &times;
          </button>
        </div>

        <form onSubmit={handleSaveOverride} className="p-5 space-y-4 text-xs">
          {/* Target Duty Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center">
                <Building2 className="w-4 h-4 mr-1 text-tnnavy-700" />
                {allotment.centreName}
              </span>
              <span className="px-2 py-0.5 bg-tnnavy-100 text-tnnavy-800 rounded font-extrabold text-[10px] uppercase">
                {allotment.role}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Duty Type: <span className="font-semibold text-slate-700">{allotment.dutyType}</span> | Session: <span className="font-semibold text-slate-700">{allotment.session || 'Full Day'}</span>
            </div>
          </div>

          {/* Teacher Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Select Replacement Faculty Member:
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-tnnavy-500"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.designation} - {t.subject}) | {schoolMap.get(t.schoolId)?.slice(0, 25)}... {t.isExempted ? '[EXEMPTED]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Candidate Info Card */}
          {candidateTeacher && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-1.5">
              <div className="font-bold text-blue-900">{candidateTeacher.name}</div>
              <div className="text-[11px] text-blue-800 grid grid-cols-2 gap-2">
                <div><span className="font-semibold">Designation:</span> {candidateTeacher.designation} ({candidateTeacher.subject})</div>
                <div><span className="font-semibold">Seniority:</span> #{candidateTeacher.seniorityRank}</div>
                <div><span className="font-semibold">School:</span> {schoolMap.get(candidateTeacher.schoolId)}</div>
                <div><span className="font-semibold">Travel Distance:</span> {candidateDistance} km</div>
              </div>
            </div>
          )}

          {/* Real-time Conflict Alert Box */}
          {liveViolations.length > 0 ? (
            <div className="space-y-1.5">
              <div className="font-bold text-[11px] uppercase tracking-wider text-rose-700 flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Live Rule Violations / Diagnostics ({liveViolations.length})
              </div>
              <div className="space-y-1">
                {liveViolations.map((v, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-[11px] flex items-start space-x-1.5 ${
                      v.severity === 'error'
                        ? 'bg-rose-50 border border-rose-200 text-rose-800 font-semibold'
                        : 'bg-amber-50 border border-amber-200 text-amber-800'
                    }`}
                  >
                    {v.severity === 'error' ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <span>{v.message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
              <span>All administrative rules & distance constraints fully satisfied!</span>
            </div>
          )}

          {/* Justification / Reason */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Override Justification / Administrative Order Reference (Mandatory for Audit Trail):
            </label>
            <textarea
              required
              rows={2}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Special order by CEO / Medical substitution / Mutual exchange request approved"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
            />
          </div>

          <div className="pt-2 border-t flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-tnnavy-800 text-white rounded font-bold shadow hover:bg-tnnavy-900"
            >
              Apply Override & Re-validate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
