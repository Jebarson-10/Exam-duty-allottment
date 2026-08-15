// Schools Master Data Manager for Erode District

import React, { useState } from 'react';
import { School, Block, SchoolType } from '../../types';
import { School as SchoolIcon, Plus, Search, Edit2, Trash2, MapPin, Download, Check } from 'lucide-react';

interface SchoolsManagerProps {
  schools: School[];
  blocks: Block[];
  onSaveSchool: (school: School) => void;
  onDeleteSchool: (id: string) => void;
}

export const SchoolsManager: React.FC<SchoolsManagerProps> = ({
  schools,
  blocks,
  onSaveSchool,
  onDeleteSchool,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [isEditing, setIsEditing] = useState(false);
  const [editingSchool, setEditingSchool] = useState<Partial<School>>({
    id: '',
    name: '',
    address: '',
    lat: 11.3418,
    lng: 77.7212,
    blockId: blocks[0]?.id || 'BLK-ERD',
    type: 'Government',
    studentStrength12th: 200,
    studentStrength10th: 200,
  });

  const blockMap = new Map(blocks.map((b) => [b.id, b.name]));

  const filteredSchools = schools.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBlock = blockFilter === 'ALL' || s.blockId === blockFilter;
    return matchSearch && matchBlock;
  });

  const handleOpenAdd = () => {
    setEditingSchool({
      id: `SCH-${String(schools.length + 1).padStart(2, '0')}`,
      name: '',
      address: '',
      lat: 11.3418,
      lng: 77.7212,
      blockId: blocks[0]?.id || 'BLK-ERD',
      type: 'Government',
      studentStrength12th: 150,
      studentStrength10th: 150,
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (school: School) => {
    setEditingSchool({ ...school });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool.name || !editingSchool.id) return;
    onSaveSchool(editingSchool as School);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
            <SchoolIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Schools Master Registry</h2>
            <p className="text-xs text-slate-500">Manage all {schools.length} recognized Higher Secondary & High Schools in Erode district</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-tnnavy-800 text-white rounded-lg text-xs font-semibold shadow hover:bg-tnnavy-900 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New School</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search school by name, ID, or address..."
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
            <option value="ALL">All Blocks ({schools.length})</option>
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
                <th className="py-3 px-4">School ID & Name</th>
                <th className="py-3 px-4">Block</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">GPS Coordinates</th>
                <th className="py-3 px-4 text-center">12th Strength</th>
                <th className="py-3 px-4 text-center">10th Strength</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No schools found matching your search.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{s.name}</div>
                      <div className="text-[11px] text-slate-400">ID: {s.id} | {s.address}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {blockMap.get(s.blockId) || s.blockId}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.type === 'Government' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        s.type === 'Government Aided' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {s.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {s.studentStrength12th || '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {s.studentStrength10th || '-'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1 text-slate-500 hover:text-tnnavy-700 hover:bg-slate-100 rounded"
                        title="Edit School"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteSchool(s.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete School"
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
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-tnnavy-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {editingSchool.name ? 'Edit School Details' : 'Add New School'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">School ID</label>
                  <input
                    type="text"
                    required
                    value={editingSchool.id || ''}
                    onChange={(e) => setEditingSchool({ ...editingSchool, id: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-tnnavy-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Block</label>
                  <select
                    value={editingSchool.blockId || ''}
                    onChange={(e) => setEditingSchool({ ...editingSchool, blockId: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-tnnavy-500"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">School Official Name</label>
                <input
                  type="text"
                  required
                  value={editingSchool.name || ''}
                  onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                  placeholder="e.g. Govt Girls HSS, Bhavani"
                  className="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-tnnavy-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editingSchool.address || ''}
                  onChange={(e) => setEditingSchool({ ...editingSchool, address: e.target.value })}
                  placeholder="Street, City, Pincode"
                  className="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-tnnavy-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingSchool.lat || 11.34}
                    onChange={(e) => setEditingSchool({ ...editingSchool, lat: parseFloat(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingSchool.lng || 77.72}
                    onChange={(e) => setEditingSchool({ ...editingSchool, lng: parseFloat(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={editingSchool.type || 'Government'}
                    onChange={(e) => setEditingSchool({ ...editingSchool, type: e.target.value as SchoolType })}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    <option value="Government">Government</option>
                    <option value="Government Aided">Government Aided</option>
                    <option value="Matriculation">Matriculation</option>
                    <option value="Self-Finance">Self-Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">12th Strength</label>
                  <input
                    type="number"
                    value={editingSchool.studentStrength12th || 0}
                    onChange={(e) => setEditingSchool({ ...editingSchool, studentStrength12th: parseInt(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">10th Strength</label>
                  <input
                    type="number"
                    value={editingSchool.studentStrength10th || 0}
                    onChange={(e) => setEditingSchool({ ...editingSchool, studentStrength10th: parseInt(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
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
                  Save School
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
