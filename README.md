# Zackvan Algeria

Caravan rental marketplace + interactive tourism map of Algeria. Built with Next.js (App Router), TypeScript, Tailwind CSS, Firebase (Firestore + Auth), Cloudinary, and React-Leaflet.

## Features

- **Auth** — Email/password + Google sign-in with roles (`renter`, `owner`, `admin`) stored on the user profile.
- **Marketplace** — Caravan listings with specs (capacity, water tank, solar, bathroom/kitchen/AC), search & filters by wilaya, price, guests, type, and availability dates.
- **Interactive map** — `/map` renders an Algeria-centered Leaflet map with custom SVG markers for national parks, forests, and camping spots. Clicking a marker opens a detail drawer with terrain, water availability, safety notes, and traveler tips. The bundled seed data is available when Firestore is empty, while persistence is reserved for an authenticated admin seed operation.
- **Electronic contract system** — No escrow: at checkout the renter must accept a binding liability agreement, "sign" it by typing their full legal name, and submit. Acceptance is stored in Firestore with user ID, timestamp, IP, user-agent, contract version, and a SHA-256 content hash.
- **Gift cards** — Two instruments, both off-platform (they only reduce what a renter owes at handover, never move money):
  - *Wallet credit* — redeemable on any listing, partially, with unused balance carried forward.
  - *Trip voucher* — locked to one caravan and one date range.
  Admins mint and void cards from **Dashboard → Gift card admin**. Renters see their balance, cards, and a full redemption ledger under **Dashboard → Wallet & gift cards**. Redemption writes the booking, the contract, the card debit, and a ledger entry in a single atomic batch, so a card cannot be spent on two bookings. Cancelling or having a booking rejected returns the reserved amount to the card as platform credit (never as cash).
- **Owner dashboard** — Create/edit/publish listings, manage blocked availability ranges, accept/reject booking requests, mark trips completed; renters track their trips and can cancel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

### Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com), add a **Web app**, copy its config into `NEXT_PUBLIC_FIREBASE_*` vars.
2. Enable **Authentication → Sign-in methods**: Email/Password and Google.
3. Create a **Firestore** database (production mode).
4. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
   (Requires the Firebase CLI and a `.firebaserc` pointing at your project.)
5. To grant admin access for a user, set their `users/{uid}.role` document field to `admin` from the console.

Map locations are served from the bundled seed data when `mapLocations` is empty. This keeps public map browsing read-only; persistence is reserved for an authenticated admin seed operation.

### Cloudinary setup

1. Create a free Cloudinary account; note your cloud name.
2. Settings → API Keys: copy the API key and secret.
3. Fill `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` (server-only).

Uploads are signed server-side by `POST /api/cloudinary/sign` — the API secret never reaches the browser. Images upload directly from the client to Cloudinary with progress tracking.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web config |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Public cloud name |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | Public API key (signed uploads) |
| `CLOUDINARY_API_SECRET` | Server-only signing secret |
| `NEXT_PUBLIC_CLOUDINARY_FOLDER` | Upload folder, default `zakivan/caravans` |

## Project structure

