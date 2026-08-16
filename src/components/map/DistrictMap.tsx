// Interactive Leaflet Map Screen & Coordinate Capture for Erode District
// OpenStreetMap tiles, 10km catchment visualization, auto-geocoding, and click-to-pin coordinate editing.

import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { School, ExamCentre, Block } from '../../types';
import { batchGeocodeItems } from '../../services/geocodingService';
import {
  MapPin,
  School as SchoolIcon,
  Building2,
  CheckCircle2,
  Info,
  Compass,
  Sparkles,
  Layers,
} from 'lucide-react';

// Fix standard Leaflet default icon issues in bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons for Centres and Schools
const centreIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const schoolIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  popupAnchor: [1, -30],
  shadowSize: [36, 36]
});

const targetEditIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
  shadowSize: [48, 48]
});

interface DistrictMapProps {
  schools: School[];
  centres: ExamCentre[];
  blocks: Block[];
  onUpdateSchoolCoords: (schoolId: string, lat: number, lng: number) => void;
  onUpdateCentreCoords: (centreId: string, lat: number, lng: number) => void;
  onBatchUpdateSchools?: (schools: School[]) => void;
  onBatchUpdateCentres?: (centres: ExamCentre[]) => void;
}

function MapClickCapture({
  isPinningMode,
  onMapClick,
}: {
  isPinningMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isPinningMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export const DistrictMap: React.FC<DistrictMapProps> = ({
  schools,
  centres,
  blocks,
  onUpdateSchoolCoords,
  onUpdateCentreCoords,
  onBatchUpdateSchools,
  onBatchUpdateCentres,
}) => {
  const [selectedBlock, setSelectedBlock] = useState<string>('ALL');
  const [showCentres, setShowCentres] = useState<boolean>(true);
  const [showSchools, setShowSchools] = useState<boolean>(true);
  const [showRadius, setShowRadius] = useState<boolean>(true);
  const [radiusKm] = useState<number>(10);

  // Pinning Coordinate Capture Mode
  const [pinTargetType, setPinTargetType] = useState<'NONE' | 'SCHOOL' | 'CENTRE'>('NONE');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isAutoGeocoding, setIsAutoGeocoding] = useState<boolean>(false);

  const ERODE_CENTER: [number, number] = [11.3418, 77.7212];

  const filteredSchools = schools.filter(
    (s) => selectedBlock === 'ALL' || s.blockId === selectedBlock
  );
  const filteredCentres = centres.filter(
    (c) => selectedBlock === 'ALL' || c.blockId === selectedBlock
  );

  const blockMap = new Map(blocks.map((b) => [b.id, b.name]));

  const handleStartPinning = (type: 'SCHOOL' | 'CENTRE', id: string) => {
    setPinTargetType(type);
    setSelectedTargetId(id);
    const item =
      type === 'SCHOOL'
        ? schools.find((s) => s.id === id)
        : centres.find((c) => c.id === id);
    if (item) {
      setTempCoords({ lat: item.lat, lng: item.lng });
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setTempCoords({
      lat: Math.round(lat * 100000) / 100000,
      lng: Math.round(lng * 100000) / 100000,
    });
  };

  const handleSavePinCoords = () => {
    if (!tempCoords || !selectedTargetId) return;

    if (pinTargetType === 'SCHOOL') {
      onUpdateSchoolCoords(selectedTargetId, tempCoords.lat, tempCoords.lng);
      const s = schools.find((s) => s.id === selectedTargetId);
      setSaveSuccessMsg(`Updated GPS Coordinates for ${s?.name || 'School'}`);
    } else if (pinTargetType === 'CENTRE') {
      onUpdateCentreCoords(selectedTargetId, tempCoords.lat, tempCoords.lng);
      const c = centres.find((c) => c.id === selectedTargetId);
      setSaveSuccessMsg(`Updated GPS Coordinates for ${c?.name || 'Centre'}`);
    }

    setPinTargetType('NONE');
    setSelectedTargetId('');
    setTempCoords(null);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleBatchAutoGeocodeAll = async () => {
    setIsAutoGeocoding(true);
    try {
      const geocodedSchools = await batchGeocodeItems(schools);
      const geocodedCentres = await batchGeocodeItems(centres);

      if (onBatchUpdateSchools) onBatchUpdateSchools(geocodedSchools);
      if (onBatchUpdateCentres) onBatchUpdateCentres(geocodedCentres);

      setSaveSuccessMsg(`Successfully geocoded & mapped ${geocodedSchools.length} schools and ${geocodedCentres.length} centres on OpenStreetMap!`);
    } catch (err: any) {
      alert(`Geocoding error: ${err.message}`);
    } finally {
      setIsAutoGeocoding(false);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Block Selector */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Filter by Block:
            </span>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-tnnavy-500 outline-none"
            >
              <option value="ALL">All Educational Blocks ({blocks.length})</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Layer Toggles */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCentres}
                onChange={(e) => setShowCentres(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <span className="flex items-center text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block mr-1.5"></span>
                Exam Centres ({filteredCentres.length})
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSchools}
                onChange={(e) => setShowSchools(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="flex items-center text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block mr-1.5"></span>
                Schools ({filteredSchools.length})
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRadius}
                onChange={(e) => setShowRadius(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="flex items-center text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block mr-1.5"></span>
                10km Catchment Circles
              </span>
            </label>
          </div>

          {/* Auto-Geocode All Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBatchAutoGeocodeAll}
              disabled={isAutoGeocoding}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 transition disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAutoGeocoding ? 'animate-spin' : 'text-indigo-600'}`} />
              <span>{isAutoGeocoding ? 'Auto-Geocoding GPS...' : 'Auto-Geocode All Locations'}</span>
            </button>
          </div>
        </div>

        {/* Pinning Confirmation banner */}
        {tempCoords && pinTargetType !== 'NONE' && (
          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
            <div className="text-xs text-indigo-900">
              <span className="font-bold">Target:</span>{' '}
              {pinTargetType === 'SCHOOL'
                ? schools.find((s) => s.id === selectedTargetId)?.name
                : centres.find((c) => c.id === selectedTargetId)?.name}{' '}
              | <span className="font-bold">New Lat:</span> {tempCoords.lat}, <span className="font-bold">Lng:</span> {tempCoords.lng}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSavePinCoords}
                className="px-3 py-1 bg-tnnavy-800 text-white text-xs font-semibold rounded-md shadow hover:bg-tnnavy-900 transition"
              >
                Confirm & Save GPS
              </button>
            </div>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center text-xs font-medium text-emerald-800">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
            {saveSuccessMsg}
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden relative" style={{ height: '620px' }}>
        <MapContainer
          center={ERODE_CENTER}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickCapture
            isPinningMode={pinTargetType !== 'NONE'}
            onMapClick={handleMapClick}
          />

          {/* Active Repin Marker */}
          {tempCoords && pinTargetType !== 'NONE' && (
            <Marker position={[tempCoords.lat, tempCoords.lng]} icon={targetEditIcon}>
              <Popup>
                <div className="text-xs font-bold text-amber-800">
                  New Target Location: [{tempCoords.lat}, {tempCoords.lng}]
                </div>
              </Popup>
            </Marker>
          )}

          {/* Exam Centres Markers & Catchment Circles */}
          {showCentres &&
            filteredCentres.map((centre) => (
              <React.Fragment key={`centre-${centre.id}`}>
                <Marker position={[centre.lat, centre.lng]} icon={centreIcon}>
                  <Popup>
                    <div className="p-1 space-y-1.5 min-w-[200px]">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-red-700">
                        <Building2 className="w-4 h-4" />
                        <span>{centre.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {centre.centreNumber && (
                          <p><span className="font-semibold">Centre No. (மைய எண்):</span> <span className="font-bold text-red-700 tabular-nums">{centre.centreNumber}</span></p>
                        )}
                        <p><span className="font-semibold">Block:</span> {blockMap.get(centre.blockId) || centre.blockId}</p>
                        <p><span className="font-semibold">Capacity:</span> {centre.capacity} students ({centre.totalHalls} halls)</p>
                        <p><span className="font-semibold">GPS:</span> {centre.lat.toFixed(4)}, {centre.lng.toFixed(4)}</p>
                        {centre.clubbedSchoolIds && centre.clubbedSchoolIds.length > 0 && (
                          <p><span className="font-semibold">Clubbed:</span> {centre.clubbedSchoolIds.length} schools</p>
                        )}
                      </div>
                      <div className="pt-1.5 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => handleStartPinning('CENTRE', centre.id)}
                          className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-[11px] font-semibold flex items-center space-x-1"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>Re-pin Location</span>
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* 10km Catchment Circle */}
                {showRadius && (
                  <Circle
                    center={[centre.lat, centre.lng]}
                    radius={radiusKm * 1000}
                    pathOptions={{
                      color: '#4338ca',
                      fillColor: '#6366f1',
                      fillOpacity: 0.08,
                      weight: 1.5,
                      dashArray: '4, 6',
                    }}
                  />
                )}
              </React.Fragment>
            ))}

          {/* School Markers */}
          {showSchools &&
            filteredSchools.map((school) => (
              <Marker key={`school-${school.id}`} position={[school.lat, school.lng]} icon={schoolIcon}>
                <Popup>
                  <div className="p-1 space-y-1.5 min-w-[200px]">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-800">
                      <SchoolIcon className="w-4 h-4" />
                      <span>{school.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <p><span className="font-semibold">Block:</span> {blockMap.get(school.blockId) || school.blockId}</p>
                      <p><span className="font-semibold">Type:</span> {school.type}</p>
                      <p><span className="font-semibold">12th Strength:</span> {school.studentStrength12th || 'N/A'}</p>
                      <p><span className="font-semibold">GPS:</span> {school.lat.toFixed(4)}, {school.lng.toFixed(4)}</p>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleStartPinning('SCHOOL', school.id)}
                        className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold flex items-center space-x-1"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Re-pin Location</span>
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* Floating Legend */}
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-200 text-xs z-[1000] space-y-1.5">
          <div className="font-bold text-slate-800 border-b pb-1 text-[11px] uppercase tracking-wider">Map Legend</div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-600"></span>
            <span className="text-slate-700 font-medium">Exam Centres ({centres.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-blue-600"></span>
            <span className="text-slate-700 font-medium">Schools ({schools.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full border border-indigo-600 bg-indigo-100"></span>
            <span className="text-slate-700 font-medium">10 km Radius Circle</span>
          </div>
        </div>
      </div>
    </div>
  );
};
