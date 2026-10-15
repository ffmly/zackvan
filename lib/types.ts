export type UserRole = 'renter' | 'owner' | 'admin';

export const USER_ROLES: UserRole[] = ['renter', 'owner', 'admin'];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CloudinaryImage {
  url: string;
  publicId: string;
}

export interface AvailabilityRange {
  start: number;
  end: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  role: UserRole;
  createdAt: number;
}

export type CaravanType = 'caravan' | 'motorhome' | 'teardrop';

export const CARAVAN_TYPES: { value: CaravanType; label: string }[] = [
  { value: 'caravan', label: 'Caravan (towable)' },
  { value: 'motorhome', label: 'Motorhome (integrated)' },
  { value: 'teardrop', label: 'Teardrop / micro trailer' },
];

export interface CaravanSpecs {
  capacity: number;
  beds: number;
  waterTankL?: number;
  solarPanelW?: number;
  hasBathroom: boolean;
  hasKitchen: boolean;
  hasAC: boolean;
}

export interface Caravan {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  title: string;
  description: string;
  type: CaravanType;
  wilaya: string;
  commune?: string;
  locationGeo?: LatLng;
  pricePerDay: number;
  specs: CaravanSpecs;
  extras: string[];
  images: CloudinaryImage[];
  unavailableRanges: AvailabilityRange[];
  published: boolean;
  createdAt: number;
  updatedAt: number;
}

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export const BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'accepted',
  'rejected',
  'cancelled',
  'completed',
];

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['pending', 'accepted'];

export interface Booking {
  id: string;
  caravanId: string;
  caravanTitle: string;
  ownerId: string;
  ownerName: string;
  renterId: string;
  renterName: string;
  startDate: number;
  endDate: number;
  days: number;
  pricePerDay: number;
  totalPrice: number;
  status: BookingStatus;
  message?: string;
  contractId?: string;
  giftCardId?: string;
  giftCardCode?: string;
  giftCardApplied: number;
  cashDue: number;
  createdAt: number;
}

export type GiftCardKind = 'wallet' | 'voucher';

export const GIFT_CARD_KINDS: GiftCardKind[] = ['wallet', 'voucher'];

export type GiftCardStatus = 'active' | 'used' | 'void';

export const GIFT_CARD_STATUSES: GiftCardStatus[] = ['active', 'used', 'void'];

export interface GiftCard {
  id: string;
  code: string;
  kind: GiftCardKind;
  status: GiftCardStatus;
  initialAmount: number;
  balance: number;
  issuedBy: string;
  issuedByName: string;
  recipientUid?: string;
  recipientEmail?: string;
  recipientName?: string;
  recipientClaimedAt?: number;
  note?: string;
  caravanId?: string;
  caravanTitle?: string;
  startDate?: number;
  endDate?: number;
  expiresAt?: number;
  createdAt: number;
  /**
   * Credit currently reserved for one booking. A card may only fund a single
   * booking at a time, which is what makes releasing a cancelled or rejected
   * booking a deterministic, once-only operation.
   */
  heldBookingId?: string;
  heldAmount: number;
  lastUsedAt?: number;
  lastUsedBy?: string;
  voidedAt?: number;
  voidedBy?: string;
}

export type GiftCardLedgerKind =
  | 'issued'
  | 'claimed'
  | 'applied'
  | 'released'
  | 'voided';

export interface GiftCardLedgerEntry {
  id: string;
  giftCardId: string;
  code: string;
  kind: GiftCardLedgerKind;
  amount: number;
  balanceAfter: number;
  bookingId?: string;
  note?: string;
  actorUid?: string;
  createdAt: number;
}

export const GIFT_CARD_LEDGER_KINDS: GiftCardLedgerKind[] = [
  'issued',
  'claimed',
  'applied',
  'released',
  'voided',
];

export interface ContractRecord {
  id?: string;
  bookingId: string;
  caravanId: string;
  ownerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  fullNameSigned: string;
  ipAddress: string;
  userAgent: string;
  contractVersion: string;
  contentHash: string;
  liabilityAcknowledged: boolean;
  acceptedAt: number;
}

export type LocationType = 'national_park' | 'forest' | 'campsite';

export const LOCATION_TYPES: LocationType[] = [
  'national_park',
  'forest',
  'campsite',
];

export type WaterAvailability = 'potable' | 'seasonal' | 'non_potable' | 'none';

export const WATER_LEVELS: WaterAvailability[] = [
  'potable',
  'seasonal',
  'non_potable',
  'none',
];

export interface MapLocation {
  id: string;
  name: string;
  type: LocationType;
  wilaya: string;
  geo: LatLng;
  description: string;
  terrain: string;
  water: WaterAvailability;
  safetyNotes: string;
  tips: string[];
  bestSeason: string;
}
