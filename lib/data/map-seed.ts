import type { MapLocation } from '@/lib/types';

export type SeedLocation = MapLocation;

export const MAP_LOCATIONS_SEED: SeedLocation[] = [
  {
    id: 'tassili-najjer',
    name: "Tassili n'Ajjer National Park",
    type: 'national_park',
    wilaya: 'Djanet',
    geo: { lat: 25.2, lng: 8.1 },
    description:
      'UNESCO World Heritage Saharan plateau of sandstone forests of rock, natural arches, and prehistoric rock art spanning thousands of years.',
    terrain: 'Sandstone plateau, deep canyons, erg dunes on the edges',
    water: 'none',
    safetyNotes:
      'Extreme desert environment. Travel only with a licensed local guide, a 4x4 convoy and satellite communication. Temperatures exceed 45°C in summer; nights can drop near freezing. Permits required from the park office in Djanet.',
    tips: [
      'Book guided tours from Djanet; independent off-track travel is prohibited.',
      'Carry at least 6L of water per person per day plus spare fuel.',
      'Best photography light is sunrise over the rock arches.',
    ],
    bestSeason: 'Oct – Apr',
  },
  {
    id: 'ahaggar',
    name: 'Ahaggar National Park',
    type: 'national_park',
    wilaya: 'Tamanrasset',
    geo: { lat: 23.06, lng: 5.63 },
    description:
      'Volcanic highland massif of the central Sahara, home to Mount Tahat (2,908 m), the Tuareg culture, and the famous Assekrem viewpoint.',
    terrain: 'Volcanic peaks, rocky plateaus, wadis',
    water: 'seasonal',
    safetyNotes:
      'Remote mountainous desert. Hire registered Tuareg guides from Tamanrasset. Fuel and mechanics are scarce — carry spares. Check current regional travel advisories before departure.',
    tips: [
      'Sunrise at Assekrem hermitage is the signature experience.',
      'Nights are cold at altitude even in spring — pack warm layers.',
      'Respect Tuareg customs; always ask before photographing people.',
    ],
    bestSeason: 'Nov – Mar',
  },
  {
    id: 'djurdjura',
    name: 'Djurdjura National Park',
    type: 'national_park',
    wilaya: 'Tizi Ouzou',
    geo: { lat: 36.45, lng: 4.34 },
    description:
      'Grand Kabylie mountain range with cedar forests, limestone escarpments, gorges, and the macaque-filled Tikjda resort area.',
    terrain: 'High limestone ridges up to 2,308 m, cedar and holm-oak forest',
    water: 'potable',
    safetyNotes:
      'Marked trails around Tikjda are safe for families. Higher routes require proper hiking gear; weather changes fast in winter with snow above 1,500 m.',
    tips: [
      'Tikjda has climbing routes and via ferrata in summer.',
      'Barbary macaques are protected — do not feed them.',
      'Weekends are busy; arrive early for parking at trailheads.',
    ],
    bestSeason: 'Apr – Jun, Sep – Nov',
  },
  {
    id: 'chrea',
    name: 'Chréa National Park',
    type: 'national_park',
    wilaya: 'Blida',
    geo: { lat: 36.43, lng: 2.87 },
    description:
      'Atlas cedar forest south of Algiers with ski slopes in winter, panoramic viewpoints over the Mitidja plain, and easy family trails.',
    terrain: 'Cedar forest, mountain slopes to 1,629 m',
    water: 'potable',
    safetyNotes:
      'Road to Chréa is steep and occasionally icy or foggy in winter — chains recommended. Ski lift infrastructure is basic; check operating status locally.',
    tips: [
      'Snow play near Chréa village is a popular winter day trip from Algiers.',
      'Combine with the caves of Beni Haroun if open.',
      'Picnic areas fill up on Fridays — come before 10am.',
    ],
    bestSeason: 'Year-round (ski Dec – Feb)',
  },
  {
    id: 'taza',
    name: 'Taza National Park',
    type: 'national_park',
    wilaya: 'Jijel',
    geo: { lat: 36.53, lng: 5.55 },
    description:
      'Coastal park where forested mountains plunge into the Mediterranean — the legendary Corniche Jijelienne, grottos, and hidden coves.',
    terrain: 'Limestone cliffs, pine and cork-oak forest, marine coves',
    water: 'potable',
    safetyNotes:
      'Cliff-top roads are winding; drive cautiously in fog. Swimming only at guarded beaches. The Gouffre cave visits require a guide.',
    tips: [
      'Drive the RN11 corniche between Jijel and Skikda slowly — it is one of Algeria’s most scenic roads.',
      'Gravel beach coves are reachable by boat trips from Ziama Mansouriah.',
    ],
    bestSeason: 'May – Sep',
  },
  {
    id: 'gouraya',
    name: 'Gouraya National Park',
    type: 'national_park',
    wilaya: 'Béjaïa',
    geo: { lat: 36.76, lng: 5.09 },
    description:
      'Park rising directly above the Bay of Béjaïa, combining Mediterranean scrub, the Gouraya peak, Cap Carbon cliffs, and sandy beaches.',
    terrain: 'Coastal mountains to 667 m, cliffs and coves',
    water: 'potable',
    safetyNotes:
      'Trails from the Yemma Gouraya sanctuary are steep but popular. Keep valuables hidden at unattended beaches.',
    tips: [
      'The hike to Yemma Gouraya shrine gives a full bay panorama.',
      'Cap Carbon lighthouse walk at sunset is unforgettable.',
      'Aiguades beach is the easiest family stop inside the park.',
    ],
    bestSeason: 'May – Oct',
  },
  {
    id: 'el-kala',
    name: 'El Kala National Park',
    type: 'national_park',
    wilaya: 'El Tarf',
    geo: { lat: 36.84, lng: 8.44 },
    description:
      'Biosphere reserve of lakes, marshes, cork oak forests and dunes on the Tunisian border — Algeria’s richest birdwatching destination.',
    terrain: 'Wetlands, lakes (Oubeira, Tonga), cork-oak forest, coastal dunes',
    water: 'potable',
    safetyNotes:
      'Some lake areas are strictly protected — access with authorized guides only. Mosquitoes are abundant in summer; bring repellent.',
    tips: [
      'Lake Oubeira boat trips offer heron and buffalo sightings.',
      'Mango and coral beaches nearby mix lake and sea swimming.',
      'Binoculars are essential — over 200 bird species recorded.',
    ],
    bestSeason: 'Mar – Jun, Sep – Nov',
  },
  {
    id: 'belezma',
    name: 'Belezma National Park',
    type: 'national_park',
    wilaya: 'Batna',
    geo: { lat: 35.56, lng: 6.3 },
    description:
      'Atlas massif above Batna with cedar groves, Roman ruins at the gates, and cool summer camping among the peaks.',
    terrain: 'Mountain range to 2,136 m, cedar and juniper forest',
    water: 'seasonal',
    safetyNotes:
      'Springs dry up by late summer — carry water. Winters bring heavy snow and closed passes.',
    tips: [
      'Combine with Timgad Roman ruins 40 km away.',
      'Ghoufi balconies canyon makes a great side trip.',
    ],
    bestSeason: 'Apr – Oct',
  },
  {
    id: 'tlemcen-park',
    name: 'Tlemcen National Park',
    type: 'national_park',
    wilaya: 'Tlemcen',
    geo: { lat: 34.87, lng: -1.33 },
    description:
      'Forested plateau with waterfalls, the Alcazar ruins, Lalla Setti cliffs, and the architectural gems of Tlemcen’s Islamic heritage.',
    terrain: 'Plateau cliffs, pine and cedar forest, cascades',
    water: 'potable',
    safetyNotes:
      'Cliff-edge viewpoints at Lalla Setti lack barriers in places — keep children close. Fog rolls in fast at dusk.',
    tips: [
      'El Ourit waterfalls are lit at night in season.',
      'Visit the Great Mosque and Sidi Boumediene complex in town.',
    ],
    bestSeason: 'Apr – Oct',
  },
  {
    id: 'theniet-el-had',
    name: 'Théniet El Had National Park',
    type: 'national_park',
    wilaya: 'Tissemsilt',
    geo: { lat: 35.44, lng: 1.71 },
    description:
      'The southernmost cedar forest of the Atlas on Mount Méchera Nouceur, with springs, stone pines, and quiet trekking circuits.',
    terrain: 'Cedar and pine forest, mountain ridge to 1,983 m',
    water: 'potable',
    safetyNotes:
      'Forest fire risk is severe in July–August — no open flames outside designated areas.',
    tips: [
      'Aurore viewpoint sunrise circuit takes about 3 hours return.',
      'Locally produced honey and chestnuts are sold at park entrances in autumn.',
    ],
    bestSeason: 'Apr – Jun, Sep – Oct',
  },
  {
    id: 'foret-bainem',
    name: 'Baïnem Forest',
    type: 'forest',
    wilaya: 'Alger',
    geo: { lat: 36.77, lng: 2.93 },
    description:
      'Pine-covered coastal hills west of Algiers with picnic clearances, fitness trails, and views over the Bay of Alger.',
    terrain: 'Rolling pine hills, marked footpaths',
    water: 'non_potable',
    safetyNotes:
      'Urban-adjacent forest — avoid leaving valuables in vehicles and stick to populated clearings after dark.',
    tips: [
      'Popular weekend barbecue spot; arrive early to claim tables.',
      'Trail down to Sidi Ferruch beach takes about an hour.',
    ],
    bestSeason: 'Sep – May',
  },
  {
    id: 'foret-yakouren',
    name: 'Yakouren Forest',
    type: 'forest',
    wilaya: 'Tizi Ouzou',
    geo: { lat: 36.66, lng: 4.39 },
    description:
      'Legendary oak and maquis forest of Kabylie, threaded with springs, shepherd paths, and traditional village terraces.',
    terrain: 'Oak forest, ravines, stone villages',
    water: 'potable',
    safetyNotes:
      'Paths are informal — download offline maps. Hunters are active in autumn; wear bright clothing during hunting season.',
    tips: [
      'Village guesthouses offer authentic Kabyle couscous dinners.',
      'Spring brings wild orchids along the Azazga–Yakouren track.',
    ],
    bestSeason: 'Apr – Nov',
  },
  {
    id: 'tikjda-camp',
    name: 'Tikjda Camping Area',
    type: 'campsite',
    wilaya: 'Bouira',
    geo: { lat: 36.43, lng: 4.3 },
    description:
      'Established camping hub inside Djurdjura National Park with rental chalets, marked trailheads, and ranger presence.',
    terrain: 'Flat gravel pitches among cedars at 1,450 m',
    water: 'potable',
    safetyNotes:
      'Nights are cold year-round (below 5°C possible). Snow closes access December–February; check road status with park rangers.',
    tips: [
      'Ranger station can arrange certified guides for Kali N’Tizoulaghar traverse.',
      'Mobile signal is good at the entrance, patchy deeper in the park.',
    ],
    bestSeason: 'May – Oct',
  },
  {
    id: 'taghit-camp',
    name: 'Taghit Oasis Campground',
    type: 'campsite',
    wilaya: 'Béni Abbès',
    geo: { lat: 30.94, lng: -0.24 },
    description:
      'Classic Sahara experience beside the great erg dunes and the Taghit palm grove — camel treks, sandboarding and stargazing.',
    terrain: 'Erg dune field meeting palm oasis and rocky hamada',
    water: 'non_potable',
    safetyNotes:
      'Desert nights are freezing in winter and days scorching in summer. Never camp deep in the ergs without a guide; wind storms can erase tracks within hours.',
    tips: [
      'Local camps provide tents, mint tea and Tuareg drum evenings.',
      'The old ksar viewpoint over the oasis at sunset is a must.',
      'Fuel up in Béni Abbès before arriving.',
    ],
    bestSeason: 'Oct – Apr',
  },
  {
    id: 'corniche-djidjelienne-camp',
    name: 'Corniche Djidjelienne Wild Camps',
    type: 'campsite',
    wilaya: 'Jijel',
    geo: { lat: 36.84, lng: 5.74 },
    description:
      'String of clifftop meadows and sheltered coves along the Sidi Abdelaziz coast favored by van travelers for wild camping.',
    terrain: 'Coastal grass terraces above limestone cliffs',
    water: 'seasonal',
    safetyNotes:
      'Stay back from cliff edges weakened by erosion. In winter storms, swell reaches upper ledges. Ask farmers before pitching on private land.',
    tips: [
      'Sunrise over the Mediterranean here rivals any Aegean view.',
      'Buy fresh sardines directly from Sidi Abdelaziz fishing port.',
      'Access tracks are dirt — fine in dry weather only.',
    ],
    bestSeason: 'May – Sep',
  },
  {
    id: 'timimoun-oasis',
    name: 'Timimoun Red Oasis',
    type: 'campsite',
    wilaya: 'Timimoun',
    geo: { lat: 29.26, lng: 0.23 },
    description:
      'The “red oasis” ringed by ochre dunes and ancient ksour — a gateway camp base for the Gourara sebkha circuits.',
    terrain: 'Dune belt overlooking a vast palm grove and salt lake',
    water: 'seasonal',
    safetyNotes:
      'Foggaras (traditional channels) make the ground unstable near the sebkha — camp on firm sand only. Midday heat is dangerous in summer.',
    tips: [
      'Hotel-to-desert day camps can be arranged with local agencies.',
      'The salt lake fills briefly after rains — a surreal mirror effect.',
      'Try the local dates: Timimoun deglet nour are prized nationwide.',
    ],
    bestSeason: 'Nov – Mar',
  },
  {
    id: 'gouraya-coast-camp',
    name: 'Gouraya Coast Campgrounds',
    type: 'campsite',
    wilaya: 'Béjaïa',
    geo: { lat: 36.78, lng: 5.1 },
    description:
      'Sea-facing pitches between the Gouraya cliffs and the turquoise coves west of Béjaïa.',
    terrain: 'Mediterranean scrub, rocky coves and small sandy terraces',
    water: 'potable',
    safetyNotes:
      'Use established pitches and keep clear of cliff edges. Coastal roads are narrow; avoid arriving after dark.',
    tips: [
      'Leave early for Cap Carbon viewpoints before summer traffic builds.',
      'Ask locally about legal access to each cove before setting up.',
      'The best swimming conditions are usually June through September.',
    ],
    bestSeason: 'May – Oct',
  },
  {
    id: 'belezma-forest-trails',
    name: 'Belezma Cedar Trails',
    type: 'forest',
    wilaya: 'Batna',
    geo: { lat: 35.58, lng: 6.18 },
    description:
      'High cedar and juniper trails on the Belezma massif, with cool air and wide Aurès views.',
    terrain: 'Mountain forest, limestone ridges and open pastoral clearings',
    water: 'seasonal',
    safetyNotes:
      'Stay on marked routes and check snow and road conditions in winter. Carry water away from developed sites.',
    tips: [
      'Spring is best for flowers and clear visibility across the Aurès.',
      'Pack layers: temperatures drop quickly after sunset.',
      'Use a local guide for longer ridge routes.',
    ],
    bestSeason: 'Apr – Oct',
  },
  {
    id: 'el-kala-lake-camp',
    name: 'El Kala Lakeside Camp',
    type: 'campsite',
    wilaya: 'El Tarf',
    geo: { lat: 36.86, lng: 8.45 },
    description:
      'A wetland gateway near the lakes and forests of El Kala, popular with birdwatchers and slow-travel campers.',
    terrain: 'Lagoons, cork-oak woodland and sandy Mediterranean shoreline',
    water: 'potable',
    safetyNotes:
      'Respect protected wetland boundaries and wildlife closures. Mosquito protection is important in summer.',
    tips: [
      'Bring binoculars for flamingos and migratory waterbirds.',
      'Keep food sealed around the forest edge.',
      'Ask park staff which lake paths are open after heavy rain.',
    ],
    bestSeason: 'Mar – Jun, Sep – Nov',
  },
  {
    id: 'tlemcen-plateau',
    name: 'Tlemcen Plateau Forest',
    type: 'forest',
    wilaya: 'Tlemcen',
    geo: { lat: 34.87, lng: -1.32 },
    description:
      'Pine and oak woodland above Tlemcen with shaded picnic areas, limestone scenery and nearby heritage sites.',
    terrain: 'Rolling forest plateau, limestone valleys and shaded picnic clearings',
    water: 'potable',
    safetyNotes:
      'Use designated fire areas only and keep vehicles on signed tracks. Summer afternoons can be very hot.',
    tips: [
      'Combine the forest with a visit to the waterfalls and Mansourah heritage sites.',
      'Weekday mornings are quieter and cooler.',
      'Carry a small rubbish bag; facilities are limited outside the main areas.',
    ],
    bestSeason: 'Mar – Jun, Sep – Nov',
  },
];
