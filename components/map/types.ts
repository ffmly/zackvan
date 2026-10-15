import type { MapLocation } from '@/lib/types';

export interface MapViewProps {
  locations: MapLocation[];
  selectedId?: string | null;
  onSelect?: (location: MapLocation) => void;
  className?: string;
  interactive?: boolean;
}
