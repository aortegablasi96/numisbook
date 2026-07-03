import type { Messages } from "./en";

// Russian (ru). MVP-quality translation of the app shell; native review advised
// before marketing use. Missing keys fall back to English (ADR-014).
export const ru: Partial<Messages> = {
  "app.name": "NumisBook",
  "app.tagline": "Управление коллекцией для нумизматов.",
  "skip.toContent": "Перейти к содержимому",

  "nav.primaryAria": "Основная навигация",
  "nav.home": "Главная",
  "nav.collections": "Коллекции",
  "nav.portfolio": "Портфель",
  "nav.assistant": "Ассистент",
  "nav.settings": "Настройки",
  "nav.signIn": "Войти",
  "nav.signInWithGoogle": "Войти через Google",
  "nav.signOut": "Выйти",

  "action.save": "Сохранить",
  "action.saving": "Сохранение…",
  "action.cancel": "Отмена",
  "action.apply": "Применить",
  "action.delete": "Удалить",
  "action.confirm": "Подтвердить",
  "action.tryAgain": "Повторить",
  "action.trySignInAgain": "Повторить вход",
  "action.backToHome": "На главную",

  "home.signedInAs": "Вы вошли как",
  "home.thereFallback": "пользователь",
  "home.signInPrompt":
    "Войдите, чтобы начать каталогизировать и оценивать свою коллекцию монет.",
  "home.stat.collections": "Коллекции",
  "home.stat.collectionsOne": "Коллекция",
  "home.stat.coins": "Монеты",
  "home.stat.coinsOne": "Монета",
  "home.stat.totalPaid": "Всего оплачено · {currency}",
  "home.stat.totalPaidNone": "Всего оплачено · цен пока нет",
  "home.stat.noValue": "—",
  "home.emptyHint": "Начните с создания коллекции, затем добавьте в неё монеты.",
  "feature.collections.body":
    "Организуйте монеты по коллекциям — добавляйте, переименовывайте и управляйте.",
  "feature.portfolio.body":
    "Совокупная стоимость, распределение по металлу и коллекциям, а также тренды.",

  "settings.title": "Настройки",
  "settings.signInPrompt":
    "Войдите, чтобы управлять аккаунтом и настройками.",
  "settings.profile.heading": "Профиль",
  "settings.profile.name": "Отображаемое имя",
  "settings.profile.email": "Эл. почта",
  "settings.profile.saved": "Профиль обновлён.",
  "settings.preferences.heading": "Предпочтения",
  "settings.baseCurrency.label": "Базовая валюта",
  "settings.baseCurrency.auto": "Автоматически (крупнейший актив)",
  "settings.baseCurrency.help":
    "Применяется к аналитике портфеля. «Автоматически» использует валюту вашего крупнейшего актива.",
  "settings.language.label": "Язык",
  "settings.language.systemDefault": "Системный по умолчанию",
  "settings.language.help":
    "Язык, на котором отображается интерфейс NumisBook.",
  "settings.danger.heading": "Опасная зона",
  "settings.danger.body":
    "Удаление аккаунта безвозвратно удалит ваши коллекции, монеты, изображения, счета и оценки. Это действие нельзя отменить.",
  "settings.danger.deleteAccount": "Удалить аккаунт",
  "settings.danger.deleting": "Удаление…",
  "settings.danger.confirm":
    "Удалить ваш аккаунт и все связанные данные? Это действие нельзя отменить.",

  "notFound.title": "Страница не найдена",
  "notFound.body":
    "Не удалось найти запрашиваемую страницу. Возможно, она была перемещена или больше не существует.",

  "error.title": "Что-то пошло не так",
  "error.body":
    "Ваша коллекция в безопасности — сейчас у нас проблемы с подключением к серверам. Пожалуйста, повторите попытку через мгновение.",
  "error.reference": "Код ошибки",
};
