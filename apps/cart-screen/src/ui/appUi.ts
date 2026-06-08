import type { CartState } from "@carto/shared";
import type { UiLanguage, UiTextSize, UiThemeName } from "../store/cartUiStore";

export interface ThemePalette {
  background: string;
  surface: string;
  card: string;
  cardMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  border: string;
  shadow: string;
  nav: string;
}

export interface AppStrings {
  appName: string;
  appSubtitle: string;
  home: string;
  scan: string;
  cart: string;
  map: string;
  checkout: string;
  settings: string;
  welcome: string;
  welcomeSub: string;
  startShopping: string;
  continueShopping: string;
  quickActions: string;
  shoppingList: string;
  cartItems: string;
  total: string;
  recentUpdate: string;
  latestAlert: string;
  rearCamera: string;
  scanReady: string;
  addMode: string;
  removeMode: string;
  lastScan: string;
  searchProducts: string;
  searchPlaceholder: string;
  noProductMatch: string;
  confirmAction: string;
  manualConfirm: string;
  autoScan: string;
  cameraPlaceholder: string;
  cameraSub: string;
  rearCameraNote: string;
  mapTitle: string;
  mapSubtitle: string;
  resetView: string;
  dragHint: string;
  itemSummary: string;
  confirmCheckout: string;
  confirmPayment: string;
  retryPayment: string;
  cancelCheckout: string;
  checkoutSuccess: string;
  checkoutWaiting: string;
  checkoutFailed: string;
  receiptPlaceholder: string;
  startNewSession: string;
  language: string;
  theme: string;
  textSize: string;
  scanMode: string;
  resetCart: string;
  normal: string;
  large: string;
  english: string;
  arabic: string;
  emptyCart: string;
  scanFallback: string;
  staticMapOnly: string;
  connectionOnline: string;
  connectionOffline: string;
  connectionChecking: string;
  paymentStatus: string;
  tapToNavigate: string;
  mapLegend: string;
  noList: string;
  qrPrompt: string;
  pairingCode: string;
  settingsSubtitle: string;
  checkoutSubtitle: string;
  receiptReady: string;
  resetCartHint: string;
  closeSession: string;
  continueWithoutList: string;
  welcomeEyebrow: string;
  welcomeTitle: string;
  welcomeMessage: string;
  noListExperience: string;
  shoppingDashboard: string;
  cartStatus: string;
  backendStatus: string;
  screenStatus: string;
  sessionStatus: string;
  backendActive: string;
  backendOffline: string;
  backendChecking: string;
  screenConnected: string;
  screenDisconnected: string;
  activeCart: string;
  returnToShopping: string;
  smartReceipt: string;
  smartReceiptSub: string;
  paymentCompleteTitle: string;
  paymentCompleteBody: string;
  thankYou: string;
  returnCountdown: string;
  themePremiumLight: string;
  themeFriendlySupermarket: string;
  themeCartoBlueGreen: string;
  openWebsiteList: string;
  productAdded: string;
  productNotAdded: string;
  productNotRemoved: string;
  productQuantityUpdated: string;
  productRemoved: string;
  shoppingListHint: string;
  qrLoading: string;
  pairingReady: string;
}

const premiumLightTheme: ThemePalette = {
  background: "#f6f4ef",
  surface: "#fffcf7",
  card: "#ffffff",
  cardMuted: "#f7f2ea",
  textPrimary: "#17283f",
  textSecondary: "#42556e",
  textMuted: "#7a8799",
  accent: "#245fff",
  accentSoft: "#e9efff",
  success: "#198754",
  successSoft: "#e8f8ef",
  warning: "#ca7b16",
  warningSoft: "#fff2dc",
  error: "#cf4d4d",
  errorSoft: "#feeeee",
  border: "#e8ded1",
  shadow: "rgba(20, 35, 58, 0.14)",
  nav: "rgba(255, 252, 247, 0.92)"
};

const friendlySupermarketTheme: ThemePalette = {
  background: "#f4f8ec",
  surface: "#fbfef6",
  card: "#ffffff",
  cardMuted: "#f1f8e3",
  textPrimary: "#16342a",
  textSecondary: "#305547",
  textMuted: "#6f8578",
  accent: "#ff8f1f",
  accentSoft: "#fff1df",
  success: "#2d9f5b",
  successSoft: "#e8f8ee",
  warning: "#cf7a14",
  warningSoft: "#fff1da",
  error: "#d74e4e",
  errorSoft: "#fdeeee",
  border: "#dce7d1",
  shadow: "rgba(28, 60, 44, 0.12)",
  nav: "rgba(251, 254, 246, 0.94)"
};

