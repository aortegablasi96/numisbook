import type { Messages } from "./en";

// Italian (it). MVP-quality translation of the app shell; native review advised
// before marketing use. Missing keys fall back to English (ADR-014).
export const it: Partial<Messages> = {
  "app.name": "NumisBook",
  "app.tagline": "Gestione della collezione per collezionisti di monete.",
  "skip.toContent": "Vai al contenuto",

  "nav.primaryAria": "Principale",
  "nav.home": "Home",
  "nav.collections": "Collezioni",
  "nav.portfolio": "Portafoglio",
  "nav.assistant": "Assistente",
  "nav.settings": "Impostazioni",
  "nav.signIn": "Accedi",
  "nav.signInWithGoogle": "Accedi con Google",
  "nav.signOut": "Esci",

  "action.save": "Salva",
  "action.saving": "Salvataggio…",
  "action.cancel": "Annulla",
  "action.apply": "Applica",
  "action.delete": "Elimina",
  "action.confirm": "Conferma",
  "action.tryAgain": "Riprova",
  "action.trySignInAgain": "Riprova ad accedere",
  "action.backToHome": "Torna alla home",

  "home.signedInAs": "Accesso come",
  "home.thereFallback": "utente",
  "home.signInPrompt":
    "Accedi per iniziare a catalogare e valutare la tua collezione di monete.",
  "home.stat.collections": "Collezioni",
  "home.stat.collectionsOne": "Collezione",
  "home.stat.coins": "Monete",
  "home.stat.coinsOne": "Moneta",
  "home.stat.totalPaid": "Totale pagato · {currency}",
  "home.stat.totalPaidNone": "Totale pagato · nessun prezzo ancora",
  "home.stat.noValue": "—",
  "home.emptyHint": "Inizia creando una collezione, poi aggiungi le monete.",
  "feature.collections.body":
    "Organizza le tue monete in collezioni: aggiungi, rinomina e gestisci.",
  "feature.portfolio.body":
    "Valore aggregato, ripartizione per metallo e collezione, e andamenti.",

  "settings.title": "Impostazioni",
  "settings.signInPrompt": "Accedi per gestire il tuo account e le preferenze.",
  "settings.profile.heading": "Profilo",
  "settings.profile.name": "Nome visualizzato",
  "settings.profile.email": "Email",
  "settings.profile.saved": "Profilo aggiornato.",
  "settings.preferences.heading": "Preferenze",
  "settings.baseCurrency.label": "Valuta di base",
  "settings.baseCurrency.auto": "Automatica (disponibilità maggiore)",
  "settings.baseCurrency.help":
    "Applicata alle analisi del tuo portafoglio. «Automatica» usa la valuta della tua disponibilità maggiore.",
  "settings.language.label": "Lingua",
  "settings.language.systemDefault": "Predefinita di sistema",
  "settings.language.help":
    "La lingua in cui viene mostrata l’interfaccia di NumisBook.",
  "settings.danger.heading": "Zona pericolosa",
  "settings.danger.body":
    "L’eliminazione dell’account rimuove definitivamente collezioni, monete, immagini, fatture e valutazioni. L’operazione non può essere annullata.",
  "settings.danger.deleteAccount": "Elimina account",
  "settings.danger.deleting": "Eliminazione…",
  "settings.danger.confirm":
    "Eliminare il tuo account e tutti i dati associati? L’operazione non può essere annullata.",

  "notFound.title": "Pagina non trovata",
  "notFound.body":
    "Non abbiamo trovato la pagina che cercavi. Potrebbe essere stata spostata o non esistere più.",

  "error.title": "Qualcosa è andato storto",
  "error.body":
    "La tua collezione è al sicuro: al momento abbiamo problemi a raggiungere i nostri server. Riprova tra un istante.",
  "error.reference": "Riferimento",
};
