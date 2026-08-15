// Teachers Master Data Manager for Erode District

import React, { useState } from 'react';
import { Teacher, School, TeacherDesignation, Subject } from '../../types';
import { Users, Plus, Search, Edit2, Trash2, ShieldAlert, ShieldCheck, MapPin, Award } from 'lucide-react';

interface TeachersManagerProps {
  teachers: Teacher[];
  schools: School[];
  onSaveTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
}

const DESIGNATIONS: TeacherDesignation[] = [
  'Principal',
  'Headmaster',
  'PG Assistant',
  'B.T. Assistant',
  'Physical Education Director',
  'Vocational Instructor',
  'Special Teacher',
];

const SUBJECTS: Subject[] = [
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Computer Science',
  'Tamil',
  'English',
  'Botany',
  'Zoology',
  'Commerce',
  'Accountancy',
  'Economics',
  'History',
  'General',
];

export const TeachersManager: React.FC<TeachersManagerProps> = ({
  teachers,
  schools,
  onSaveTeacher,
  onDeleteTeacher,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [exemptionFilter, setExemptionFilter] = useState<'ALL' | 'ACTIVE' | 'EXEMPTED'>('ALL');

  const [isEditing, setIsEditing] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Partial<Teacher>>({
    id: '',
    name: '',
    gender: 'M',
    schoolId: schools[0]?.id || 'SCH-01',
    subject: 'Physics',
    designation: 'PG Assistant',
    seniorityRank: teachers.length + 1,
    dateOfJoining: '2015-06-01',
    homeLat: 11.3418,
    homeLng: 77.7212,
    isExempted: false,
    phone: '9443100000',
  });

  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  const filteredTeachers = teachers.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm);
    const matchSchool = schoolFilter === 'ALL' || t.schoolId === schoolFilter;
    const matchDesig = designationFilter === 'ALL' || t.designation === designationFilter;
    const matchSub = subjectFilter === 'ALL' || t.subject === subjectFilter;
    const matchExempt =
      exemptionFilter === 'ALL' ||
      (exemptionFilter === 'ACTIVE' && !t.isExempted) ||
      (exemptionFilter === 'EXEMPTED' && t.isExempted);

    return matchSearch && matchSchool && matchDesig && matchSub && matchExempt;
  });

  const handleOpenAdd = () => {
    setEditingTeacher({
      id: `TCH-${String(teachers.length + 1).padStart(3, '0')}`,
      name: '',
      gender: 'M',
      schoolId: schools[0]?.id || 'SCH-01',
      subject: 'Physics',
      designation: 'PG Assistant',
      seniorityRank: teachers.length + 1,
      dateOfJoining: '2015-06-01',
      homeLat: 11.3418,
      homeLng: 77.7212,
      isExempted: false,
      phone: '9443100000',
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher({ ...teacher });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher.name || !editingTeacher.id) return;
    onSaveTeacher(editingTeacher as Teacher);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Faculty & Invigilator Master Registry</h2>
            <p className="text-xs text-slate-500">
              Manage {teachers.length} teaching staff across Erode district with seniority rankings, subjects, and medical exemptions
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-tnnavy-800 text-white rounded-lg text-xs font-semibold shadow hover:bg-tnnavy-900 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Teacher</span>
        </button>
      </div>

      {/* Filter Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search faculty by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-tnnavy-500 outline-none"
          />
        </div>

        <div>
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
          >
            <option value="ALL">All Designations</option>
            {DESIGNATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
          >
            <option value="ALL">All Subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={exemptionFilter}
            onChange={(e) => setExemptionFilter(e.target.value as any)}
            className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active for Duty Only</option>
            <option value="EXEMPTED">Exempted Staff Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Faculty Name & ID</th>
                <th className="py-3 px-4">Designation & Subject</th>
                <th className="py-3 px-4">Parent School</th>
                <th className="py-3 px-4 text-center">Seniority Rank</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No faculty members found matching search filters.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{t.name}</div>
                      <div className="text-[11px] text-slate-400">ID: {t.id} | {t.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{t.designation}</span>
                      <div className="text-[11px] text-tnnavy-600 font-semibold">{t.subject}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {schoolMap.get(t.schoolId) || t.schoolId}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                        <Award className="w-3 h-3 mr-1 text-amber-600" />
                        #{t.seniorityRank}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{t.dateOfJoining}</td>
                    <td className="py-3 px-4 text-center">
                      {t.isExempted ? (
                        <span
                          className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold inline-flex items-center"
                          title={t.exemptionReason || 'Exempted'}
                        >
                          <ShieldAlert className="w-3 h-3 mr-1 text-rose-500" />
                          Exempted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold inline-flex items-center">
                          <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1 text-slate-500 hover:text-tnnavy-700 hover:bg-slate-100 rounded"
                        title="Edit Teacher"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTeacher(t.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete Teacher"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-tnnavy-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {editingTeacher.name ? 'Edit Faculty Record' : 'Add New Faculty Member'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teacher ID</label>
                  <input
                    type="text"
                    required
                    value={editingTeacher.id || ''}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, id: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={editingTeacher.gender || 'M'}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, gender: e.target.value as any })}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name (with Prefix)</label>
                <input
                  type="text"
                  required
                  value={editingTeacher.name || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  placeholder="e.g. Thiru. A. Manoharan"
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parent School</label>
                <select
                  value={editingTeacher.schoolId || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, schoolId: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <select
                    value={editingTeacher.designation || 'PG Assistant'}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, designation: e.target.value as any })}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    {DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                  <select
                    value={editingTeacher.subject || 'Physics'}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, subject: e.target.value as any })}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Seniority Rank</label>
                  <input
                    type="number"
                    required
                    value={editingTeacher.seniorityRank || 999}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, seniorityRank: parseInt(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    required
                    value={editingTeacher.dateOfJoining || '2015-06-01'}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, dateOfJoining: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    value={editingTeacher.phone || ''}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Home Latitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingTeacher.homeLat || ''}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, homeLat: parseFloat(e.target.value) })}
                    placeholder="e.g. 11.3410"
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Home Longitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingTeacher.homeLng || ''}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, homeLng: parseFloat(e.target.value) })}
                    placeholder="e.g. 77.7172"
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
              </div>

              {/* Exemption Box */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <label className="flex items-center space-x-2 font-semibold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTeacher.isExempted || false}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, isExempted: e.target.checked })}
                    className="rounded text-amber-700 focus:ring-amber-500"
                  />
                  <span>Mark as Exempted from Exam Duties (Medical / Special Ground)</span>
                </label>
                {editingTeacher.isExempted && (
                  <div>
                    <label className="block font-medium text-amber-800 mb-1">Exemption Reason & Medical Certificate Ref</label>
                    <input
                      type="text"
                      value={editingTeacher.exemptionReason || ''}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, exemptionReason: e.target.value })}
                      placeholder="e.g. Medical Board Certificate No. 492 / Physically Challenged / Retirement in 2 months"
                      className="w-full border border-amber-300 bg-white rounded p-2 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-tnnavy-800 text-white rounded font-semibold shadow hover:bg-tnnavy-900"
                >
                  Save Faculty Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
