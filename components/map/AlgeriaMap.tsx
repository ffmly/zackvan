'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { LOCATION_TYPE_META } from '@/lib/constants';
import { WATER_LABELS } from '@/lib/contract';
import type { LocationType, MapLocation } from '@/lib/types';
import type { MapViewProps } from './types';

const ALGERIA_CENTER: [number, number] = [28.2, 2.6];
const ALGERIA_BOUNDS: [[number, number], [number, number]] = [
  [18.6, -9.0],
  [37.6, 12.4],
];

function pinIcon(type: LocationType, active: boolean): L.DivIcon {
  const color = LOCATION_TYPE_META[type].hex;
  const scale = active ? 1.25 : 1;
  return L.divIcon({
    className: 'zakivan-marker',
    html: `<span style="display:block;transform:scale(${scale});transform-origin:bottom center;filter:${
      active ? 'drop-shadow(0 3px 6px rgba(15,23,42,.45))' : 'drop-shadow(0 1px 2px rgba(15,23,42,.35))'
    }">
      <svg viewBox="0 0 24 24" width="30" height="30">
        <path d="M12 0C7 0 3 4 3 9c0 6.6 9 15 9 15s9-8.4 9-15c0-5-4-9-9-9z" fill="${color}" stroke="#ffffff" stroke-width="1.6"/>
        <circle cx="12" cy="9" r="3.1" fill="#ffffff"/>
      </svg>
    </span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 29],
    popupAnchor: [0, -30],
  });
}

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(ALGERIA_BOUNDS, { padding: [20, 20] });
  }, [map]);
  return null;
}

function FlyToSelected({ location }: { location: MapLocation | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!location) return;
    map.flyTo([location.geo.lat, location.geo.lng], Math.max(map.getZoom(), 8), {
      duration: 0.8,
    });
  }, [map, location]);
  return null;
}

export default function AlgeriaMap({
  locations,
  selectedId,
  onSelect,
  className,
  interactive = true,
}: MapViewProps) {
  const icons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    for (const loc of locations) {
      const key = `${loc.type}-${loc.id === selectedId}`;
      if (!cache.has(key)) {
        cache.set(key, pinIcon(loc.type, loc.id === selectedId));
      }
    }
    return cache;
  }, [locations, selectedId]);

  const selected = locations.find((l) => l.id === selectedId);

  return (
    <div className={className}>
      <MapContainer
        center={ALGERIA_CENTER}
        zoom={5}
        minZoom={4}
        maxZoom={14}
        maxBounds={L.latLngBounds(
          [ALGERIA_BOUNDS[0][0] - 4, ALGERIA_BOUNDS[0][1] - 5],
          [ALGERIA_BOUNDS[1][0] + 4, ALGERIA_BOUNDS[1][1] + 5],
        )}
        maxBoundsViscosity={0.7}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={interactive}
        zoomControl={interactive}
        attributionControl
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds />
        {interactive && <FlyToSelected location={selected} />}

        {locations.map((loc) => (
          <Marker
            key={`${loc.id}-${loc.id === selectedId}`}
            position={[loc.geo.lat, loc.geo.lng]}
            icon={icons.get(`${loc.type}-${loc.id === selectedId}`)!}
            eventHandlers={{ click: () => onSelect?.(loc) }}
          >
            <Popup minWidth={210} maxWidth={260}>
              <div>
                <p className="font-bold text-slate-900">{loc.name}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                  {LOCATION_TYPE_META[loc.type].label} · {loc.wilaya}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {WATER_LABELS[loc.water]}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
