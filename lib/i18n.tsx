'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const LANGUAGES = [
  { code: 'en', nativeLabel: 'English' },
  { code: 'ar', nativeLabel: 'العربية' },
  { code: 'fr', nativeLabel: 'Français' },
  { code: 'de', nativeLabel: 'Deutsch' },
  { code: 'es', nativeLabel: 'Español' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

const EN = {
  'nav.home': 'Home',
  'nav.caravans': 'Caravans',
  'nav.map': 'Nature Map',
  'nav.login': 'Log in',
  'nav.getStarted': 'Get started',
  'nav.dashboard': 'Dashboard',
  'nav.admin': 'Admin workspace',
  'nav.signOut': 'Sign out',
  'nav.toggleMenu': 'Toggle menu',
  'nav.language': 'Language',
  'footer.description': "Algeria's caravan rental marketplace with a built-in tourism map of national parks, forests, and safe camping spots.",
  'footer.explore': 'Explore',
  'footer.browse': 'Browse caravans',
  'footer.map': 'Interactive nature map',
  'footer.owner': 'Owner dashboard',
  'footer.trust': 'Trust & Safety',
  'footer.contract': 'Every booking is sealed with a binding electronic contract.',
  'footer.verified': 'Listings verified across all 58 wilayas.',
  'footer.copyright': 'Zackvan facilitates digital contracting between owners and renters; payments are settled directly between the parties and no funds are held by the platform.',
  'home.badge': '58 wilayas · One platform',
  'home.heroTitle1': 'Rent a caravan.',
  'home.heroTitle2': "Discover Algeria's wild side.",
  'home.heroBody': 'From the Djurdjura cedars to the Tassili dunes — book vetted caravans with binding digital contracts, and explore every national park and safe campsite on our interactive map.',
  'home.allWilayas': 'All wilayas',
  'home.pickup': 'Pickup date',
  'home.return': 'Return date',
  'home.search': 'Search',
  'home.roadReady': 'Road-ready stays',
  'home.roadCopy': 'Your next wild weekend starts here.',
  'home.binding': 'Binding e-contracts',
  'home.bindingSub': 'Every booking sealed with legal liability terms',
  'home.direct': 'Direct owner contact',
  'home.directSub': 'No middlemen fees on your rental price',
  'home.curated': 'Curated nature map',
  'home.curatedSub': 'Parks, forests & safe camping verified',
  'home.featured': 'Featured caravans',
  'home.featuredSub': 'Ready-to-roll homes across the country',
  'home.viewAll': 'View all',
  'home.noCaravans': 'No caravans listed yet',
  'home.firstList': 'Be the first — list your caravan and reach travelers nationwide.',
  'home.list': 'List my caravan',
  'home.mapBadge': 'Interactive map',
  'home.mapTitle': 'Plan every stop before you leave',
  'home.mapBody': "Tap any marker to see terrain type, water availability, safety notes, and tips from fellow travelers for Algeria's national parks, forests, and trusted camping spots.",
  'home.mapLine1': "Tassili n'Ajjer, Ahaggar, Djurdjura, Chréa…",
  'home.mapLine2': 'Water sources & seasonal warnings per location',
  'home.mapLine3': 'One tap to find caravans in the same wilaya',
  'home.openMap': 'Open the full map',
  'home.how': 'How Zackvan works',
  'home.step': 'Step',
  'home.step1Title': 'Find your caravan',
  'home.step1Body': 'Filter by wilaya, dates, capacity, and equipment — solar panels, water tanks, bathrooms.',
  'home.step2Title': 'Sign the e-contract',
  'home.step2Body': 'A binding digital agreement protects both sides: clear terms, zero cash surprises.',
  'home.step3Title': 'Hit the road',
  'home.step3Body': 'Use our nature map to plan national parks, forests, and safe campsites along the way.',
  'home.own': 'Own a caravan?',
  'home.ownBody': 'Turn idle months into income. List in minutes, manage bookings, and rent with legally binding contracts.',
  'home.startListing': 'Start listing',
  'browse.title': 'Browse caravans',
  'browse.keyword': 'Keyword',
  'browse.keywordPlaceholder': 'e.g. solar, family, desert…',
  'browse.wilaya': 'Wilaya',
  'browse.allWilayas': 'All wilayas',
  'browse.minPrice': 'Min price (DA)',
  'browse.maxPrice': 'Max price (DA)',
  'browse.guests': 'Guests',
  'browse.any': 'Any',
  'browse.type': 'Type',
  'browse.allTypes': 'All types',
  'browse.availableFrom': 'Available from',
  'browse.until': 'Until',
  'browse.clear': 'Clear all filters',
  'browse.searching': 'Searching listings…',
  'browse.availableOne': 'caravan available',
  'browse.availableMany': 'caravans available',
  'browse.filters': 'Filters',
  'browse.newest': 'Newest first',
  'browse.priceLow': 'Price: low to high',
  'browse.priceHigh': 'Price: high to low',
  'browse.showResults': 'Show {count} results',
  'browse.noMatch': 'No caravans match your filters',
  'browse.widen': 'Try widening the dates or clearing some criteria.',
  'map.title': 'Nature & Camping Map',
  'map.search': 'Search a park, forest, wilaya…',
  'map.all': 'All',
  'map.locations': 'Locations',
  'map.noMatch': 'No locations match your search.',
  'map.error': 'Could not load map locations. Check your connection and refresh.',
  'map.loading': 'Loading map of Algeria…',
  'map.park': 'National park',
  'map.forest': 'Forest',
  'map.campsite': 'Campsite',
  'map.close': 'Close details',
  'map.terrain': 'Terrain',
  'map.water': 'Water',
  'map.safety': 'Safety notes',
  'map.tips': 'Traveler tips',
  'map.bestSeason': 'Best season',
  'map.findCaravans': 'Find caravans in {wilaya}',
  'auth.welcome': 'Welcome back',
  'auth.loginBody': 'Sign in to book caravans and manage your listings.',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.signIn': 'Sign in',
  'auth.or': 'or',
  'auth.google': 'Continue with Google',
  'auth.new': 'New to Zackvan?',
  'auth.create': 'Create an account',
  'auth.loginFailed': 'Login failed.',
  'auth.googleFailed': 'Google sign-in failed.',
  'register.title': 'Create your account',
  'register.subtitle': "Join Algeria's caravan community — free, in two minutes.",
  'register.joinAs': 'I am joining as…',
  'register.renterTitle': 'I want to rent',
  'register.renterBody': 'Book caravans and explore Algeria',
  'register.ownerTitle': 'I want to list',
  'register.ownerBody': 'Rent out my caravan and earn',
  'register.fullName': 'Full name',
  'register.phone': 'Phone',
  'register.phoneHint': 'Used by owners/renters to coordinate handover.',
  'register.createAs': 'Create account as {role}',
  'register.google': 'Sign up with Google',
  'register.already': 'Already have an account?',
} as const;

export type TranslationKey = keyof typeof EN;

type Dictionary = Record<TranslationKey, string>;

const TRANSLATIONS: Record<Language, Dictionary> = {
  en: EN,
  fr: {
    ...EN,
    'nav.home': 'Accueil', 'nav.caravans': 'Camping-cars', 'nav.map': 'Carte nature', 'nav.login': 'Se connecter', 'nav.getStarted': 'Commencer', 'nav.dashboard': 'Tableau de bord', 'nav.admin': 'Espace administrateur', 'nav.signOut': 'Se déconnecter', 'nav.toggleMenu': 'Ouvrir le menu', 'nav.language': 'Langue',
    'footer.description': 'La marketplace algérienne de location de camping-cars avec une carte touristique intégrée des parcs nationaux, forêts et campings sûrs.', 'footer.explore': 'Explorer', 'footer.browse': 'Parcourir les camping-cars', 'footer.map': 'Carte nature interactive', 'footer.owner': 'Tableau de bord propriétaire', 'footer.trust': 'Confiance et sécurité', 'footer.contract': 'Chaque réservation est scellée par un contrat électronique opposable.', 'footer.verified': 'Annonces vérifiées dans les 58 wilayas.', 'footer.copyright': 'Zackvan facilite les contrats numériques entre propriétaires et voyageurs ; les paiements sont réglés directement entre les parties et aucun fonds n’est détenu par la plateforme.',
    'home.badge': '58 wilayas · Une plateforme', 'home.heroTitle1': 'Louez un camping-car.', 'home.heroTitle2': 'Découvrez le côté sauvage de l’Algérie.', 'home.heroBody': 'Des cèdres du Djurdjura aux dunes du Tassili — réservez des camping-cars vérifiés avec des contrats numériques opposables et explorez chaque parc national et camping sûr sur notre carte interactive.', 'home.allWilayas': 'Toutes les wilayas', 'home.pickup': 'Date de retrait', 'home.return': 'Date de retour', 'home.search': 'Rechercher', 'home.roadReady': 'Séjours prêts pour la route', 'home.roadCopy': 'Votre prochain week-end sauvage commence ici.', 'home.binding': 'Contrats électroniques opposables', 'home.bindingSub': 'Chaque réservation avec des conditions juridiquement claires', 'home.direct': 'Contact direct du propriétaire', 'home.directSub': 'Aucun frais d’intermédiaire sur votre location', 'home.curated': 'Carte nature sélectionnée', 'home.curatedSub': 'Parcs, forêts et campings sûrs vérifiés', 'home.featured': 'Camping-cars à la une', 'home.featuredSub': 'Des maisons prêtes à partir partout dans le pays', 'home.viewAll': 'Tout voir', 'home.noCaravans': 'Aucun camping-car publié pour le moment', 'home.firstList': 'Soyez le premier — publiez votre camping-car et touchez les voyageurs du pays.', 'home.list': 'Publier mon camping-car', 'home.mapBadge': 'Carte interactive', 'home.mapTitle': 'Planifiez chaque étape avant de partir', 'home.mapBody': 'Touchez un marqueur pour voir le terrain, la disponibilité de l’eau, les consignes de sécurité et les conseils de voyageurs pour les parcs nationaux, forêts et campings de confiance algériens.', 'home.mapLine1': 'Tassili n’Ajjer, Ahaggar, Djurdjura, Chréa…', 'home.mapLine2': 'Sources d’eau et alertes saisonnières pour chaque lieu', 'home.mapLine3': 'Un clic pour trouver les camping-cars de la même wilaya', 'home.openMap': 'Ouvrir la carte complète', 'home.how': 'Comment fonctionne Zackvan', 'home.step': 'Étape', 'home.step1Title': 'Trouvez votre camping-car', 'home.step1Body': 'Filtrez par wilaya, dates, capacité et équipements — panneaux solaires, réservoirs d’eau, sanitaires.', 'home.step2Title': 'Signez le contrat électronique', 'home.step2Body': 'Un accord numérique opposable protège les deux parties : des conditions claires, sans surprise en espèces.', 'home.step3Title': 'Prenez la route', 'home.step3Body': 'Utilisez notre carte nature pour planifier parcs nationaux, forêts et campings sûrs.', 'home.own': 'Vous êtes propriétaire ?', 'home.ownBody': 'Transformez les mois creux en revenus. Publiez en quelques minutes, gérez les réservations et louez avec des contrats opposables.', 'home.startListing': 'Commencer à publier',
    'browse.title': 'Parcourir les camping-cars', 'browse.keyword': 'Mot-clé', 'browse.keywordPlaceholder': 'ex. solaire, famille, désert…', 'browse.wilaya': 'Wilaya', 'browse.allWilayas': 'Toutes les wilayas', 'browse.minPrice': 'Prix minimum (DA)', 'browse.maxPrice': 'Prix maximum (DA)', 'browse.guests': 'Voyageurs', 'browse.any': 'Tous', 'browse.type': 'Type', 'browse.allTypes': 'Tous les types', 'browse.availableFrom': 'Disponible à partir du', 'browse.until': 'Jusqu’au', 'browse.clear': 'Effacer tous les filtres', 'browse.searching': 'Recherche des annonces…', 'browse.availableOne': 'camping-car disponible', 'browse.availableMany': 'camping-cars disponibles', 'browse.filters': 'Filtres', 'browse.newest': 'Plus récents', 'browse.priceLow': 'Prix : croissant', 'browse.priceHigh': 'Prix : décroissant', 'browse.showResults': 'Afficher {count} résultats', 'browse.noMatch': 'Aucun camping-car ne correspond à vos filtres', 'browse.widen': 'Élargissez les dates ou supprimez certains critères.',
    'map.title': 'Carte nature et camping', 'map.search': 'Rechercher un parc, une forêt, une wilaya…', 'map.all': 'Tous', 'map.locations': 'Lieux', 'map.noMatch': 'Aucun lieu ne correspond à votre recherche.', 'map.error': 'Impossible de charger les lieux. Vérifiez votre connexion et actualisez.', 'map.loading': 'Chargement de la carte de l’Algérie…', 'map.park': 'Parc national', 'map.forest': 'Forêt', 'map.campsite': 'Camping', 'map.close': 'Fermer les détails', 'map.terrain': 'Terrain', 'map.water': 'Eau', 'map.safety': 'Consignes de sécurité', 'map.tips': 'Conseils de voyageurs', 'map.bestSeason': 'Meilleure saison', 'map.findCaravans': 'Trouver des camping-cars à {wilaya}',
    'auth.welcome': 'Bon retour', 'auth.loginBody': 'Connectez-vous pour réserver un camping-car et gérer vos annonces.', 'auth.email': 'E-mail', 'auth.password': 'Mot de passe', 'auth.signIn': 'Se connecter', 'auth.or': 'ou', 'auth.google': 'Continuer avec Google', 'auth.new': 'Nouveau sur Zackvan ?', 'auth.create': 'Créer un compte', 'auth.loginFailed': 'Échec de la connexion.', 'auth.googleFailed': 'Échec de la connexion Google.', 'register.title': 'Créer votre compte', 'register.subtitle': 'Rejoignez la communauté algérienne du camping-car — gratuitement, en deux minutes.', 'register.joinAs': 'Je m’inscris en tant que…', 'register.renterTitle': 'Je veux louer', 'register.renterBody': 'Réserver un camping-car et explorer l’Algérie', 'register.ownerTitle': 'Je veux publier', 'register.ownerBody': 'Louer mon camping-car et gagner de l’argent', 'register.fullName': 'Nom complet', 'register.phone': 'Téléphone', 'register.phoneHint': 'Utilisé par les propriétaires et voyageurs pour organiser la remise des clés.', 'register.createAs': 'Créer un compte en tant que {role}', 'register.google': 'S’inscrire avec Google', 'register.already': 'Vous avez déjà un compte ?',
  },
  de: {
    ...EN,
    'nav.home': 'Startseite', 'nav.caravans': 'Camper', 'nav.map': 'Naturkarte', 'nav.login': 'Anmelden', 'nav.getStarted': 'Loslegen', 'nav.dashboard': 'Dashboard', 'nav.admin': 'Admin-Bereich', 'nav.signOut': 'Abmelden', 'nav.toggleMenu': 'Menü öffnen', 'nav.language': 'Sprache',
    'footer.description': 'Algeriens Camper-Vermietungsplattform mit integrierter Tourismuskarte für Nationalparks, Wälder und sichere Campingplätze.', 'footer.explore': 'Entdecken', 'footer.browse': 'Camper durchsuchen', 'footer.map': 'Interaktive Naturkarte', 'footer.owner': 'Vermieter-Dashboard', 'footer.trust': 'Vertrauen & Sicherheit', 'footer.contract': 'Jede Buchung wird durch einen verbindlichen elektronischen Vertrag besiegelt.', 'footer.verified': 'Angebote in allen 58 Wilayas geprüft.', 'footer.copyright': 'Zackvan erleichtert digitale Verträge zwischen Vermietern und Mietern; Zahlungen werden direkt zwischen den Parteien abgewickelt und die Plattform verwahrt keine Gelder.',
    'home.badge': '58 Wilayas · Eine Plattform', 'home.heroTitle1': 'Miete einen Camper.', 'home.heroTitle2': 'Entdecke Algeriens wilde Seite.', 'home.heroBody': 'Von den Zedern des Djurdjura bis zu den Dünen des Tassili – buche geprüfte Camper mit verbindlichen digitalen Verträgen und entdecke jeden Nationalpark und sicheren Campingplatz auf unserer interaktiven Karte.', 'home.allWilayas': 'Alle Wilayas', 'home.pickup': 'Abholdatum', 'home.return': 'Rückgabedatum', 'home.search': 'Suchen', 'home.roadReady': 'Bereit für die Straße', 'home.roadCopy': 'Dein nächstes wildes Wochenende beginnt hier.', 'home.binding': 'Verbindliche E-Verträge', 'home.bindingSub': 'Jede Buchung mit klaren rechtlichen Bedingungen', 'home.direct': 'Direkter Kontakt zum Vermieter', 'home.directSub': 'Keine Vermittlungsgebühren auf deinen Mietpreis', 'home.curated': 'Kuratierte Naturkarte', 'home.curatedSub': 'Parks, Wälder und sichere Campingplätze geprüft', 'home.featured': 'Empfohlene Camper', 'home.featuredSub': 'Startklare mobile Zuhause im ganzen Land', 'home.viewAll': 'Alle ansehen', 'home.noCaravans': 'Noch keine Camper gelistet', 'home.firstList': 'Sei der Erste – liste deinen Camper und erreiche Reisende im ganzen Land.', 'home.list': 'Meinen Camper inserieren', 'home.mapBadge': 'Interaktive Karte', 'home.mapTitle': 'Plane jeden Halt vor deiner Abfahrt', 'home.mapBody': 'Tippe auf einen Marker, um Gelände, Wasserverfügbarkeit, Sicherheitshinweise und Tipps von Reisenden für Algeriens Nationalparks, Wälder und vertrauenswürdige Campingplätze zu sehen.', 'home.mapLine1': 'Tassili n’Ajjer, Ahaggar, Djurdjura, Chréa…', 'home.mapLine2': 'Wasserquellen und saisonale Warnungen je Ort', 'home.mapLine3': 'Mit einem Tipp Camper in derselben Wilaya finden', 'home.openMap': 'Vollständige Karte öffnen', 'home.how': 'So funktioniert Zackvan', 'home.step': 'Schritt', 'home.step1Title': 'Finde deinen Camper', 'home.step1Body': 'Filtere nach Wilaya, Datum, Kapazität und Ausstattung – Solarpanels, Wassertanks, Badezimmer.', 'home.step2Title': 'Unterschreibe den E-Vertrag', 'home.step2Body': 'Eine verbindliche digitale Vereinbarung schützt beide Seiten: klare Bedingungen, keine Überraschungen mit Bargeld.', 'home.step3Title': 'Auf die Straße', 'home.step3Body': 'Nutze unsere Naturkarte, um Nationalparks, Wälder und sichere Campingplätze zu planen.', 'home.own': 'Besitzt du einen Camper?', 'home.ownBody': 'Mach aus ungenutzten Monaten Einkommen. In wenigen Minuten inserieren, Buchungen verwalten und mit verbindlichen Verträgen vermieten.', 'home.startListing': 'Inserat starten',
    'browse.title': 'Camper durchsuchen', 'browse.keyword': 'Suchbegriff', 'browse.keywordPlaceholder': 'z. B. Solar, Familie, Wüste…', 'browse.wilaya': 'Wilaya', 'browse.allWilayas': 'Alle Wilayas', 'browse.minPrice': 'Mindestpreis (DA)', 'browse.maxPrice': 'Höchstpreis (DA)', 'browse.guests': 'Gäste', 'browse.any': 'Beliebig', 'browse.type': 'Typ', 'browse.allTypes': 'Alle Typen', 'browse.availableFrom': 'Verfügbar ab', 'browse.until': 'Bis', 'browse.clear': 'Alle Filter löschen', 'browse.searching': 'Angebote werden gesucht…', 'browse.availableOne': 'Camper verfügbar', 'browse.availableMany': 'Camper verfügbar', 'browse.filters': 'Filter', 'browse.newest': 'Neueste zuerst', 'browse.priceLow': 'Preis: aufsteigend', 'browse.priceHigh': 'Preis: absteigend', 'browse.showResults': '{count} Ergebnisse anzeigen', 'browse.noMatch': 'Keine Camper passen zu deinen Filtern', 'browse.widen': 'Erweitere den Zeitraum oder entferne einige Kriterien.',
    'map.title': 'Natur- und Campingkarte', 'map.search': 'Park, Wald oder Wilaya suchen…', 'map.all': 'Alle', 'map.locations': 'Orte', 'map.noMatch': 'Keine Orte entsprechen deiner Suche.', 'map.error': 'Orte konnten nicht geladen werden. Verbindung prüfen und aktualisieren.', 'map.loading': 'Algerienkarte wird geladen…', 'map.park': 'Nationalpark', 'map.forest': 'Wald', 'map.campsite': 'Campingplatz', 'map.close': 'Details schließen', 'map.terrain': 'Gelände', 'map.water': 'Wasser', 'map.safety': 'Sicherheitshinweise', 'map.tips': 'Reisetipps', 'map.bestSeason': 'Beste Reisezeit', 'map.findCaravans': 'Camper in {wilaya} finden',
    'auth.welcome': 'Willkommen zurück', 'auth.loginBody': 'Melde dich an, um Camper zu buchen und deine Inserate zu verwalten.', 'auth.email': 'E-Mail', 'auth.password': 'Passwort', 'auth.signIn': 'Anmelden', 'auth.or': 'oder', 'auth.google': 'Mit Google fortfahren', 'auth.new': 'Neu bei Zackvan?', 'auth.create': 'Konto erstellen', 'auth.loginFailed': 'Anmeldung fehlgeschlagen.', 'auth.googleFailed': 'Google-Anmeldung fehlgeschlagen.', 'register.title': 'Konto erstellen', 'register.subtitle': 'Werde Teil der algerischen Camper-Community – kostenlos und in zwei Minuten.', 'register.joinAs': 'Ich melde mich an als …', 'register.renterTitle': 'Ich möchte mieten', 'register.renterBody': 'Camper buchen und Algerien entdecken', 'register.ownerTitle': 'Ich möchte inserieren', 'register.ownerBody': 'Meinen Camper vermieten und verdienen', 'register.fullName': 'Vollständiger Name', 'register.phone': 'Telefon', 'register.phoneHint': 'Wird von Vermietern und Mietern zur Übergabe verwendet.', 'register.createAs': 'Konto erstellen als {role}', 'register.google': 'Mit Google registrieren', 'register.already': 'Du hast bereits ein Konto?',
  },
  es: {
    ...EN,
    'nav.home': 'Inicio', 'nav.caravans': 'Caravanas', 'nav.map': 'Mapa natural', 'nav.login': 'Iniciar sesión', 'nav.getStarted': 'Empezar', 'nav.dashboard': 'Panel', 'nav.admin': 'Espacio de administración', 'nav.signOut': 'Cerrar sesión', 'nav.toggleMenu': 'Abrir menú', 'nav.language': 'Idioma',
    'footer.description': 'El marketplace argelino de alquiler de caravanas con un mapa turístico integrado de parques nacionales, bosques y campings seguros.', 'footer.explore': 'Explorar', 'footer.browse': 'Ver caravanas', 'footer.map': 'Mapa natural interactivo', 'footer.owner': 'Panel del propietario', 'footer.trust': 'Confianza y seguridad', 'footer.contract': 'Cada reserva queda sellada con un contrato electrónico vinculante.', 'footer.verified': 'Anuncios verificados en las 58 wilayas.', 'footer.copyright': 'Zackvan facilita contratos digitales entre propietarios y viajeros; los pagos se liquidan directamente entre las partes y la plataforma no retiene fondos.',
    'home.badge': '58 wilayas · Una plataforma', 'home.heroTitle1': 'Alquila una caravana.', 'home.heroTitle2': 'Descubre el lado salvaje de Argelia.', 'home.heroBody': 'Desde los cedros de Djurdjura hasta las dunas de Tassili: reserva caravanas verificadas con contratos digitales vinculantes y explora cada parque nacional y camping seguro en nuestro mapa interactivo.', 'home.allWilayas': 'Todas las wilayas', 'home.pickup': 'Fecha de recogida', 'home.return': 'Fecha de devolución', 'home.search': 'Buscar', 'home.roadReady': 'Estancias listas para la carretera', 'home.roadCopy': 'Tu próximo fin de semana salvaje empieza aquí.', 'home.binding': 'Contratos electrónicos vinculantes', 'home.bindingSub': 'Cada reserva con condiciones legales claras', 'home.direct': 'Contacto directo con el propietario', 'home.directSub': 'Sin comisiones de intermediarios en tu alquiler', 'home.curated': 'Mapa natural seleccionado', 'home.curatedSub': 'Parques, bosques y campings seguros verificados', 'home.featured': 'Caravanas destacadas', 'home.featuredSub': 'Casas listas para viajar por todo el país', 'home.viewAll': 'Ver todas', 'home.noCaravans': 'Aún no hay caravanas publicadas', 'home.firstList': 'Sé el primero: publica tu caravana y llega a viajeros de todo el país.', 'home.list': 'Publicar mi caravana', 'home.mapBadge': 'Mapa interactivo', 'home.mapTitle': 'Planifica cada parada antes de salir', 'home.mapBody': 'Toca cualquier marcador para ver el terreno, la disponibilidad de agua, las notas de seguridad y consejos de otros viajeros para los parques nacionales, bosques y campings de confianza de Argelia.', 'home.mapLine1': 'Tassili n’Ajjer, Ahaggar, Djurdjura, Chréa…', 'home.mapLine2': 'Fuentes de agua y avisos estacionales por ubicación', 'home.mapLine3': 'Encuentra caravanas en la misma wilaya con un toque', 'home.openMap': 'Abrir el mapa completo', 'home.how': 'Cómo funciona Zackvan', 'home.step': 'Paso', 'home.step1Title': 'Encuentra tu caravana', 'home.step1Body': 'Filtra por wilaya, fechas, capacidad y equipamiento: paneles solares, depósitos de agua y baños.', 'home.step2Title': 'Firma el contrato electrónico', 'home.step2Body': 'Un acuerdo digital vinculante protege a ambas partes: condiciones claras y sin sorpresas en efectivo.', 'home.step3Title': 'Ponte en marcha', 'home.step3Body': 'Usa nuestro mapa natural para planificar parques nacionales, bosques y campings seguros.', 'home.own': '¿Tienes una caravana?', 'home.ownBody': 'Convierte los meses sin uso en ingresos. Publica en minutos, gestiona reservas y alquila con contratos vinculantes.', 'home.startListing': 'Empezar a publicar',
    'browse.title': 'Ver caravanas', 'browse.keyword': 'Palabra clave', 'browse.keywordPlaceholder': 'p. ej. solar, familia, desierto…', 'browse.wilaya': 'Wilaya', 'browse.allWilayas': 'Todas las wilayas', 'browse.minPrice': 'Precio mínimo (DA)', 'browse.maxPrice': 'Precio máximo (DA)', 'browse.guests': 'Huéspedes', 'browse.any': 'Cualquiera', 'browse.type': 'Tipo', 'browse.allTypes': 'Todos los tipos', 'browse.availableFrom': 'Disponible desde', 'browse.until': 'Hasta', 'browse.clear': 'Borrar todos los filtros', 'browse.searching': 'Buscando anuncios…', 'browse.availableOne': 'caravana disponible', 'browse.availableMany': 'caravanas disponibles', 'browse.filters': 'Filtros', 'browse.newest': 'Más recientes primero', 'browse.priceLow': 'Precio: de menor a mayor', 'browse.priceHigh': 'Precio: de mayor a menor', 'browse.showResults': 'Mostrar {count} resultados', 'browse.noMatch': 'Ninguna caravana coincide con tus filtros', 'browse.widen': 'Amplía las fechas o elimina algunos criterios.',
    'map.title': 'Mapa de naturaleza y camping', 'map.search': 'Buscar un parque, bosque o wilaya…', 'map.all': 'Todos', 'map.locations': 'Ubicaciones', 'map.noMatch': 'No hay ubicaciones que coincidan con tu búsqueda.', 'map.error': 'No se pudieron cargar las ubicaciones. Comprueba la conexión y actualiza.', 'map.loading': 'Cargando el mapa de Argelia…', 'map.park': 'Parque nacional', 'map.forest': 'Bosque', 'map.campsite': 'Camping', 'map.close': 'Cerrar detalles', 'map.terrain': 'Terreno', 'map.water': 'Agua', 'map.safety': 'Notas de seguridad', 'map.tips': 'Consejos de viajeros', 'map.bestSeason': 'Mejor temporada', 'map.findCaravans': 'Buscar caravanas en {wilaya}',
    'auth.welcome': 'Bienvenido de nuevo', 'auth.loginBody': 'Inicia sesión para reservar caravanas y gestionar tus anuncios.', 'auth.email': 'Correo electrónico', 'auth.password': 'Contraseña', 'auth.signIn': 'Iniciar sesión', 'auth.or': 'o', 'auth.google': 'Continuar con Google', 'auth.new': '¿Nuevo en Zackvan?', 'auth.create': 'Crear una cuenta', 'auth.loginFailed': 'No se pudo iniciar sesión.', 'auth.googleFailed': 'No se pudo iniciar sesión con Google.', 'register.title': 'Crea tu cuenta', 'register.subtitle': 'Únete a la comunidad de caravanas de Argelia: gratis y en dos minutos.', 'register.joinAs': 'Me uno como…', 'register.renterTitle': 'Quiero alquilar', 'register.renterBody': 'Reserva caravanas y explora Argelia', 'register.ownerTitle': 'Quiero publicar', 'register.ownerBody': 'Alquila mi caravana y gana dinero', 'register.fullName': 'Nombre completo', 'register.phone': 'Teléfono', 'register.phoneHint': 'Lo usan propietarios y viajeros para coordinar la entrega.', 'register.createAs': 'Crear cuenta como {role}', 'register.google': 'Registrarse con Google', 'register.already': '¿Ya tienes una cuenta?',
  },
  ar: {
    ...EN,
    'nav.home': 'الرئيسية', 'nav.caravans': 'القوافل', 'nav.map': 'خريطة الطبيعة', 'nav.login': 'تسجيل الدخول', 'nav.getStarted': 'ابدأ الآن', 'nav.dashboard': 'لوحة التحكم', 'nav.admin': 'مساحة الإدارة', 'nav.signOut': 'تسجيل الخروج', 'nav.toggleMenu': 'فتح القائمة', 'nav.language': 'اللغة',
    'footer.description': 'منصة جزائرية لتأجير القوافل مع خريطة سياحية مدمجة للحدائق الوطنية والغابات ومواقع التخييم الآمنة.', 'footer.explore': 'استكشف', 'footer.browse': 'تصفح القوافل', 'footer.map': 'خريطة الطبيعة التفاعلية', 'footer.owner': 'لوحة تحكم المالك', 'footer.trust': 'الثقة والأمان', 'footer.contract': 'كل حجز موثق بعقد إلكتروني ملزم.', 'footer.verified': 'إعلانات موثقة في الولايات الـ58.', 'footer.copyright': 'تسهّل Zackvan إبرام العقود الرقمية بين المالكين والمستأجرين؛ وتتم المدفوعات مباشرة بين الطرفين ولا تحتفظ المنصة بأي أموال.',
    'home.badge': '58 ولاية · منصة واحدة', 'home.heroTitle1': 'استأجر قافلة.', 'home.heroTitle2': 'اكتشف الجانب البري من الجزائر.', 'home.heroBody': 'من أرز جرجرة إلى كثبان الطاسيلي — احجز قوافل موثوقة بعقود رقمية ملزمة، واستكشف كل حديقة وطنية ومخيم آمن على خريطتنا التفاعلية.', 'home.allWilayas': 'كل الولايات', 'home.pickup': 'تاريخ الاستلام', 'home.return': 'تاريخ الإرجاع', 'home.search': 'بحث', 'home.roadReady': 'إقامات جاهزة للطريق', 'home.roadCopy': 'تبدأ عطلتك البرية القادمة من هنا.', 'home.binding': 'عقود إلكترونية ملزمة', 'home.bindingSub': 'كل حجز بشروط قانونية واضحة', 'home.direct': 'تواصل مباشر مع المالك', 'home.directSub': 'لا رسوم وساطة على سعر الإيجار', 'home.curated': 'خريطة طبيعية مختارة', 'home.curatedSub': 'حدائق وغابات ومواقع تخييم آمنة وموثقة', 'home.featured': 'القوافل المميزة', 'home.featuredSub': 'بيوت جاهزة للانطلاق في جميع أنحاء البلاد', 'home.viewAll': 'عرض الكل', 'home.noCaravans': 'لا توجد قوافل منشورة بعد', 'home.firstList': 'كن أول من ينشر — أضف قافلتك ووصل إلى المسافرين في كل أنحاء البلاد.', 'home.list': 'أضف قافلتي', 'home.mapBadge': 'خريطة تفاعلية', 'home.mapTitle': 'خطط لكل محطة قبل الانطلاق', 'home.mapBody': 'اضغط على أي علامة لرؤية نوع التضاريس وتوفر المياه وملاحظات الأمان ونصائح المسافرين للحدائق الوطنية والغابات ومواقع التخييم الموثوقة في الجزائر.', 'home.mapLine1': 'طاسيلي ناجر، الأهقار، جرجرة، الشريعة…', 'home.mapLine2': 'مصادر المياه والتنبيهات الموسمية لكل موقع', 'home.mapLine3': 'اعثر بنقرة واحدة على القوافل في الولاية نفسها', 'home.openMap': 'افتح الخريطة كاملة', 'home.how': 'كيف تعمل Zackvan', 'home.step': 'الخطوة', 'home.step1Title': 'اعثر على قافلتك', 'home.step1Body': 'صفِّ النتائج حسب الولاية والتاريخ والسعة والتجهيزات — الألواح الشمسية وخزانات المياه والحمامات.', 'home.step2Title': 'وقّع العقد الإلكتروني', 'home.step2Body': 'اتفاق رقمي ملزم يحمي الطرفين: شروط واضحة وبدون مفاجآت نقدية.', 'home.step3Title': 'انطلق في الطريق', 'home.step3Body': 'استخدم خريطة الطبيعة للتخطيط للحدائق الوطنية والغابات ومواقع التخييم الآمنة.', 'home.own': 'هل تملك قافلة؟', 'home.ownBody': 'حوّل الأشهر غير المستغلة إلى دخل. انشر إعلانك خلال دقائق، وأدر الحجوزات، وأجّر بعقود ملزمة قانونياً.', 'home.startListing': 'ابدأ بإضافة إعلان',
    'browse.title': 'تصفح القوافل', 'browse.keyword': 'كلمة مفتاحية', 'browse.keywordPlaceholder': 'مثال: شمسي، عائلي، صحراء…', 'browse.wilaya': 'الولاية', 'browse.allWilayas': 'كل الولايات', 'browse.minPrice': 'الحد الأدنى للسعر (دج)', 'browse.maxPrice': 'الحد الأقصى للسعر (دج)', 'browse.guests': 'الضيوف', 'browse.any': 'أي عدد', 'browse.type': 'النوع', 'browse.allTypes': 'كل الأنواع', 'browse.availableFrom': 'متاح من', 'browse.until': 'حتى', 'browse.clear': 'مسح كل الفلاتر', 'browse.searching': 'جارٍ البحث عن الإعلانات…', 'browse.availableOne': 'قافلة متاحة', 'browse.availableMany': 'قوافل متاحة', 'browse.filters': 'الفلاتر', 'browse.newest': 'الأحدث أولاً', 'browse.priceLow': 'السعر: من الأقل إلى الأعلى', 'browse.priceHigh': 'السعر: من الأعلى إلى الأقل', 'browse.showResults': 'عرض {count} نتيجة', 'browse.noMatch': 'لا توجد قوافل تطابق الفلاتر', 'browse.widen': 'جرّب توسيع التواريخ أو إزالة بعض المعايير.',
    'map.title': 'خريطة الطبيعة والتخييم', 'map.search': 'ابحث عن حديقة أو غابة أو ولاية…', 'map.all': 'الكل', 'map.locations': 'المواقع', 'map.noMatch': 'لا توجد مواقع تطابق بحثك.', 'map.error': 'تعذر تحميل مواقع الخريطة. تحقق من الاتصال ثم حدّث الصفحة.', 'map.loading': 'جارٍ تحميل خريطة الجزائر…', 'map.park': 'حديقة وطنية', 'map.forest': 'غابة', 'map.campsite': 'موقع تخييم', 'map.close': 'إغلاق التفاصيل', 'map.terrain': 'التضاريس', 'map.water': 'المياه', 'map.safety': 'ملاحظات الأمان', 'map.tips': 'نصائح المسافرين', 'map.bestSeason': 'أفضل موسم', 'map.findCaravans': 'اعثر على قوافل في {wilaya}',
    'auth.welcome': 'مرحباً بعودتك', 'auth.loginBody': 'سجّل الدخول لحجز القوافل وإدارة إعلاناتك.', 'auth.email': 'البريد الإلكتروني', 'auth.password': 'كلمة المرور', 'auth.signIn': 'تسجيل الدخول', 'auth.or': 'أو', 'auth.google': 'المتابعة باستخدام Google', 'auth.new': 'جديد على Zackvan؟', 'auth.create': 'إنشاء حساب', 'auth.loginFailed': 'فشل تسجيل الدخول.', 'auth.googleFailed': 'فشل تسجيل الدخول باستخدام Google.', 'register.title': 'أنشئ حسابك', 'register.subtitle': 'انضم إلى مجتمع القوافل في الجزائر — مجاناً، خلال دقيقتين.', 'register.joinAs': 'سأنضم بصفتي…', 'register.renterTitle': 'أريد الاستئجار', 'register.renterBody': 'احجز القوافل واستكشف الجزائر', 'register.ownerTitle': 'أريد إضافة إعلان', 'register.ownerBody': 'أجّر قافلتي واكسب دخلاً', 'register.fullName': 'الاسم الكامل', 'register.phone': 'الهاتف', 'register.phoneHint': 'يستخدمه المالكون والمستأجرون لتنسيق عملية التسليم.', 'register.createAs': 'إنشاء حساب بصفتي {role}', 'register.google': 'التسجيل باستخدام Google', 'register.already': 'لديك حساب بالفعل؟',
  },
};

const LANGUAGE_STORAGE_KEY = 'zackvan-language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (saved && LANGUAGES.some((item) => item.code === saved)) setLanguageState(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    if (hydrated) window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [hydrated, language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    t: (key, values) => {
      let text = TRANSLATIONS[language][key] ?? EN[key];
      for (const [name, value] of Object.entries(values ?? {})) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
      return text;
    },
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}