```
app/
  layout.tsx                  Root layout (fonts, providers, navbar/footer)
  page.tsx                    Home (hero, search, featured caravans, map preview)
  globals.css                 Tailwind + leaflet/prose overrides
  providers.tsx               Auth provider wrapper
  caravans/page.tsx           Browse page (Suspense-wrapped browser)
  caravans/[id]/page.tsx      Detail + booking flow
  map/page.tsx                Full interactive tourism map
  login/, register/           Auth pages
  dashboard/
    page.tsx                  Listings / requests / trips tabs + availability manager
    caravans/new/page.tsx     Create listing
    caravans/[id]/edit/page.tsx
  api/cloudinary/sign/route.ts  Signed-upload endpoint
  api/ip/route.ts             Client IP detection for contracts
components/
  caravans/                   Cards, gallery, filters/browser, uploader, booking panel,
                              GiftCardRedeemer (checkout code entry)
  contract/                   ElectronicContractModal (liability agreement flow)
  map/                        MapClient (ssr:false), AlgeriaMap, LocationDrawer, types
  ui/                         Button, form primitives, Modal
  layout/                     Navbar, Footer
lib/
  firebase.ts                 SDK init + collection names
  types.ts                    All domain interfaces & unions
  constants.ts                Wilayas, feature lists, status/type metadata
  utils.ts                    Dates, currency, overlap checks, sha256
  contract.ts                 Contract template builder + version
  cloudinary.ts               Signature fetch + XHR upload helper
  auth-context.tsx            AuthProvider, useAuth, RequireAuth
  services/                   users, caravans, bookings, contracts, locations, giftcards
  data/map-seed.ts            16 curated Algerian locations
firestore.rules              Role-based security rules
firestore.indexes.json       Composite indexes (9 total)
firebase.json / .firebaserc  Firebase CLI deploy config
```

### Gift card rules at a glance

| Rule | Behaviour |
| --- | --- |
| Who can mint | Only `role: 'admin'`. Set your own role by hand in the Firestore console first. |
| Recipient | Optional. Blank recipient cards are public and can be claimed by the first signed-in user who spends them. |
| Code format | `ZK-XXXX-XXXX-XXXX`, ambiguous characters (`0/O/1/I/L`) excluded |
| Expiry | Optional, enforced on redemption. No scheduled job — expiry is evaluated at read time. |
| Partial spend | Yes. A wallet card keeps its remainder for future bookings. |
| Refunds | Cancel/reject restores exactly the recorded `heldAmount` as platform credit — never cash — and clears the hold, so a replay cannot credit twice. |
| Double-spend | Prevented by writing booking + contract + card debit + ledger row in one transaction, which pins the debit to a `heldBookingId`. One booking per card at a time. |
| Who can spend | Public cards can be claimed by any signed-in user; a card minted to an email address must be claimed by that address before it can be used. |
| Voucher scope | Enforced against the caravan ID and date range at redemption time. |

## Data model (Firestore)

| Collection | Key fields |
| --- | --- |
| `users` | `uid, email, displayName, phone, role, createdAt` |
| `caravans` | `ownerId, ownerName, ownerPhone, title, description, type, wilaya, commune, pricePerDay, specs{...}, extras[], images[], unavailableRanges[], published, timestamps` |
| `bookings` | `caravanId, caravanTitle, ownerId, renterId, startDate, endDate, days, pricePerDay, totalPrice, status, message, contractId, createdAt` |
| `contracts` | `bookingId, caravanId, ownerId, userId, fullNameSigned, ipAddress, userAgent, contractVersion, contentHash, liabilityAcknowledged, acceptedAt` |
| `mapLocations` | `name, type, wilaya, geo{lat,lng}, terrain, water, safetyNotes, tips[], bestSeason` |
| `giftCards` | `code (doc ID), kind, status, initialAmount, balance, issuedBy, recipientUid\|recipientEmail, caravanId, startDate, endDate, expiresAt` |
| `giftCardLedger` | `giftCardId, code, kind, amount, balanceAfter, bookingId, actorUid` |

Doc IDs in `giftCards` **are** the codes (`ZK-XXXX-XXXX-XXXX`), so a redemption lookup is a single document read.

## Notes & production considerations

- Availability conflict checks run before submission (pending + accepted statuses plus owner-blocked ranges). For strict guarantees under heavy concurrency, add a Cloud Function that re-validates overlaps transactionally on booking create.
- Removing photos from a listing only unlinks them; schedule periodic orphan cleanup via a scheduled function calling the Cloudinary destroy API with a server-side signature.
- Pages fetch data client-side to keep builds hermetic; for SEO-critical routes, migrate reads to Admin SDK server components with `force-dynamic`.
- Coordinates and safety notes in `lib/data/map-seed.ts` are curated starting points — verify locally before relying on them for trip planning.