const cartoBlueGreenTheme: ThemePalette = {
  background: "#edf7f6",
  surface: "#f9fffe",
  card: "#ffffff",
  cardMuted: "#eef8f6",
  textPrimary: "#15354f",
  textSecondary: "#31566f",
  textMuted: "#6b8797",
  accent: "#1184ff",
  accentSoft: "#e6f3ff",
  success: "#17a36b",
  successSoft: "#e6f8f0",
  warning: "#d58716",
  warningSoft: "#fff3dd",
  error: "#d94d5c",
  errorSoft: "#ffecef",
  border: "#d8e8e6",
  shadow: "rgba(15, 46, 72, 0.12)",
  nav: "rgba(249, 255, 254, 0.94)"
};

const english: AppStrings = {
  appName: "Carto",
  appSubtitle: "Smart cart shopping with static map browsing",
  home: "Home",
  scan: "Scan",
  cart: "Cart",
  map: "Map",
  checkout: "Checkout",
  settings: "Settings",
  welcome: "Welcome",
  welcomeSub: "Designed for fast shopping decisions on the cart.",
  startShopping: "Start Shopping",
  continueShopping: "Continue Shopping",
  quickActions: "Quick actions",
  shoppingList: "Shopping list",
  cartItems: "Cart items",
  total: "Total",
  recentUpdate: "Last sync",
  latestAlert: "Latest alert",
  rearCamera: "Rear camera",
  scanReady: "Scanner ready",
  addMode: "Add mode",
  removeMode: "Remove mode",
  lastScan: "Last scan",
  searchProducts: "Manual product search",
  searchPlaceholder: "Search products",
  noProductMatch: "No matching products",
  confirmAction: "Confirm",
  manualConfirm: "Manual confirm",
  autoScan: "Auto scan",
  cameraPlaceholder: "Rear camera preview",
  cameraSub: "Live camera area or placeholder for cart-entry scanning",
  rearCameraNote: "Use the rear camera to detect products as they enter or leave the cart.",
  mapTitle: "Store map",
  mapSubtitle: "Static interactive indoor map",
  resetView: "Reset",
  dragHint: "Drag to pan. Use the controls or mouse wheel to zoom.",
  itemSummary: "Cart summary",
  confirmCheckout: "Checkout",
  confirmPayment: "Confirm payment",
  retryPayment: "Retry payment",
  cancelCheckout: "Cancel checkout",
  checkoutSuccess: "Checkout complete",
  checkoutWaiting: "Waiting for payment confirmation",
  checkoutFailed: "Payment needs attention",
  receiptPlaceholder: "Receipt / QR placeholder",
  startNewSession: "Start new session",
  language: "Language",
  theme: "Theme",
  textSize: "Text size",
  scanMode: "Scan mode",
  resetCart: "Reset cart",
  normal: "Normal",
  large: "Large",
  english: "English",
  arabic: "Arabic",
  emptyCart: "Your cart is empty. Products will appear here after they are scanned.",
  scanFallback: "Manual search is available if camera scanning is not available.",
  staticMapOnly: "Static map only. No live location is shown.",
  connectionOnline: "Online",
  connectionOffline: "Offline",
  connectionChecking: "Checking",
  paymentStatus: "Payment",
  tapToNavigate: "Use the shopping dashboard to review your list, map, and cart.",
  mapLegend: "Store sections",
  noList: "No list loaded",
  qrPrompt: "Scan this QR code from the website to send a shopping list to the cart.",
  pairingCode: "Pairing code",
  settingsSubtitle: "Change the language, visual style, text size, and scan behavior.",
  checkoutSubtitle: "Review the smart receipt and finish the payment flow.",
  receiptReady: "Receipt ready",
  resetCartHint: "This clears the current cart session and returns the cart to the QR start screen.",
  closeSession: "Close Session",
  continueWithoutList: "Continue without list",
  welcomeEyebrow: "Smart Shopping Cart",
  welcomeTitle: "Welcome to Carto",
  welcomeMessage: "Scan the QR code to bring your shopping list onto the cart, or continue without a list and start browsing right away.",
  noListExperience: "Open the website and create a shopping list to enjoy the full experience.",
  shoppingDashboard: "Shopping dashboard",
  cartStatus: "Cart status",
  backendStatus: "Backend",
  screenStatus: "Screen",
  sessionStatus: "Session",
  backendActive: "Active",
  backendOffline: "Offline",
  backendChecking: "Checking",
  screenConnected: "Connected",
  screenDisconnected: "Disconnected",
  activeCart: "Active cart",
  returnToShopping: "Return to shopping",
  smartReceipt: "Smart Receipt",
  smartReceiptSub: "A clear summary of the cart before payment is completed.",
  paymentCompleteTitle: "Payment completed successfully",
  paymentCompleteBody: "Your session is finished and the receipt is ready.",
  thankYou: "Thank you for shopping with Carto.",
  returnCountdown: "Returning to the QR screen in 5 seconds.",
  themePremiumLight: "Premium Light",
  themeFriendlySupermarket: "Friendly Supermarket",
  themeCartoBlueGreen: "Carto Blue Green",
  openWebsiteList: "Open the website and create a shopping list to enjoy the full experience.",
  productAdded: "Added to cart",
  productNotAdded: "Product was not added",
  productNotRemoved: "Product was not removed",
  productQuantityUpdated: "Quantity updated",
  productRemoved: "Removed from cart",
  shoppingListHint: "The list sent from the website will appear here.",
  qrLoading: "Preparing QR pairing",
  pairingReady: "Ready to pair"
};

