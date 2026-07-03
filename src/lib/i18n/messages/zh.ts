import type { Messages } from "./en";

// Chinese, Simplified (zh). MVP-quality translation of the app shell; native
// review advised before marketing use. Glyphs render via system CJK fonts (no
// bundled CJK web font). Missing keys fall back to English (ADR-014).
export const zh: Partial<Messages> = {
  "app.name": "NumisBook",
  "app.tagline": "面向钱币收藏者的收藏管理工具。",
  "skip.toContent": "跳到内容",

  "nav.primaryAria": "主导航",
  "nav.home": "首页",
  "nav.collections": "收藏集",
  "nav.portfolio": "投资组合",
  "nav.assistant": "助手",
  "nav.settings": "设置",
  "nav.signIn": "登录",
  "nav.signInWithGoogle": "使用 Google 登录",
  "nav.signOut": "退出登录",

  "action.save": "保存",
  "action.saving": "正在保存…",
  "action.cancel": "取消",
  "action.apply": "应用",
  "action.delete": "删除",
  "action.confirm": "确认",
  "action.tryAgain": "重试",
  "action.trySignInAgain": "重新登录",
  "action.backToHome": "返回首页",

  "home.signedInAs": "已登录为",
  "home.thereFallback": "用户",
  "home.signInPrompt": "登录即可开始整理和估价你的钱币收藏。",
  "home.stat.collections": "收藏集",
  "home.stat.collectionsOne": "收藏集",
  "home.stat.coins": "钱币",
  "home.stat.coinsOne": "钱币",
  "home.stat.totalPaid": "已付总额 · {currency}",
  "home.stat.totalPaidNone": "已付总额 · 暂无价格",
  "home.stat.noValue": "—",
  "home.emptyHint": "先创建一个收藏集，然后向其中添加钱币。",
  "feature.collections.body": "将钱币整理到收藏集中——添加、重命名和管理。",
  "feature.portfolio.body": "总价值、按金属和收藏集的分布，以及趋势。",

  "settings.title": "设置",
  "settings.signInPrompt": "登录以管理你的账户和偏好设置。",
  "settings.profile.heading": "个人资料",
  "settings.profile.name": "显示名称",
  "settings.profile.email": "电子邮箱",
  "settings.profile.saved": "资料已更新。",
  "settings.preferences.heading": "偏好设置",
  "settings.baseCurrency.label": "基准货币",
  "settings.baseCurrency.auto": "自动（最大持仓）",
  "settings.baseCurrency.help":
    "应用于你的投资组合分析。“自动”会使用你最大持仓的货币。",
  "settings.language.label": "语言",
  "settings.language.systemDefault": "系统默认",
  "settings.language.help": "NumisBook 界面显示所用的语言。",
  "settings.danger.heading": "危险区域",
  "settings.danger.body":
    "删除账户将永久移除你的收藏集、钱币、图片、发票和估值。此操作无法撤销。",
  "settings.danger.deleteAccount": "删除账户",
  "settings.danger.deleting": "正在删除…",
  "settings.danger.confirm": "删除你的账户及所有相关数据？此操作无法撤销。",

  "notFound.title": "未找到页面",
  "notFound.body": "我们找不到你要查看的页面。它可能已被移动或不再存在。",

  "error.title": "出现了问题",
  "error.body": "你的收藏很安全——我们目前无法连接到服务器。请稍后再试。",
  "error.reference": "参考编号",
};
