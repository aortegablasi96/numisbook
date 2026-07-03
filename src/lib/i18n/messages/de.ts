import type { Messages } from "./en";

// German (de). MVP-quality translation of the app shell; native review advised
// before marketing use. Missing keys fall back to English (ADR-014).
export const de: Partial<Messages> = {
  "app.name": "NumisBook",
  "app.tagline": "Sammlungsverwaltung für Münzsammler.",
  "skip.toContent": "Zum Inhalt springen",

  "nav.primaryAria": "Hauptnavigation",
  "nav.home": "Startseite",
  "nav.collections": "Sammlungen",
  "nav.portfolio": "Portfolio",
  "nav.assistant": "Assistent",
  "nav.settings": "Einstellungen",
  "nav.signIn": "Anmelden",
  "nav.signInWithGoogle": "Mit Google anmelden",
  "nav.signOut": "Abmelden",

  "action.save": "Speichern",
  "action.saving": "Wird gespeichert…",
  "action.cancel": "Abbrechen",
  "action.apply": "Anwenden",
  "action.delete": "Löschen",
  "action.confirm": "Bestätigen",
  "action.tryAgain": "Erneut versuchen",
  "action.trySignInAgain": "Erneut anmelden",
  "action.backToHome": "Zurück zur Startseite",

  "home.signedInAs": "Angemeldet als",
  "home.thereFallback": "Nutzer",
  "home.signInPrompt":
    "Melde dich an, um deine Münzsammlung zu katalogisieren und zu bewerten.",
  "home.stat.collections": "Sammlungen",
  "home.stat.collectionsOne": "Sammlung",
  "home.stat.coins": "Münzen",
  "home.stat.coinsOne": "Münze",
  "home.stat.totalPaid": "Gesamt bezahlt · {currency}",
  "home.stat.totalPaidNone": "Gesamt bezahlt · noch keine Preise",
  "home.stat.noValue": "—",
  "home.emptyHint":
    "Erstelle zunächst eine Sammlung und füge dann Münzen hinzu.",
  "feature.collections.body":
    "Organisiere deine Münzen in Sammlungen – hinzufügen, umbenennen und pflegen.",
  "feature.portfolio.body":
    "Gesamtwert, Aufteilung nach Metall und Sammlung sowie Trends.",

  "settings.title": "Einstellungen",
  "settings.signInPrompt":
    "Melde dich an, um dein Konto und deine Einstellungen zu verwalten.",
  "settings.profile.heading": "Profil",
  "settings.profile.name": "Anzeigename",
  "settings.profile.email": "E-Mail",
  "settings.profile.saved": "Profil aktualisiert.",
  "settings.preferences.heading": "Voreinstellungen",
  "settings.baseCurrency.label": "Basiswährung",
  "settings.baseCurrency.auto": "Automatisch (größter Bestand)",
  "settings.baseCurrency.help":
    "Wird auf deine Portfolio-Analysen angewendet. „Automatisch“ verwendet die Währung deines größten Bestands.",
  "settings.language.label": "Sprache",
  "settings.language.systemDefault": "Systemstandard",
  "settings.language.help":
    "Die Sprache, in der die NumisBook-Oberfläche angezeigt wird.",
  "settings.danger.heading": "Gefahrenzone",
  "settings.danger.body":
    "Das Löschen deines Kontos entfernt dauerhaft deine Sammlungen, Münzen, Bilder, Rechnungen und Bewertungen. Dies kann nicht rückgängig gemacht werden.",
  "settings.danger.deleteAccount": "Konto löschen",
  "settings.danger.deleting": "Wird gelöscht…",
  "settings.danger.confirm":
    "Dein Konto und alle zugehörigen Daten löschen? Dies kann nicht rückgängig gemacht werden.",

  "notFound.title": "Seite nicht gefunden",
  "notFound.body":
    "Wir konnten die gesuchte Seite nicht finden. Sie wurde möglicherweise verschoben oder existiert nicht mehr.",

  "error.title": "Etwas ist schiefgelaufen",
  "error.body":
    "Deine Sammlung ist sicher – wir haben gerade Probleme, unsere Server zu erreichen. Bitte versuche es in einem Moment erneut.",
  "error.reference": "Referenz",
};