const arabic: AppStrings = {
  appName: "كارتو",
  appSubtitle: "تسوق ذكي مع خريطة ثابتة تفاعلية",
  home: "الرئيسية",
  scan: "المسح",
  cart: "السلة",
  map: "الخريطة",
  checkout: "الدفع",
  settings: "الإعدادات",
  welcome: "مرحبًا",
  welcomeSub: "واجهة مريحة لاتخاذ قرارات سريعة أثناء التسوق.",
  startShopping: "ابدأ التسوق",
  continueShopping: "تابع التسوق",
  quickActions: "إجراءات سريعة",
  shoppingList: "قائمة التسوق",
  cartItems: "عناصر السلة",
  total: "الإجمالي",
  recentUpdate: "آخر مزامنة",
  latestAlert: "آخر تنبيه",
  rearCamera: "الكاميرا الخلفية",
  scanReady: "الماسح جاهز",
  addMode: "وضع الإضافة",
  removeMode: "وضع الإزالة",
  lastScan: "آخر عملية مسح",
  searchProducts: "بحث يدوي عن المنتجات",
  searchPlaceholder: "ابحث عن منتج",
  noProductMatch: "لا توجد منتجات مطابقة",
  confirmAction: "تأكيد",
  manualConfirm: "تأكيد يدوي",
  autoScan: "مسح تلقائي",
  cameraPlaceholder: "معاينة الكاميرا الخلفية",
  cameraSub: "منطقة الكاميرا أو العنصر البديل لمسح منتجات السلة",
  rearCameraNote: "استخدم الكاميرا الخلفية لاكتشاف المنتجات عند دخولها أو خروجها من السلة.",
  mapTitle: "خريطة المتجر",
  mapSubtitle: "خريطة داخلية ثابتة وتفاعلية",
  resetView: "إعادة الضبط",
  dragHint: "اسحب لتحريك الخريطة واستخدم الأزرار أو عجلة الفأرة للتكبير.",
  itemSummary: "ملخص السلة",
  confirmCheckout: "الدفع",
  confirmPayment: "تأكيد السداد",
  retryPayment: "إعادة المحاولة",
  cancelCheckout: "إلغاء الدفع",
  checkoutSuccess: "اكتمل الدفع",
  checkoutWaiting: "في انتظار تأكيد السداد",
  checkoutFailed: "توجد مشكلة في السداد",
  receiptPlaceholder: "عنصر بديل للإيصال أو رمز QR",
  startNewSession: "ابدأ جلسة جديدة",
  language: "اللغة",
  theme: "المظهر",
  textSize: "حجم النص",
  scanMode: "وضع المسح",
  resetCart: "إعادة ضبط السلة",
  normal: "عادي",
  large: "كبير",
  english: "الإنجليزية",
  arabic: "العربية",
  emptyCart: "السلة فارغة. ستظهر المنتجات هنا بعد مسحها.",
  scanFallback: "البحث اليدوي متاح إذا لم يكن المسح بالكاميرا متاحًا.",
  staticMapOnly: "الخريطة ثابتة فقط ولا تعرض أي موقع مباشر.",
  connectionOnline: "متصل",
  connectionOffline: "غير متصل",
  connectionChecking: "جارٍ التحقق",
  paymentStatus: "الدفع",
  tapToNavigate: "استخدم شريط التنقل السفلي للتبديل بين المسح والسلة والخريطة والدفع والإعدادات.",
  mapLegend: "أقسام المتجر",
  noList: "لا توجد قائمة",
  qrPrompt: "امسح رمز QR من الموقع لإرسال قائمة التسوق إلى العربة.",
  pairingCode: "رمز الربط",
  settingsSubtitle: "غيّر اللغة والمظهر وحجم النص وطريقة المسح.",
  checkoutSubtitle: "راجع الإيصال الذكي وأكمل عملية السداد.",
  receiptReady: "الإيصال جاهز",
  resetCartHint: "سيؤدي ذلك إلى مسح جلسة التسوق الحالية والعودة إلى شاشة QR.",
  closeSession: "إنهاء الجلسة",
  continueWithoutList: "المتابعة بدون قائمة",
  welcomeEyebrow: "عربة تسوق ذكية",
  welcomeTitle: "مرحبًا بك في كارتو",
  welcomeMessage: "امسح رمز QR لجلب قائمة التسوق إلى العربة، أو تابع بدون قائمة وابدأ التصفح مباشرة.",
  noListExperience: "افتح الموقع وأنشئ قائمة تسوق للاستفادة من التجربة الكاملة.",
  shoppingDashboard: "لوحة التسوق",
  cartStatus: "حالة العربة",
  backendStatus: "الخادم",
  screenStatus: "الشاشة",
  sessionStatus: "الجلسة",
  backendActive: "نشط",
  backendOffline: "غير متصل",
  backendChecking: "جارٍ التحقق",
  screenConnected: "متصلة",
  screenDisconnected: "غير متصلة",
  activeCart: "العربة النشطة",
  returnToShopping: "العودة للتسوق",
  smartReceipt: "الإيصال الذكي",
  smartReceiptSub: "ملخص واضح للسلة قبل إتمام الدفع.",
  paymentCompleteTitle: "تم السداد بنجاح",
  paymentCompleteBody: "انتهت الجلسة والإيصال جاهز.",
  thankYou: "شكرًا لتسوقك مع كارتو.",
  returnCountdown: "العودة إلى شاشة QR خلال 5 ثوانٍ.",
  themePremiumLight: "إضاءة فاخرة",
  themeFriendlySupermarket: "ألوان متجر ودودة",
  themeCartoBlueGreen: "أزرق وأخضر كارتو",
  openWebsiteList: "افتح الموقع وأنشئ قائمة تسوق للاستفادة من التجربة الكاملة.",
  productAdded: "تمت الإضافة إلى السلة",
  productNotAdded: "لم تتم إضافة المنتج",
  productNotRemoved: "لم تتم إزالة المنتج",
  productQuantityUpdated: "تم تحديث الكمية",
  productRemoved: "تمت الإزالة من السلة",
  shoppingListHint: "ستظهر هنا القائمة المرسلة من الموقع.",
  qrLoading: "جارٍ تجهيز رمز الربط",
  pairingReady: "جاهز للربط"
};

