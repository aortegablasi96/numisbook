import type { Messages } from "./en";

// Spanish (es). MVP-quality translation of the app shell; native review advised
// before marketing use. Missing keys fall back to English (ADR-014).
export const es: Partial<Messages> = {
  "app.name": "NumisBook",
  "app.tagline": "Gestión de colecciones para coleccionistas de monedas.",
  "skip.toContent": "Saltar al contenido",

  "nav.primaryAria": "Principal",
  "nav.home": "Inicio",
  "nav.collections": "Colecciones",
  "nav.portfolio": "Cartera",
  "nav.assistant": "Asistente",
  "nav.settings": "Ajustes",
  "nav.signIn": "Iniciar sesión",
  "nav.signInWithGoogle": "Iniciar sesión con Google",
  "nav.signOut": "Cerrar sesión",

  "action.save": "Guardar",
  "action.saving": "Guardando…",
  "action.cancel": "Cancelar",
  "action.apply": "Aplicar",
  "action.delete": "Eliminar",
  "action.confirm": "Confirmar",
  "action.tryAgain": "Reintentar",
  "action.trySignInAgain": "Intentar iniciar sesión de nuevo",
  "action.backToHome": "Volver al inicio",

  "home.signedInAs": "Sesión iniciada como",
  "home.thereFallback": "usuario",
  "home.signInPrompt":
    "Inicia sesión para empezar a catalogar y valorar tu colección de monedas.",
  "home.stat.collections": "Colecciones",
  "home.stat.collectionsOne": "Colección",
  "home.stat.coins": "Monedas",
  "home.stat.coinsOne": "Moneda",
  "home.stat.totalPaid": "Total pagado · {currency}",
  "home.stat.totalPaidNone": "Total pagado · sin precios aún",
  "home.stat.noValue": "—",
  "home.emptyHint": "Empieza creando una colección y luego añade monedas.",
  "feature.collections.body":
    "Organiza tus monedas en colecciones: añade, renombra y gestiona.",
  "feature.portfolio.body":
    "Valor agregado, distribución por metal y colección, y tendencias.",

  "settings.title": "Ajustes",
  "settings.signInPrompt": "Inicia sesión para gestionar tu cuenta y preferencias.",
  "settings.profile.heading": "Perfil",
  "settings.profile.name": "Nombre visible",
  "settings.profile.email": "Correo electrónico",
  "settings.profile.saved": "Perfil actualizado.",
  "settings.preferences.heading": "Preferencias",
  "settings.baseCurrency.label": "Moneda base",
  "settings.baseCurrency.auto": "Automática (mayor tenencia)",
  "settings.baseCurrency.help":
    "Se aplica a las analíticas de tu cartera. «Automática» usa la moneda de tu mayor tenencia.",
  "settings.language.label": "Idioma",
  "settings.language.systemDefault": "Predeterminado del sistema",
  "settings.language.help":
    "El idioma en el que se muestra la interfaz de NumisBook.",
  "settings.danger.heading": "Zona de peligro",
  "settings.danger.body":
    "Eliminar tu cuenta borra permanentemente tus colecciones, monedas, imágenes, facturas y valoraciones. Esto no se puede deshacer.",
  "settings.danger.deleteAccount": "Eliminar cuenta",
  "settings.danger.deleting": "Eliminando…",
  "settings.danger.confirm":
    "¿Eliminar tu cuenta y todos los datos asociados? Esto no se puede deshacer.",

  "notFound.title": "Página no encontrada",
  "notFound.body":
    "No pudimos encontrar la página que buscabas. Puede que se haya movido o que ya no exista.",

  "error.title": "Algo salió mal",
  "error.body":
    "Tu colección está a salvo: estamos teniendo problemas para conectar con nuestros servidores. Inténtalo de nuevo en un momento.",
  "error.reference": "Referencia",
};
