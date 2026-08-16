// Exam Centres Master Data Manager for Erode District

import React, { useState } from 'react';
import { ExamCentre, School, Block } from '../../types';
import { Building2, Plus, Search, Edit2, Trash2, Users, MapPin, Link2 } from 'lucide-react';

interface CentresManagerProps {
  centres: ExamCentre[];
  schools: School[];
  blocks: Block[];
  onSaveCentre: (centre: ExamCentre) => void;
  onDeleteCentre: (id: string) => void;
}

export const CentresManager: React.FC<CentresManagerProps> = ({
  centres,
  schools,
  blocks,
  onSaveCentre,
  onDeleteCentre,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [isEditing, setIsEditing] = useState(false);
  const [editingCentre, setEditingCentre] = useState<Partial<ExamCentre>>({
    id: '',
    name: '',
    address: '',
    lat: 11.3418,
    lng: 77.7212,
    blockId: blocks[0]?.id || 'BLK-ERD',
    capacity: 350,
    totalHalls: 18,
    clubbedSchoolIds: [],
  });

  const blockMap = new Map(blocks.map((b) => [b.id, b.name]));
  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  const filteredCentres = centres.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.centreNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBlock = blockFilter === 'ALL' || c.blockId === blockFilter;
    return matchSearch && matchBlock;
  });

  const handleOpenAdd = () => {
    setEditingCentre({
      id: `CTR-${String(centres.length + 1).padStart(2, '0')}`,
      centreNumber: '',
      name: '',
      address: '',
      lat: 11.3418,
      lng: 77.7212,
      blockId: blocks[0]?.id || 'BLK-ERD',
      capacity: 350,
      totalHalls: 18,
      clubbedSchoolIds: [],
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (centre: ExamCentre) => {
    setEditingCentre({ ...centre, clubbedSchoolIds: [...centre.clubbedSchoolIds] });
    setIsEditing(true);
  };

  const handleToggleClubbedSchool = (schoolId: string) => {
    const current = editingCentre.clubbedSchoolIds || [];
    if (current.includes(schoolId)) {
      setEditingCentre({
        ...editingCentre,
        clubbedSchoolIds: current.filter((id) => id !== schoolId),
      });
    } else {
      setEditingCentre({
        ...editingCentre,
        clubbedSchoolIds: [...current, schoolId],
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCentre.name || !editingCentre.id) return;
    onSaveCentre(editingCentre as ExamCentre);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-red-50 text-red-700 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Exam Centres Registry</h2>
            <p className="text-xs text-slate-500">
              Manage designated examination centres, seating capacity, halls, and clubbed schools
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-tnnavy-800 text-white rounded-lg text-xs font-semibold shadow hover:bg-tnnavy-900 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Centre</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search centres by name, ID, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-tnnavy-500 outline-none"
          />
        </div>

        <div>
          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-tnnavy-500 outline-none font-medium"
          >
            <option value="ALL">All Blocks ({centres.length})</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Centre ID & Name</th>
                <th className="py-3 px-4">Block</th>
                <th className="py-3 px-4 text-center">Capacity</th>
                <th className="py-3 px-4 text-center">Halls</th>
                <th className="py-3 px-4">Clubbed Schools</th>
                <th className="py-3 px-4">GPS Location</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCentres.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No examination centres found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredCentres.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        {c.centreNumber && (
                          <span
                            className="px-1.5 py-0.5 bg-tngold-50 border border-tngold-300 rounded text-[10px] font-bold text-tngold-700 tabular-nums"
                            title="Official Centre Number (மைய எண்)"
                          >
                            No. {c.centreNumber}
                          </span>
                        )}
                        <span>{c.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">ID: {c.id} | {c.address}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {blockMap.get(c.blockId) || c.blockId}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-tnnavy-700">
                      {c.capacity}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {c.totalHalls} halls
                    </td>
                    <td className="py-3 px-4">
                      {c.clubbedSchoolIds && c.clubbedSchoolIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.clubbedSchoolIds.map((sId) => (
                            <span
                              key={sId}
                              className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700"
                              title={schoolMap.get(sId) || sId}
                            >
                              {schoolMap.get(sId)?.slice(0, 18) || sId}...
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Self only</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1 text-slate-500 hover:text-tnnavy-700 hover:bg-slate-100 rounded"
                        title="Edit Centre"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteCentre(c.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete Centre"
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
                {editingCentre.name ? 'Edit Examination Centre' : 'Add New Exam Centre'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Centre ID</label>
                  <input
                    type="text"
                    required
                    value={editingCentre.id || ''}
                    onChange={(e) => setEditingCentre({ ...editingCentre, id: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Centre Number (மைய எண்)</label>
                  <input
                    type="text"
                    value={editingCentre.centreNumber || ''}
                    onChange={(e) => setEditingCentre({ ...editingCentre, centreNumber: e.target.value })}
                    placeholder="e.g. 33101401"
                    className="w-full border border-slate-300 rounded p-2 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Block</label>
                  <select
                    value={editingCentre.blockId || ''}
                    onChange={(e) => setEditingCentre({ ...editingCentre, blockId: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Centre Official Name</label>
                <input
                  type="text"
                  required
                  value={editingCentre.name || ''}
                  onChange={(e) => setEditingCentre({ ...editingCentre, name: e.target.value })}
                  placeholder="e.g. Diamond Jubilee HSS Centre, Gobi"
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editingCentre.address || ''}
                  onChange={(e) => setEditingCentre({ ...editingCentre, address: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingCentre.lat || 11.34}
                    onChange={(e) => setEditingCentre({ ...editingCentre, lat: parseFloat(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingCentre.lng || 77.72}
                    onChange={(e) => setEditingCentre({ ...editingCentre, lng: parseFloat(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Student Capacity</label>
                  <input
                    type="number"
                    required
                    value={editingCentre.capacity || 300}
                    onChange={(e) => setEditingCentre({ ...editingCentre, capacity: parseInt(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Halls</label>
                  <input
                    type="number"
                    required
                    value={editingCentre.totalHalls || 15}
                    onChange={(e) => setEditingCentre({ ...editingCentre, totalHalls: parseInt(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
              </div>

              {/* Clubbed Schools Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clubbed Schools Sharing this Examination Centre
                </label>
                <div className="border border-slate-200 rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1.5 bg-slate-50">
                  {schools.map((school) => {
                    const isSelected = editingCentre.clubbedSchoolIds?.includes(school.id);
                    return (
                      <label
                        key={school.id}
                        className={`flex items-center space-x-2 p-1.5 rounded cursor-pointer text-[11px] ${
                          isSelected ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-slate-700 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleClubbedSchool(school.id)}
                          className="rounded text-tnnavy-700 focus:ring-tnnavy-500"
                        />
                        <span>{school.name} ({school.id})</span>
                      </label>
                    );
                  })}
                </div>
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
                  Save Centre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
