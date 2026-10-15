import type { Caravan, WaterAvailability, LocationType } from '@/lib/types';
import { formatDate, formatDZD } from '@/lib/utils';

export const CONTRACT_VERSION = 'ZAK-DZ-LIABILITY-v1.1';

export interface ContractSection {
  title: string;
  body: string[];
}

export interface ContractParams {
  caravan: Caravan;
  renterName: string;
  startDate: number;
  endDate: number;
  days: number;
  totalPrice: number;
  giftCardCode?: string;
  giftCardApplied?: number;
  cashDue?: number;
}

const TYPE_LABELS: Record<Caravan['type'], string> = {
  caravan: 'towable caravan',
  motorhome: 'motorhome',
  teardrop: 'teardrop / micro trailer',
};

export const WATER_LABELS: Record<WaterAvailability, string> = {
  potable: 'Potable drinking water available on site',
  seasonal: 'Seasonal water source (check before travelling)',
  non_potable: 'Non-potable water only (treat or boil before use)',
  none: 'No water source — carry your own supply',
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  national_park: 'National Park',
  forest: 'Forest',
  campsite: 'Camping Spot',
};

export function buildContractTerms(params: ContractParams): ContractSection[] {
  const {
    caravan,
    renterName,
    startDate,
    endDate,
    days,
    totalPrice,
    giftCardCode,
    giftCardApplied,
    cashDue,
  } = params;
  const ownerName = caravan.ownerName;
  const extras =
    caravan.extras.length > 0
      ? `, together with the following declared equipment: ${caravan.extras.join(', ')}`
      : '';

  const applied = giftCardApplied ?? 0;
  const giftCardNote =
    applied > 0
      ? `The Tenant has applied gift card ${giftCardCode} for ${new Intl.NumberFormat('fr-FR').format(applied)} DZD, reducing the amount payable at handover to ${new Intl.NumberFormat('fr-FR').format(cashDue ?? totalPrice - applied)} DZD. Gift cards issued by Zackvan Algeria are promotional instruments with no cash redemption value, are non-refundable, and confer no rights over the Owner beyond reducing the amount the Tenant owes. The Owner accepts this booking on the understanding that the full rental price remains due and that any gift card shortfall is the sole responsibility of the Tenant.`
      : `No gift card or platform credit has been applied to this Contract.`;

  return [
    {
      title: '1. Parties and Purpose',
      body: [
        `This electronic rental agreement ("the Contract") is concluded between ${ownerName} ("the Owner"), owner of the leisure vehicle listed as "${caravan.title}", and ${renterName} ("the Tenant"). Zackvan Algeria acts exclusively as a technical intermediary that facilitates the conclusion of this Contract between the parties; it never holds, collects, or transfers funds on behalf of either party.`,
      ],
    },
    {
      title: '2. Object of the Lease',
      body: [
        `The Owner leases to the Tenant the vehicle identified as "${caravan.title}" (${TYPE_LABELS[caravan.type]}), with a declared sleeping capacity of ${caravan.specs.capacity} person(s)${extras}.`,
        `The Tenant declares having examined the photographs, technical specifications, and condition report of the vehicle prior to signing, and accepts the vehicle in its described condition.`,
      ],
    },
    {
      title: '3. Rental Period, Pickup and Return',
      body: [
        `The rental period runs from ${formatDate(startDate)} to ${formatDate(endDate)}, i.e. ${days} day(s). Pickup and return take place at the location agreed between the parties (${caravan.wilaya}${caravan.commune ? ` — ${caravan.commune}` : ''}).`,
        `The Tenant undertakes to return the vehicle at the agreed date and time, in the same condition as received, complete with all keys, accessories, equipment, and documents. Any delay entitles the Owner to compensation for each day of late return, without prejudice to any further damages.`,
      ],
    },
    {
      title: '4. Price and Payment',
      body: [
        `The total rental price amounts to ${new Intl.NumberFormat('fr-FR').format(totalPrice)} DZD. Payment is settled directly between the Owner and the Tenant by any method they jointly agree upon. Zackvan Algeria provides no escrow, payment custody, or payment guarantee service.`,
        giftCardNote,
      ].filter(Boolean),
    },
    {
      title: '5. Tenant Liability — Full Assumption of Responsibility',
      body: [
        `The Tenant assumes FULL LEGAL AND FINANCIAL LIABILITY for any damage, deterioration, loss, theft, fire, or destruction affecting the leased vehicle, its equipment, or third-party property during the entire rental period, whatever the cause.`,
        `All repair, replacement, towing, impound, storage, expertise, and administrative costs arising from the Tenant's use of the vehicle shall be borne entirely by the Tenant and settled directly with the Owner according to market rates.`,
        `The Tenant is solely responsible for compliance with Algerian highway regulations throughout the rental period and shall bear all traffic fines, tolls, penalties, and legal consequences resulting from violations committed during said period.`,
        `In the event of an accident, the Tenant must immediately notify the Owner and file a statement with the competent Algerian authorities. Failure to do so may engage the Tenant's civil liability.`,
      ],
    },
    {
      title: '6. Insurance, Deposit and Handover Report',
      body: [
        `Any security deposit, insurance policy, deductible/excess arrangement, or fuel level agreement is established directly between the parties and recorded in a written handover report signed by both parties at pickup. The absence of such arrangements does not diminish in any way the liability assumed by the Tenant under Article 5 of this Contract.`,
      ],
    },
    {
      title: '7. Cancellation and Early Return',
      body: [
        `A booking request that is cancelled before the Owner's acceptance incurs no charge. After acceptance, cancellation and early-return terms are those agreed directly between the parties. Early return does not entitle the Tenant to any reimbursement unless expressly agreed with the Owner.`,
        applied > 0
          ? `Where a booking funded by a gift card is cancelled or rejected, the gift card amount reserved against it is returned to the Tenant's Zackvan account as platform credit, valid against any future booking. Gift card funds returned in this manner are not refundable to cash.`
          : null,
      ].filter(Boolean) as string[],
    },
    {
      title: '8. Role of the Platform',
      body: [
        `Zackvan Algeria's role is limited to hosting listings, providing search tools, and enabling the electronic conclusion of this Contract. Zackvan Algeria is not a party to the lease, grants no warranty as to the condition of the vehicle, and shall not be held liable for bodily injury, material damage, or financial loss arising from the execution of this Contract between the Owner and the Tenant.`,
      ],
    },
    {
      title: '9. Governing Law and Jurisdiction',
      body: [
        `This Contract is governed by the laws of the People's Democratic Republic of Algeria, including the provisions of the Algerian Civil Code governing lease contracts. Any dispute relating to the formation, interpretation, or execution of this Contract shall fall under the exclusive jurisdiction of the courts of the Owner's wilaya, without prejudice to mandatory rules of public order.`,
      ],
    },
    {
      title: '10. Electronic Signature and Evidentiary Value',
      body: [
        `In accordance with Algerian Law No. 15-04 laying down the general rules relating to electronic signature and certification, the parties agree that this electronic document carries the same evidentiary value as a paper contract signed by hand.`,
        `By typing their full legal name in the signature field and confirming acceptance, the Tenant expressly acknowledges having read and accepted every clause above — in particular the FULL LIABILITY ASSUMPTION of Article 5. The Tenant's identity, the exact timestamp, and the IP address of acceptance are recorded and sealed with a cryptographic hash to guarantee the integrity of this acceptance record.`,
      ],
    },
    {
      title: '11. Location Context',
      body: [
        MapLocationNote(caravan.wilaya),
        `The Tenant acknowledges the specific constraints of the destination environment and remains solely responsible for assessing route feasibility, weather conditions, and road access for the rented vehicle.`,
      ],
    },
  ];
}

function MapLocationNote(wilaya: string): string {
  const loc = SEED_HINT[wilaya];
  if (!loc) return `Destination wilaya: ${wilaya}.`;
  return `Destination wilaya: ${wilaya} — ${loc}`;
}

const SEED_HINT: Record<string, string> = {
  Djanet: 'Saharan region — extreme heat, long distances, limited services.',
  Tamanrasset: 'Mountainous Saharan region — carry sufficient water and fuel.',
  Illizi: 'Remote Saharan region — travel prepared with full autonomy.',
};
