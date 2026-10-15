import type {
  BookingStatus,
  LocationType,
  WaterAvailability,
} from '@/lib/types';

export const WILAYAS: string[] = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra',
  'Béchar', 'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret',
  'Tizi Ouzou', 'Alger', 'Djelfa', 'Sétif', 'Saïda', 'Skikda',
  'Sidi Bel Abbès', 'Annaba', 'Guelma', 'Constantine', 'Médéa', 'Mostaganem',
  "M'Sila", 'Mascara', 'Ouargla', 'Oran', 'El Bayadh', 'Illizi',
  'Bordj Bou Arreridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt',
  'El Oued', 'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla',
  'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane', 'Timimoun',
  'Bordj Badji Mokhtar', 'Ouled Djellal', 'Béni Abbès', 'In Salah',
  'In Guezzam', 'Touggourt', 'Djanet', "El M'Ghair", 'El Meniaa',
];

export const EXTRA_FEATURES: string[] = [
  'Awning', 'Bike rack', 'Generator', 'Heating', 'Outdoor shower',
  'Storage box', 'Reverse camera', 'Child seat anchors',
];

export const LOCATION_TYPE_META: Record<
  LocationType,
  { label: string; hex: string; chipClass: string; dotClass: string }
> = {
  national_park: {
    label: 'National Park',
    hex: '#dbc8a3',
    chipClass: 'bg-brand-50 text-brand-800 ring-1 ring-brand-200',
    dotClass: 'bg-brand-800',
  },
  forest: {
    label: 'Forest',
    hex: '#c9b58d',
    chipClass: 'bg-brand-50 text-brand-800 ring-1 ring-brand-200',
    dotClass: 'bg-brand-900',
  },
  campsite: {
    label: 'Camping Spot',
    hex: '#b39a70',
    chipClass: 'bg-brand-50 text-brand-800 ring-1 ring-brand-200',
    dotClass: 'bg-brand-900',
  },
};

export const WATER_META: Record<
  WaterAvailability,
  { label: string; shortLabel: string; iconClass: string }
> = {
  potable: {
    label: 'Potable drinking water on site',
    shortLabel: 'Potable water',
    iconClass: 'text-brand-800',
  },
  seasonal: {
    label: 'Seasonal water source only',
    shortLabel: 'Seasonal water',
    iconClass: 'text-brand-700',
  },
  non_potable: {
    label: 'Non-potable water — treat before use',
    shortLabel: 'Non-potable water',
    iconClass: 'text-brand-800',
  },
  none: {
    label: 'No water — bring your own supply',
    shortLabel: 'No water source',
    iconClass: 'text-brand-700',
  },
};

export const BOOKING_STATUS_META: Record<
  BookingStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: 'Pending review',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  accepted: {
    label: 'Accepted',
    badgeClass: 'bg-brand-100 text-brand-800',
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-rose-100 text-rose-700',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-slate-100 text-slate-600',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-sky-100 text-sky-800',
  },
};
