import { readFileSync, writeFileSync } from 'fs';

const newKeys = {
  brand: {
    name: { hu: 'Quintessence', en: 'Quintessence', de: 'Quintessence', es: 'Quintessence', it: 'Quintessence' },
    tagline: {
      hu: 'Személyes fejlődés',
      en: 'Personal Growth',
      de: 'Persönliche Entwicklung',
      es: 'Crecimiento personal',
      it: 'Crescita personale',
    },
  },
  pwa: {
    name: { hu: 'Quintessence', en: 'Quintessence', de: 'Quintessence', es: 'Quintessence', it: 'Quintessence' },
    description: {
      hu: 'Személyes fejlődés és tanulás moduláris rendszere',
      en: 'Modular system for personal growth and learning',
      de: 'Modulares System für persönliche Entwicklung und Lernen',
      es: 'Sistema modular de crecimiento personal y aprendizaje',
      it: 'Sistema modulare per crescita personale e apprendimento',
    },
  },
  // Each key = language code; nested key = UI locale → display name of that language
  locale: {
    hu: { hu: 'Magyar', en: 'Hungarian', de: 'Ungarisch', es: 'Húngaro', it: 'Ungherese' },
    en: { hu: 'Angol', en: 'English', de: 'Englisch', es: 'Inglés', it: 'Inglese' },
    de: { hu: 'Német', en: 'German', de: 'Deutsch', es: 'Alemán', it: 'Tedesco' },
    es: { hu: 'Spanyol', en: 'Spanish', de: 'Spanisch', es: 'Español', it: 'Spagnolo' },
    it: { hu: 'Olasz', en: 'Italian', de: 'Italienisch', es: 'Italiano', it: 'Italiano' },
  },
  dashboard: {
    magiaLabel: { hu: 'Mágia', en: 'Magia', de: 'Magia', es: 'Magia', it: 'Magia' },
    angolLabel: { hu: 'Angol', en: 'English', de: 'Englisch', es: 'Inglés', it: 'Inglese' },
    totalLabel: { hu: 'Össz.', en: 'Total', de: 'Ges.', es: 'Total', it: 'Tot.' },
    lesson1Progress: { hu: '1. Lecke', en: 'Lesson I', de: 'Lektion I', es: 'Lección I', it: 'Lezione I' },
  },
  angol: {
    eyebrow: { hu: 'Fókuszált tanulás', en: 'Focused Learning', de: 'Fokussiertes Lernen', es: 'Aprendizaje enfocado', it: 'Apprendimento mirato' },
    pageDescription: {
      hu: 'Kezdő angol nyelvtanulás — szólap, nyelvtan, gyakorlás és vizsga',
      en: 'Beginner English — vocabulary, grammar, practice and exam',
      de: 'Englisch für Anfänger — Vokabeln, Grammatik, Übung und Prüfung',
      es: 'Inglés para principiantes — vocabulario, gramática, práctica y examen',
      it: 'Inglese per principianti — vocabolario, grammatica, pratica ed esame',
    },
    backToLessons: { hu: '← Leckék', en: '← Lessons', de: '← Lektionen', es: '← Lecciones', it: '← Lezioni' },
    lesson1Description: {
      hu: 'Szólap, magyarázat, nyelvtan és gyakorló szakaszok',
      en: 'Vocabulary sheet, explanations, grammar and practice sections',
      de: 'Vokabelliste, Erklärungen, Grammatik und Übungsabschnitte',
      es: 'Hoja de vocabulario, explicaciones, gramática y secciones de práctica',
      it: 'Scheda vocabolario, spiegazioni, grammatica e sezioni di pratica',
    },
    basics: { hu: 'Alapok', en: 'Basics', de: 'Grundlagen', es: 'Fundamentos', it: 'Basi' },
    practiceSections: { hu: 'Gyakorló szakaszok', en: 'Practice sections', de: 'Übungsabschnitte', es: 'Secciones de práctica', it: 'Sezioni di pratica' },
    backToSections: { hu: '← Szakaszok', en: '← Sections', de: '← Abschnitte', es: '← Secciones', it: '← Sezioni' },
    sectionFallback: { hu: 'Szakasz {id}', en: 'Section {id}', de: 'Abschnitt {id}', es: 'Sección {id}', it: 'Sezione {id}' },
    tapToFlip: { hu: 'Kattints a fordításhoz', en: 'Tap to flip', de: 'Tippen zum Umdrehen', es: 'Toca para voltear', it: 'Tocca per girare' },
    knowIt: { hu: 'Tudom ✓', en: 'I know it ✓', de: 'Kann ich ✓', es: 'Lo sé ✓', it: 'Lo so ✓' },
    stillPracticing: { hu: 'Még gyakorolom ✗', en: 'Still practicing ✗', de: 'Noch üben ✗', es: 'Aún practico ✗', it: 'Ancora in pratica ✗' },
    startExamArrow: { hu: 'Vizsga indítása →', en: 'Start exam →', de: 'Prüfung starten →', es: 'Iniciar examen →', it: 'Inizia esame →' },
    speechNotSupported: {
      hu: 'A diktálás nem támogatott ebben a böngészőben.',
      en: 'Dictation is not supported in this browser.',
      de: 'Diktieren wird in diesem Browser nicht unterstützt.',
      es: 'El dictado no es compatible con este navegador.',
      it: 'La dettatura non è supportata in questo browser.',
    },
    dictate: { hu: 'Diktálás', en: 'Dictate', de: 'Diktieren', es: 'Dictar', it: 'Detta' },
    stopDictation: { hu: 'Leállítás', en: 'Stop', de: 'Stopp', es: 'Detener', it: 'Stop' },
  },
  magia: {
    journalExport: { hu: 'Export', en: 'Export', de: 'Export', es: 'Exportar', it: 'Esporta' },
    journalExportJson: { hu: 'JSON', en: 'JSON', de: 'JSON', es: 'JSON', it: 'JSON' },
    journalExportMarkdown: { hu: 'Markdown', en: 'Markdown', de: 'Markdown', es: 'Markdown', it: 'Markdown' },
    journalExportHeader: { hu: '# Mágikus Napló', en: '# Magic Journal', de: '# Magisches Tagebuch', es: '# Diario mágico', it: '# Diario magico' },
    calendarDateFormat: { hu: '{month}. {day}.', en: '{month}/{day}', de: '{day}.{month}.', es: '{day}/{month}', it: '{day}/{month}' },
  },
  profile: {
    settingsEyebrow: { hu: 'Beállítások', en: 'Settings', de: 'Einstellungen', es: 'Ajustes', it: 'Impostazioni' },
  },
  auth: {
    errors: {
      serverConfig: {
        hu: 'Szerver konfigurációs hiba. Lépj kapcsolatba az adminisztrátorral.',
        en: 'Server configuration error. Contact administrator.',
        de: 'Server-Konfigurationsfehler. Administrator kontaktieren.',
        es: 'Error de configuración del servidor. Contacta al administrador.',
        it: 'Errore di configurazione del server. Contatta l\'amministratore.',
      },
      missingFields: {
        hu: 'Hiányzó kötelező mezők',
        en: 'Missing required fields',
        de: 'Pflichtfelder fehlen',
        es: 'Faltan campos obligatorios',
        it: 'Campi obbligatori mancanti',
      },
      invalidUsername: {
        hu: 'Érvénytelen felhasználónév formátum',
        en: 'Invalid username format',
        de: 'Ungültiges Benutzernamenformat',
        es: 'Formato de usuario no válido',
        it: 'Formato nome utente non valido',
      },
      passwordTooShort: {
        hu: 'A jelszó legalább 8 karakter legyen',
        en: 'Password must be at least 8 characters',
        de: 'Passwort muss mindestens 8 Zeichen haben',
        es: 'La contraseña debe tener al menos 8 caracteres',
        it: 'La password deve avere almeno 8 caratteri',
      },
      invalidInvite: {
        hu: 'Érvénytelen vagy már felhasznált meghívókód',
        en: 'Invalid or used invite code',
        de: 'Ungültiger oder bereits verwendeter Einladungscode',
        es: 'Código de invitación inválido o ya usado',
        it: 'Codice invito non valido o già usato',
      },
      registrationFailed: {
        hu: 'A regisztráció sikertelen',
        en: 'Registration failed',
        de: 'Registrierung fehlgeschlagen',
        es: 'Error en el registro',
        it: 'Registrazione fallita',
      },
      methodNotAllowed: {
        hu: 'Nem engedélyezett metódus. Használd a POST-ot.',
        en: 'Method not allowed. Use POST.',
        de: 'Methode nicht erlaubt. POST verwenden.',
        es: 'Método no permitido. Usa POST.',
        it: 'Metodo non consentito. Usa POST.',
      },
    },
  },
  push: {
    morningTitle: { hu: '✦ Mágia — Reggeli gyakorlás', en: '✦ Magia — Morning practice', de: '✦ Magia — Morgenübung', es: '✦ Magia — Práctica matutina', it: '✦ Magia — Pratica mattutina' },
    morningBody: {
      hu: 'Kezdd a napot a napi Mágia-gyakorlatoddal!',
      en: 'Start your day with your daily Magia practice!',
      de: 'Beginne den Tag mit deiner täglichen Magia-Übung!',
      es: '¡Empieza el día con tu práctica diaria de Magia!',
      it: 'Inizia la giornata con la tua pratica Magia quotidiana!',
    },
    eveningTitle: { hu: '✦ Mágia — Esti gyakorlás', en: '✦ Magia — Evening practice', de: '✦ Magia — Abendübung', es: '✦ Magia — Práctica nocturna', it: '✦ Magia — Pratica serale' },
    eveningBody: {
      hu: 'Az esti kör vár rád. Szánd rá a pillanatot!',
      en: 'The evening round awaits. Set your intention!',
      de: 'Die Abendrunde wartet. Richte deine Absicht!',
      es: 'Te espera la ronda de la noche. ¡Concéntrate en el momento!',
      it: 'Il turno serale ti aspetta. Concentrati sul momento!',
    },
    streakTitle: { hu: '🔥 Sorozatvédő', en: '🔥 Streak protector', de: '🔥 Serienschutz', es: '🔥 Protector de racha', it: '🔥 Protettore della serie' },
    streakBody: {
      hu: 'Még nem gyakoroltál ma — ne szakítsd meg a sorozatod!',
      en: "You haven't practiced today — don't break your streak!",
      de: 'Du hast heute noch nicht geübt — unterbrich deine Serie nicht!',
      es: 'Aún no has practicado hoy — ¡no rompas tu racha!',
      it: 'Non hai ancora praticato oggi — non interrompere la serie!',
    },
    reengagementTitle: { hu: '✦ Mágia vár rád', en: '✦ Magia awaits you', de: '✦ Magia wartet auf dich', es: '✦ Magia te espera', it: '✦ Magia ti aspetta' },
    reengagementBody: {
      hu: '{days} napja nem gyakoroltál. Nem kell nagy lépés — csak egy kis kezdés.',
      en: "You haven't practiced for {days} days. No big step needed — just a small start.",
      de: 'Du hast seit {days} Tagen nicht geübt. Kein großer Schritt nötig — nur ein kleiner Anfang.',
      es: 'Llevas {days} días sin practicar. No hace falta un gran paso — solo un pequeño comienzo.',
      it: 'Non pratichi da {days} giorni. Non serve un grande passo — solo un piccolo inizio.',
    },
    angolTitle: { hu: 'Angol emlékeztető', en: 'English reminder', de: 'Englisch-Erinnerung', es: 'Recordatorio de inglés', it: 'Promemoria inglese' },
    angolBody: {
      hu: 'Még nem gyakoroltál ma angolul. Ideje egy kis gyakorlás!',
      en: "You haven't practiced English today. Time for a little practice!",
      de: 'Du hast heute noch nicht Englisch geübt. Zeit für etwas Übung!',
      es: 'Aún no has practicado inglés hoy. ¡Es hora de practicar un poco!',
      it: 'Non hai ancora praticato inglese oggi. È ora di fare un po\' di pratica!',
    },
    testTitle: { hu: 'Quintessence', en: 'Quintessence', de: 'Quintessence', es: 'Quintessence', it: 'Quintessence' },
    testBody: {
      hu: 'A push értesítések működnek!',
      en: 'Push notifications are working!',
      de: 'Push-Benachrichtigungen funktionieren!',
      es: '¡Las notificaciones push funcionan!',
      it: 'Le notifiche push funzionano!',
    },
    noSubscription: {
      hu: 'Nincs feliratkozás',
      en: 'No subscription found',
      de: 'Kein Abonnement gefunden',
      es: 'No se encontró suscripción',
      it: 'Nessuna iscrizione trovata',
    },
    sendFailed: {
      hu: 'Küldés sikertelen',
      en: 'Send failed',
      de: 'Senden fehlgeschlagen',
      es: 'Envío fallido',
      it: 'Invio fallito',
    },
    unlockTitle: {
      hu: '⭐ {id}. fokozat feloldva!',
      en: '⭐ Grade {id} unlocked!',
      de: '⭐ Grad {id} freigeschaltet!',
      es: '⭐ ¡Grado {id} desbloqueado!',
      it: '⭐ Grado {id} sbloccato!',
    },
    unlockBody: {
      hu: 'Gratulálok! Elérted a(z) "{title}" fokozatot. Folytasd az utad!',
      en: 'Congratulations! You reached the "{title}" grade. Continue your path!',
      de: 'Glückwunsch! Du hast den Grad „{title}" erreicht. Setze deinen Weg fort!',
      es: '¡Felicidades! Alcanzaste el grado "{title}". ¡Continúa tu camino!',
      it: 'Congratulazioni! Hai raggiunto il grado "{title}". Continua il tuo percorso!',
    },
  },
};

function setNested(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function flattenKeys(obj, prefix = '') {
  const result = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && 'hu' in v && 'en' in v) {
      result.push([key, v]);
    } else if (v && typeof v === 'object') {
      result.push(...flattenKeys(v, key));
    }
  }
  return result;
}

const entries = flattenKeys(newKeys);

for (const loc of ['hu', 'en', 'de', 'es', 'it']) {
  const path = `./messages/${loc}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  for (const [key, translations] of entries) {
    setNested(data, key, translations[loc]);
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

console.log('added', entries.length, 'keys to 5 locales');