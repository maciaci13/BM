import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'bg' | 'en';

const dict = {
  bg: {
    // auth
    welcome: 'Добре дошла в BeautyMatch',
    tagline: 'Разбери дали продуктът е за твоята кожа — състав, формула и реални мнения.',
    email: 'Имейл',
    password: 'Парола',
    signIn: 'Вход',
    signUp: 'Регистрация',
    signInGoogle: 'Продължи с Google',
    noAccount: 'Нямаш профил? Регистрирай се',
    haveAccount: 'Имаш профил? Влез',
    name: 'Име',
    checkEmail: 'Провери имейла си за потвърждение.',
    // tabs
    tabHome: 'Начало',
    tabSkin: 'Кожа',
    tabSearch: 'Продукти',
    tabRoutine: 'Рутина',
    tabProfile: 'Профил',
    // home
    hello: 'Здравей',
    yourSkin: 'Твоята кожа',
    noSkinYet: 'Все още нямаш анализ на кожата. Направи първия си скан — отнема под минута.',
    scanNow: 'Сканирай сега',
    quickActions: 'Бързи действия',
    actionScanProduct: 'Сканирай продукт',
    actionAskAI: 'Питай AI за продукт',
    actionRoutine: 'Анализирай рутината',
    recentScans: 'Последни продукти',
    noRecent: 'Сканирай първия си продукт, за да се появи тук.',
    skinType: 'Тип кожа',
    concerns: 'Състояния',
    updated: 'Обновено',
    // skin scan
    skinScanTitle: 'Скан на кожата',
    skinScanIntro: 'Дръж телефона на една ръка разстояние и бавно движи лицето си наляво, надясно, нагоре и надолу. Ще заснемем няколко кадъра за AI анализа.',
    startScan: 'Започни сканиране',
    scanning: 'Сканиране… движи бавно главата си',
    analyzing: 'AI анализира кожата ти…',
    needCamera: 'Нужен е достъп до камерата.',
    grantCamera: 'Разреши камерата',
    // skin result
    skinResult: 'Резултат от анализа',
    skinResultHint: 'Прегледай и редактирай преди да запазиш в профила си.',
    observations: 'Наблюдения',
    recommendations: 'Препоръки',
    yourNotes: 'Добави бележки (алергии, диагнози, усещания)…',
    saveToProfile: 'Запази в профила',
    saved: 'Запазено',
    // search
    searchTitle: 'Намери продукт',
    searchPlaceholder: 'Име на продукт или марка…',
    byPhoto: 'Снимка',
    byBarcode: 'Баркод',
    byName: 'Търси',
    scanBarcodeHint: 'Насочи камерата към баркода',
    identifying: 'Разпознаване на продукта…',
    analyzingProduct: 'AI анализира състава и ревютата…',
    notFound: 'Не намерихме продукта. Опитай със снимка или друго изписване.',
    results: 'Резултати',
    // product
    matchLabel: 'съвпадение с кожата ти',
    formula: 'Формула',
    ingredients: 'Състав (INCI)',
    warnings: 'Внимание за теб',
    reviews: 'Какво казват хората',
    sources: 'Източници',
    pros: 'Плюсове',
    cons: 'Минуси',
    askAI: 'Питай AI за този продукт',
    findDupes: 'Намери дюпове',
    alternatives: 'По-добри за мен',
    dupesTitle: 'Дюпове по формула и ревюта',
    altTitle: 'Алтернативи за твоята кожа',
    searchingWeb: 'AI търси в ревюта и формули…',
    save: 'Запази',
    similarity: 'сходство',
    // chat
    chatPlaceholder: 'Напр. „Този крем как ще се отрази на розацея?“',
    chatIntro: 'Питай каквото искаш — отговарям на база състава и реални потребителски ревюта.',
    // routine
    routineTitle: 'Твоята рутина',
    routineIntro: 'Снимай шкафа или несесера си. AI ще разпознае продуктите, ще ти каже кое как действа и как да ги подредиш правилно.',
    photoShelf: 'Снимай шкафа',
    pickShelf: 'Избери снимка',
    analyzingRoutine: 'AI разпознава продуктите…',
    recognized: 'Разпознати продукти',
    routineAdvice: 'Как да оптимизираш',
    pastRoutines: 'Предишни анализи',
    // profile
    profileTitle: 'Профил',
    language: 'Език',
    skinProfile: 'Кожен профил',
    history: 'История на сканирания',
    favorites: 'Запазени продукти',
    signOut: 'Изход',
    rescan: 'Нов скан на кожата',
    // misc
    error: 'Нещо се обърка. Опитай пак.',
    cancel: 'Отказ',
    retry: 'Опитай пак',
    aiDisclaimer: 'AI анализът е информативен и не замества консултация с дерматолог.',
  },
  en: {
    welcome: 'Welcome to BeautyMatch',
    tagline: 'Know if a product fits your skin — formula, ingredients and real reviews.',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signInGoogle: 'Continue with Google',
    noAccount: "Don't have an account? Sign up",
    haveAccount: 'Have an account? Sign in',
    name: 'Name',
    checkEmail: 'Check your email to confirm your account.',
    tabHome: 'Home',
    tabSkin: 'Skin',
    tabSearch: 'Products',
    tabRoutine: 'Routine',
    tabProfile: 'Profile',
    hello: 'Hello',
    yourSkin: 'Your skin',
    noSkinYet: 'No skin analysis yet. Run your first scan — it takes under a minute.',
    scanNow: 'Scan now',
    quickActions: 'Quick actions',
    actionScanProduct: 'Scan a product',
    actionAskAI: 'Ask AI about a product',
    actionRoutine: 'Analyze my routine',
    recentScans: 'Recent products',
    noRecent: 'Scan your first product to see it here.',
    skinType: 'Skin type',
    concerns: 'Concerns',
    updated: 'Updated',
    skinScanTitle: 'Skin scan',
    skinScanIntro: 'Hold the phone at arm’s length and slowly turn your face left, right, up and down. We capture a few frames for the AI analysis.',
    startScan: 'Start scan',
    scanning: 'Scanning… move your head slowly',
    analyzing: 'AI is analyzing your skin…',
    needCamera: 'Camera access is required.',
    grantCamera: 'Grant camera access',
    skinResult: 'Analysis result',
    skinResultHint: 'Review and edit before saving to your profile.',
    observations: 'Observations',
    recommendations: 'Recommendations',
    yourNotes: 'Add notes (allergies, diagnoses, how your skin feels)…',
    saveToProfile: 'Save to profile',
    saved: 'Saved',
    searchTitle: 'Find a product',
    searchPlaceholder: 'Product or brand name…',
    byPhoto: 'Photo',
    byBarcode: 'Barcode',
    byName: 'Search',
    scanBarcodeHint: 'Point the camera at the barcode',
    identifying: 'Identifying the product…',
    analyzingProduct: 'AI is analyzing the formula and reviews…',
    notFound: 'Product not found. Try a photo or a different spelling.',
    results: 'Results',
    matchLabel: 'match with your skin',
    formula: 'Formula',
    ingredients: 'Ingredients (INCI)',
    warnings: 'Heads-up for you',
    reviews: 'What people say',
    sources: 'Sources',
    pros: 'Pros',
    cons: 'Cons',
    askAI: 'Ask AI about this product',
    findDupes: 'Find dupes',
    alternatives: 'Better for me',
    dupesTitle: 'Dupes by formula & reviews',
    altTitle: 'Alternatives for your skin',
    searchingWeb: 'AI is searching reviews and formulas…',
    save: 'Save',
    similarity: 'similarity',
    chatPlaceholder: 'E.g. “How would this cream affect rosacea?”',
    chatIntro: 'Ask anything — I answer based on the formula and real user reviews.',
    routineTitle: 'Your routine',
    routineIntro: 'Photograph your shelf or bag. AI recognizes the products, tells you what each one does for you and how to order them correctly.',
    photoShelf: 'Photograph shelf',
    pickShelf: 'Pick a photo',
    analyzingRoutine: 'AI is recognizing products…',
    recognized: 'Recognized products',
    routineAdvice: 'How to optimize',
    pastRoutines: 'Past analyses',
    profileTitle: 'Profile',
    language: 'Language',
    skinProfile: 'Skin profile',
    history: 'Scan history',
    favorites: 'Saved products',
    signOut: 'Sign out',
    rescan: 'New skin scan',
    error: 'Something went wrong. Try again.',
    cancel: 'Cancel',
    retry: 'Retry',
    aiDisclaimer: 'AI analysis is informational and not a substitute for a dermatologist.',
  },
} as const;

export type TKey = keyof typeof dict.bg;

const I18nCtx = createContext<{ lang: Lang; t: (k: TKey) => string; setLang: (l: Lang) => void }>({
  lang: 'bg',
  t: (k) => dict.bg[k],
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('bg');

  useEffect(() => {
    AsyncStorage.getItem('bm.lang').then((v) => {
      if (v === 'bg' || v === 'en') setLangState(v);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem('bm.lang', l);
  };

  const t = (k: TKey) => dict[lang][k] ?? dict.bg[k];

  return <I18nCtx.Provider value={{ lang, t, setLang }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