export function getThemePalette(theme: UiThemeName) {
  if (theme === "premium_light") return premiumLightTheme;
  if (theme === "friendly_supermarket") return friendlySupermarketTheme;
  return cartoBlueGreenTheme;
}

export function getAppStrings(language: UiLanguage) {
  return language === "ar" ? arabic : english;
}

export function getTextScale(textSize: UiTextSize) {
  return textSize === "large" ? 1.14 : 1;
}

export function scaleSize(value: number, textScale: number) {
  return Math.round(value * textScale);
}

export function isArabic(language: UiLanguage) {
  return language === "ar";
}

export function formatCurrency(value: number | undefined, language: UiLanguage) {
  const safeValue = value ?? 0;
  try {
    return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 2
    }).format(safeValue);
  } catch {
    return `${safeValue.toFixed(2)} EGP`;
  }
}

export function formatStateLabel(state: CartState | undefined, language: UiLanguage) {
  if (!state) return language === "ar" ? "جارٍ التحديث" : "Syncing";
  if (state === "WAITING_FOR_LIST") return language === "ar" ? "جاهز للاقتران" : "Ready to pair";
  if (state === "SHOPPING") return language === "ar" ? "التسوق نشط" : "Shopping active";
  if (state === "WAITING_PAYMENT") return language === "ar" ? "في انتظار السداد" : "Waiting payment";
  if (state === "PAYMENT_FAILED") return language === "ar" ? "فشل السداد" : "Payment failed";
  if (state === "CHECKOUT_PENDING") return language === "ar" ? "بدء الدفع" : "Starting checkout";
  if (state === "PAID") return language === "ar" ? "تم الدفع" : "Paid";
  if (state === "SESSION_CLOSED") return language === "ar" ? "الجلسة مغلقة" : "Session closed";

  return state
    .toLowerCase()
    .split("_")
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatUpdatedAt(value: string | null, language: UiLanguage) {
  if (!value) return language === "ar" ? "غير متزامن" : "Not synced";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return language === "ar" ? "غير متزامن" : "Not synced";
  return parsed.toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function shadowStyle(theme: ThemePalette, elevation = 12) {
  return {
    shadowColor: theme.shadow,
    shadowOpacity: 0.16,
    shadowRadius: elevation,
    shadowOffset: { width: 0, height: Math.round(elevation / 1.6) },
    elevation: Math.max(2, Math.round(elevation / 3))
  };
}
