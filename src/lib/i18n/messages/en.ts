// Canonical English message catalog — the single source of truth for UI copy
// and for the `MessageKey` type. Every other locale is a Partial of this shape
// and falls back to English per-key at runtime (ADR-014). Keys are grouped by
// area with dotted names; keep them flat (no nesting) so lookup stays trivial.
//
// Scope: the full interface — the app "shell" (global chrome, home dashboard,
// settings, entry/error pages) plus the deep domain screens (coins,
// collections, valuations, assistant, and portfolio analytics). Only static UI
// text is translated; user-generated content (coin categories, notes,
// collection names) and the assistant's generated replies stay as-is (ADR-014).

export const en = {
  // Global chrome
  "app.name": "NumisBook",
  "app.tagline": "Collection management for coin collectors.",
  "skip.toContent": "Skip to content",

  // Primary navigation
  "nav.primaryAria": "Primary",
  "nav.home": "Home",
  "nav.collections": "Collections",
  "nav.coins": "Coins",
  "nav.portfolio": "Portfolio",
  "nav.assistant": "Assistant",
  "nav.settings": "Settings",
  "nav.signIn": "Sign in",
  "nav.signInWithGoogle": "Sign in with Google",
  "nav.signOut": "Sign out",

  // Shared actions
  "action.save": "Save",
  "action.saving": "Saving…",
  "action.cancel": "Cancel",
  "action.apply": "Apply",
  "action.delete": "Delete",
  "action.confirm": "Confirm",
  "action.tryAgain": "Try again",
  "action.trySignInAgain": "Try signing in again",
  "action.backToHome": "Back to home",
  "action.create": "Create",
  "action.rename": "Rename",
  "action.edit": "Edit",
  "action.remove": "Remove",
  "action.clear": "Clear",
  "action.clearAll": "Clear all",
  "action.close": "Close",
  "action.download": "Download",
  "action.expand": "Expand",
  "action.record": "Record",
  "status.loading": "loading…",

  // Shared field labels (coin attributes — reused across list columns, filters,
  // the add/edit forms, and the coin detail tiles)
  "field.coin": "Coin",
  "field.collection": "Collection",
  "field.metal": "Metal",
  "field.denomination": "Denomination",
  "field.year": "Year",
  "field.category": "Category",
  "field.issuingAuthority": "Issuing authority",
  "field.grade": "Grade",
  "field.condition": "Condition",
  "field.mint": "Mint",
  "field.weight": "Weight",
  "field.diameter": "Diameter",

  // Shared units / helpers
  "unit.coinOne": "{count} coin",
  "unit.coinOther": "{count} coins",
  "upload.failed": "Upload failed.",
  "a11y.image": "Image",
  "a11y.actions": "Actions",
  "breadcrumb.aria": "Breadcrumb",

  // Pagination
  "pager.prev": "← Prev",
  "pager.next": "Next →",
  "pager.page": "Page {page} of {total}",

  // Sign-in prompts on the domain pages
  "collections.signInPrompt": "Sign in to manage your collections.",
  "collection.fallbackTitle": "Collection",
  "collection.signInPrompt": "Sign in to view this collection.",
  "coin.fallbackTitle": "Coin",
  "coin.signInPrompt": "Sign in to view this coin.",
  "portfolio.signInPrompt": "Sign in to view your portfolio analytics.",

  // Collections manager
  "collections.filterPlaceholder": "Filter collections…",
  "collections.filterAria": "Filter collections",
  "collections.new": "New collection",
  "collections.namePlaceholder": "Collection name…",
  "collections.newNameAria": "New collection name",
  "collections.nameAria": "Collection name",
  "collections.empty": "No collections yet. Use the button above to create one.",
  "collections.noMatch": "No collections match “{filter}”.",
  "collections.renameAria": "Rename {name}",
  "collections.deleteConfirm":
    "Delete \"{name}\" and all of its coins? This cannot be undone.",

  // Coins manager (list, filters, columns, add/edit form)
  "coins.search": "Search",
  "coins.searchPlaceholder": "category, authority, mint…",
  "coins.filterAll": "All",
  "coins.columns": "Columns",
  "coins.columnsHint": "Drag ⠿ to reorder · check to show",
  "coins.columnHidden": "hidden",
  "coins.dragToReorder": "Drag to reorder",
  "coins.sortBy": "Sort by",
  "coins.sortRecent": "Recently added",
  "coins.sortToggle": "Toggle sort direction",
  "coins.add": "+ Add coin",
  "coins.formAddTitle": "Add a coin",
  "coins.formEditTitle": "Edit coin",
  "coins.addSubmit": "Add coin",
  "coins.saveChanges": "Save changes",
  "coins.yearFromBc": "Year from (− BC)",
  "coins.yearToBc": "Year to (− BC)",
  "coins.emptyNone": "No coins yet. Use the button above to add one.",
  "coins.emptyNoMatch": "No coins match the current filters.",
  "coins.allTitle": "All coins",
  "coins.allEmpty": "No coins yet. Add one from inside a collection.",
  "coins.filterRemove": "Remove filter {filter}",
  "coins.editAria": "Edit coin",
  "coins.deleteSr": "Delete coin",
  "coins.deleteConfirm":
    "Delete \"{title}\" and its valuations? This cannot be undone.",

  // Coin detail card (view blocks + edit form)
  "coinDetail.saveFailed": "Save failed. Please try again.",
  "coinDetail.yearFromBcFull": "Year from (− for BC)",
  "coinDetail.yearToBcFull": "Year to (− for BC)",
  "coinDetail.conditionGrade": "Condition (grade)",
  "coinDetail.weightG": "Weight (g)",
  "coinDetail.diameterMm": "Diameter (mm)",
  "coinDetail.catalogueReferences": "Catalogue references",
  "coinDetail.cataloguePlaceholder": "e.g. RIC 123; Sear 456",
  "coinDetail.obverseDescription": "Obverse description",
  "coinDetail.reverseDescription": "Reverse description",
  "coinDetail.observations": "Observations",
  "coinDetail.pedigree": "Pedigree",
  "coinDetail.pedigreePlaceholder":
    "Prior auctions where this coin was hammered, one per line",
  "coinDetail.auctionHouse": "Auction house",
  "coinDetail.auctionName": "Auction name",
  "coinDetail.lotNumber": "Lot number",
  "coinDetail.auctionDate": "Auction date",
  "coinDetail.hammerPrice": "Hammer price",
  "coinDetail.auctionPremium": "Auction premium",
  "coinDetail.taxCost": "Tax cost",
  "coinDetail.shippingCost": "Shipping cost",
  "coinDetail.finalPrice": "Final price",
  "coinDetail.finalPriceSum": "(= sum)",
  "coinDetail.priceCurrency": "Price currency",
  "coinDetail.block.obverse": "Obverse",
  "coinDetail.block.reverse": "Reverse",
  "coinDetail.block.pricePaid": "Price paid",
  "coinDetail.block.obtainedFrom": "Obtained from",
  "coinDetail.breakdown.hammer": "hammer",
  "coinDetail.breakdown.premium": "premium",
  "coinDetail.breakdown.tax": "tax",
  "coinDetail.breakdown.shipping": "shipping",
  "coinDetail.added": "Added {date}",

  // Coin images
  "coinImage.pictureAlt": "Coin picture {n}",
  "coinImage.expandAria": "Expand image",
  "coinImage.fullAlt": "Coin (full size)",
  "coinImage.none": "No image yet.",
  "coinImage.thumbsAria": "Coin pictures",
  "coinImage.showPictureAria": "Show picture {n}",
  "coinImage.caption": "Picture {n}",
  "coinImage.captionOf": "Picture {n} of {total}",
  "coinImage.fileAria": "Coin image",
  "coinImage.addPhoto": "Add photo",
  "coinImage.removeConfirm": "Remove this photo?",
  "coinImage.removeError": "Couldn’t remove the image.",

  // Coin invoices
  "invoices.title": "Invoices",
  "invoices.empty": "No invoice yet. Upload the auction or seller receipt (PDF).",
  "invoices.fallbackName": "Invoice {n}.pdf",
  "invoices.removeConfirm": "Remove \"{name}\"?",
  "invoices.removeError": "Couldn’t remove the invoice.",
  "invoices.fileAria": "Coin invoice (PDF)",
  "invoices.add": "Add invoice (PDF)",
  "invoices.uploading": "Uploading…",

  // Valuations manager
  "valuations.title": "Valuations",
  "valuations.latest": "Latest",
  "valuations.asOf": "as of {date}",
  "valuations.amount": "Amount *",
  "valuations.currency": "Currency *",
  "valuations.date": "Date *",
  "valuations.source": "Source",
  "valuations.sourcePlaceholder": "auction, estimate…",
  "valuations.link": "Link",
  "valuations.linkPlaceholder": "https://…",
  "valuations.empty": "No valuations yet. Record the first one above.",
  "valuations.linkLabel": "↗ link",

  // Collection assistant (static UI only — replies stay in the model's language)
  "assistant.suggestion.mostValuable": "What's my most valuable coin?",
  "assistant.suggestion.summary": "Show my collection summary",
  "assistant.suggestion.addCoin": "Add a coin to my collection",
  "assistant.name": "NumisBook Assistant",
  "assistant.online": "Online",
  "assistant.clearAria": "Clear conversation",
  "assistant.welcome":
    "Hi! I can help you manage your coin collection. What would you like to do?",
  "assistant.errorGeneric": "Something went wrong",
  "assistant.errorImage": "Could not load image. Please try a different file.",
  "assistant.attachedAlt": "Attached coin",
  "assistant.pendingAlt": "Pending attachment",
  "assistant.removeImageAria": "Remove image",
  "assistant.attachAria": "Attach image",
  "assistant.attachTitle": "Attach a coin photo",
  "assistant.inputPlaceholder": "Ask anything about your collection…",
  "assistant.messageAria": "Message",
  "assistant.sendAria": "Send",
  "assistant.openAria": "Open assistant",
  "assistant.closeAria": "Close assistant",

  // Portfolio analytics
  "portfolio.empty":
    "No prices yet. Add coins with a price paid to see your portfolio cost, breakdown, and acquisition trend. (Market valuations and gain/loss come in a later stage.)",
  "portfolio.totalPaid": "Total paid",
  "portfolio.ofWhichHammer": "of which hammer {amount}",
  "portfolio.pricedOne": "{priced} of {total} coin priced",
  "portfolio.pricedOther": "{priced} of {total} coins priced",
  "portfolio.notConvertedOne": "{count} coin not converted",
  "portfolio.notConvertedOther": "{count} coins not converted",

  // Portfolio charts (trend + cost breakdown)
  "chart.dateRangeAria": "Date range",
  "chart.range.3m": "3M",
  "chart.range.6m": "6M",
  "chart.range.1y": "1Y",
  "chart.range.all": "All",
  "chart.noneInRange": "No acquisitions in this range.",
  "chart.expandAria": "Expand {label}",
  "chart.expandedAria": "{label} (expanded)",
  "chart.trend.title": "Acquisition cost over time",
  "chart.trend.acqOne": "{count} acquisition · cumulative",
  "chart.trend.acqOther": "{count} acquisitions · cumulative",
  "chart.trend.ariaLabel": "{title}. Latest {amount} on {date}.",
  "chart.trend.tooltipSub": "{date} · cumulative",
  "chart.cost.title": "Cost breakdown",
  "chart.cost.scrollHint": "newest first, scroll for more",
  "chart.cost.ariaLabel":
    "Cost paid per coin in {currency}, newest first; scroll horizontally for earlier acquisitions. Each column split into its share of hammer, premium, shipping and tax. {count} coins, {total} total.",
  "chart.cost.total": "Total",
  "chart.seg.hammer": "Hammer",
  "chart.seg.premium": "Premium",
  "chart.seg.tax": "Tax",
  "chart.seg.shipping": "Shipping",
  "chart.seg.unsplit": "Final only",

  // Home dashboard
  "home.signedInAs": "Signed in as",
  "home.thereFallback": "there",
  "home.signInPrompt":
    "Sign in to start cataloguing and valuing your coin collection.",
  "home.stat.collections": "Collections",
  "home.stat.collectionsOne": "Collection",
  "home.stat.coins": "Coins",
  "home.stat.coinsOne": "Coin",
  "home.stat.totalPaid": "Total paid · {currency}",
  "home.stat.totalPaidNone": "Total paid · no prices yet",
  "home.stat.noValue": "—",
  "home.emptyHint": "Start by creating a collection, then add coins to it.",
  "home.recent.title": "Recent acquisitions",
  "home.recent.viewAll": "View all",
  "home.recent.empty":
    "Your most recent acquisitions will appear here once you add coins.",
  "feature.collections.body":
    "Organize your coins into collections — add, rename, and curate.",
  "feature.portfolio.body":
    "Aggregate value, allocation by metal and collection, and trends.",

  // Settings page
  "settings.title": "Settings",
  "settings.signInPrompt": "Sign in to manage your account and preferences.",
  "settings.profile.heading": "Profile",
  "settings.profile.name": "Display name",
  "settings.profile.email": "Email",
  "settings.profile.saved": "Profile updated.",
  "settings.preferences.heading": "Preferences",
  "settings.baseCurrency.label": "Base currency",
  "settings.baseCurrency.auto": "Auto (largest holding)",
  "settings.baseCurrency.help":
    "Applied to your portfolio analytics. “Auto” uses the currency of your largest holding.",
  "settings.language.label": "Language",
  "settings.language.systemDefault": "System default",
  "settings.language.help": "The language NumisBook’s interface is shown in.",
  "settings.theme.label": "Theme",
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",
  "settings.theme.help": "The colour scheme NumisBook uses.",
  "settings.danger.heading": "Danger zone",
  "settings.danger.body":
    "Deleting your account permanently removes your collections, coins, images, invoices, and valuations. This cannot be undone.",
  "settings.danger.deleteAccount": "Delete account",
  "settings.danger.deleting": "Deleting…",
  "settings.danger.confirm":
    "Delete your account and all associated data? This cannot be undone.",

  // Not found (404)
  "notFound.title": "Page not found",
  "notFound.body":
    "We couldn’t find the page you were looking for. It may have been moved or no longer exists.",

  // Error boundary
  "error.title": "Something went wrong",
  "error.body":
    "Your collection is safe — we’re having trouble reaching our servers right now. Please try again in a moment.",
  "error.reference": "Reference",
} as const;

export type MessageKey = keyof typeof en;

/** A complete catalog (English). Other locales are `Partial<Messages>`. */
export type Messages = Record<MessageKey, string>;
