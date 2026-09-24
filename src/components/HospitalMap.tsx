import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Star, Shield, Building2, ArrowRight, MapPin, Check, ExternalLink, Navigation } from 'lucide-react';
import { formatINR } from '../utils';
import type { Hospital } from '../types';

// Default hospital coordinates if not in data (fallback coordinates centered around Ahmedabad/West India)
const CITY_COORDS: Record<string, [number, number]> = {
  ahmedabad: [23.0225, 72.5714],
  mumbai: [19.0760, 72.8777],
  delhi: [28.6139, 77.2090],
  'delhi ncr': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  pune: [18.5204, 73.8567],
  surat: [21.1702, 72.8311],
  vadodara: [22.3072, 73.1812],
};

function getHospitalCoords(hospital: Hospital, index: number): [number, number] {
  if (hospital.latitude && hospital.longitude && !isNaN(hospital.latitude) && !isNaN(hospital.longitude)) {
    return [hospital.latitude, hospital.longitude];
  }
  const cityKey = (hospital.city || 'ahmedabad').toLowerCase().trim();
  const [baseLat, baseLng] = CITY_COORDS[cityKey] || [23.0225, 72.5714];

  // Distribute nearby around the base coordinates if exact lat/lng is missing
  const angle = (index * 60 * Math.PI) / 180;
  const radius = 0.02 + (index % 3) * 0.015;
  return [baseLat + Math.sin(angle) * radius, baseLng + Math.cos(angle) * radius];
}

