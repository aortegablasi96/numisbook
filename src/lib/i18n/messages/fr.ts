import type { Messages } from "./en";

// French (fr). MVP-quality translation of the app shell; native review advised
// before marketing use. Missing keys fall back to English (ADR-014).
export const fr: Partial<Messages> = {
  "app.name": "NumisBook",
  "app.tagline": "Gestion de collection pour les numismates.",
  "skip.toContent": "Aller au contenu",

  "nav.primaryAria": "Principale",
  "nav.home": "Accueil",
  "nav.collections": "Collections",
  "nav.portfolio": "Portefeuille",
  "nav.assistant": "Assistant",
  "nav.settings": "Paramètres",
  "nav.signIn": "Se connecter",
  "nav.signInWithGoogle": "Se connecter avec Google",
  "nav.signOut": "Se déconnecter",

  "action.save": "Enregistrer",
  "action.saving": "Enregistrement…",
  "action.cancel": "Annuler",
  "action.apply": "Appliquer",
  "action.delete": "Supprimer",
  "action.confirm": "Confirmer",
  "action.tryAgain": "Réessayer",
  "action.trySignInAgain": "Réessayer de se connecter",
  "action.backToHome": "Retour à l’accueil",

  "home.signedInAs": "Connecté en tant que",
  "home.thereFallback": "utilisateur",
  "home.signInPrompt":
    "Connectez-vous pour cataloguer et estimer votre collection de pièces.",
  "home.stat.collections": "Collections",
  "home.stat.collectionsOne": "Collection",
  "home.stat.coins": "Pièces",
  "home.stat.coinsOne": "Pièce",
  "home.stat.totalPaid": "Total payé · {currency}",
  "home.stat.totalPaidNone": "Total payé · aucun prix encore",
  "home.stat.noValue": "—",
  "home.emptyHint":
    "Commencez par créer une collection, puis ajoutez-y des pièces.",
  "feature.collections.body":
    "Organisez vos pièces en collections : ajoutez, renommez et gérez.",
  "feature.portfolio.body":
    "Valeur globale, répartition par métal et collection, et tendances.",

  "settings.title": "Paramètres",
  "settings.signInPrompt":
    "Connectez-vous pour gérer votre compte et vos préférences.",
  "settings.profile.heading": "Profil",
  "settings.profile.name": "Nom affiché",
  "settings.profile.email": "E-mail",
  "settings.profile.saved": "Profil mis à jour.",
  "settings.preferences.heading": "Préférences",
  "settings.baseCurrency.label": "Devise de base",
  "settings.baseCurrency.auto": "Automatique (plus gros avoir)",
  "settings.baseCurrency.help":
    "Appliquée aux analyses de votre portefeuille. « Automatique » utilise la devise de votre plus gros avoir.",
  "settings.language.label": "Langue",
  "settings.language.systemDefault": "Par défaut du système",
  "settings.language.help":
    "La langue dans laquelle l’interface de NumisBook s’affiche.",
  "settings.danger.heading": "Zone sensible",
  "settings.danger.body":
    "Supprimer votre compte efface définitivement vos collections, pièces, images, factures et estimations. Cette action est irréversible.",
  "settings.danger.deleteAccount": "Supprimer le compte",
  "settings.danger.deleting": "Suppression…",
  "settings.danger.confirm":
    "Supprimer votre compte et toutes les données associées ? Cette action est irréversible.",

  "notFound.title": "Page introuvable",
  "notFound.body":
    "Nous n’avons pas trouvé la page que vous cherchiez. Elle a peut-être été déplacée ou n’existe plus.",

  "error.title": "Une erreur s’est produite",
  "error.body":
    "Votre collection est en sécurité : nous rencontrons des difficultés pour joindre nos serveurs. Veuillez réessayer dans un instant.",
  "error.reference": "Référence",
};