// Custom Leaflet DivIcon creator for hospital markers (stable, does NOT rebuild on hover)
function createHospitalIcon(hospital: Hospital, isSelected: boolean) {
  const matchColor = hospital.matchScore >= 95 ? '#0d9488' : hospital.matchScore >= 90 ? '#0284c7' : '#64748b';
  const pulseClass = isSelected ? 'leaflet-pin-selected' : '';

  const html = `
    <div class="custom-hospital-marker ${pulseClass}" data-hospital-id="${hospital.id}" style="--marker-color: ${matchColor};">
      <div class="marker-pin ${isSelected ? 'active' : ''}">
        <div class="marker-content">
          <span class="marker-score">${hospital.matchScore}%</span>
        </div>
        <div class="marker-point"></div>
      </div>
      <div class="marker-label">
        <span class="marker-name">${hospital.name.split(' ')[0]}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-div-icon',
    iconSize: [48, 54],
    iconAnchor: [24, 46],
    popupAnchor: [0, -46],
  });
}

// Subcomponent to automatically fit map bounds without jumping or jitter
function MapUpdater({
  hospitals,
  selectedHospitalId,
}: {
  hospitals: Hospital[];
  selectedHospitalId?: string;
}) {
  const map = useMap();
  const prevSelectedRef = React.useRef<string | undefined>(undefined);
  const initialFitRef = React.useRef(false);

  useEffect(() => {
    if (hospitals.length === 0) return;

    // Only pan if a new hospital is explicitly selected
    if (selectedHospitalId && selectedHospitalId !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedHospitalId;
      const selected = hospitals.find((h) => h.id === selectedHospitalId);
      if (selected) {
        const index = hospitals.indexOf(selected);
        const coords = getHospitalCoords(selected, index);
        map.panTo(coords, { animate: true, duration: 0.6 });
        return;
      }
    }

    // Auto-fit bounds once on mount or when hospital list changes
    if (!initialFitRef.current) {
      initialFitRef.current = true;
      const bounds = L.latLngBounds(
        hospitals.map((h, i) => getHospitalCoords(h, i))
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [hospitals, selectedHospitalId, map]);

  return null;
}

interface HospitalMapProps {
  hospitals: Hospital[];
  selectedHospitalId?: string;
  hoveredHospitalId?: string;
  onSelectHospital: (hospital: Hospital) => void;
  onHoverHospital?: (id: string | null) => void;
  userLocationName?: string;
}

export default function HospitalMap({
  hospitals,
  selectedHospitalId,
  hoveredHospitalId,
  onSelectHospital,
  userLocationName = 'Ahmedabad',
}: HospitalMapProps) {
  const centerCoords = useMemo<[number, number]>(() => {
    if (hospitals.length > 0) {
      return getHospitalCoords(hospitals[0], 0);
    }
    const cityKey = userLocationName.toLowerCase().split(',')[0].trim();
    return CITY_COORDS[cityKey] || [23.0225, 72.5714];
  }, [hospitals, userLocationName]);

  // Synchronize card list hover to map pin without recreating Leaflet markers
  useEffect(() => {
    document.querySelectorAll('.custom-hospital-marker.hovered').forEach((el) => {
      el.classList.remove('hovered');
    });

    if (hoveredHospitalId) {
      const el = document.querySelector(`[data-hospital-id="${hoveredHospitalId}"]`);
      if (el) {
        el.classList.add('hovered');
      }
    }
  }, [hoveredHospitalId]);

  // Determine map tile provider (CARTO if key provided in .env, otherwise free OpenStreetMap)
  const cartoApiKey = (import.meta as any).env?.VITE_CARTO_API_KEY;
  const customTileUrl = (import.meta as any).env?.VITE_MAP_TILES_URL;

  const tileConfig = useMemo(() => {
    if (customTileUrl) {
      return {
        url: customTileUrl,
        attribution: '&copy; OpenStreetMap contributors',
      };
    }
    if (cartoApiKey) {
      return {
        url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      };
    }
    // High-performance OpenStreetMap standard tiles (100% free, NO API key required)
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    };
  }, [cartoApiKey, customTileUrl]);

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-50">
      <MapContainer
        center={centerCoords}
        zoom={12}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
        style={{ minHeight: '520px', height: '100%', width: '100%' }}
      >
        {/* Map Tile Layer (OpenStreetMap / CARTO) */}
        <TileLayer
          attribution={tileConfig.attribution}
          url={tileConfig.url}
          maxZoom={19}
        />

        <MapUpdater
          hospitals={hospitals}
          selectedHospitalId={selectedHospitalId}
        />

        {/* User reference radius circle */}
        <Circle
          center={centerCoords}
          radius={5000}
          pathOptions={{
            color: '#0d9488',
            fillColor: '#14b8a6',
            fillOpacity: 0.06,
            weight: 1.5,
            dashArray: '6, 6',
          }}
        />

        {/* Hospital markers */}
        {hospitals.map((hospital, idx) => {
          const coords = getHospitalCoords(hospital, idx);
          const isSelected = hospital.id === selectedHospitalId;

          return (
            <Marker
              key={hospital.id}
              position={coords}
              icon={createHospitalIcon(hospital, isSelected)}
              eventHandlers={{
                click: () => onSelectHospital(hospital),
              }}
            >
              <Popup className="curify-leaflet-popup" minWidth={280} maxWidth={320}>
                <div className="p-1 font-sans">
                  {/* Header with match score & accreditation */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                      <Shield className="w-3 h-3 text-teal-600" />
                      {hospital.accreditation}
                    </span>
                    <span className="text-xs font-bold text-teal-600 bg-teal-50/80 px-2 py-0.5 rounded-full">
                      {hospital.matchScore}% Match
                    </span>
                  </div>

                  {/* Hospital title */}
                  <h4 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                    {hospital.name}
                  </h4>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2.5">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <strong className="text-slate-800">{hospital.rating}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {hospital.city} ({hospital.distance} km)
                    </span>
                  </div>

                  {/* Cost breakdown snapshot */}
                  <div className="bg-slate-50/80 rounded-lg p-2.5 mb-3 border border-slate-100">
                    <span className="block text-[10px] uppercase font-semibold tracking-wider text-slate-600">
                      Estimated Procedure Cost
                    </span>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {formatINR(hospital.costBreakdown.totalMin)} – {formatINR(hospital.costBreakdown.totalMax)}
                    </div>
                    <span className="text-[10px] text-teal-700 font-medium flex items-center gap-1 mt-0.5">
                      <Check className="w-2.5 h-2.5" /> All surgical & stay costs included
                    </span>
                  </div>

                  {/* Action button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectHospital(hospital);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                  >
                    Select This Hospital
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating map controls and legend */}
      <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-md border border-slate-200/80 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
          <Navigation className="w-3.5 h-3.5 text-teal-600" />
          <span>Regional Network ({hospitals.length})</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-600"></span> 95%+ Match
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-600"></span> 90–94%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span> Standard
          </span>
        </div>
      </div>
    </div>
  );
}
