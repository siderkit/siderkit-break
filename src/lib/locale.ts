import { getLocale, setLocale } from '../paraglide/runtime.js';

export interface LocaleMeta {
  code: string;
  native: string;
  english: string;
  rtl?: boolean;
}

export const LOCALES = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'zh-CN', native: '简体中文', english: 'Chinese (Simplified)' },
  { code: 'zh-TW', native: '繁體中文', english: 'Chinese (Traditional)' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'es', native: 'Español', english: 'Spanish' },
  { code: 'fr', native: 'Français', english: 'French' },
  { code: 'pt', native: 'Português', english: 'Portuguese' },
  { code: 'ar', native: 'العربية', english: 'Arabic', rtl: true },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
  { code: 'ur', native: 'اردو', english: 'Urdu', rtl: true },
  { code: 'de', native: 'Deutsch', english: 'German' },
  { code: 'ja', native: '日本語', english: 'Japanese' },
  { code: 'sw', native: 'Kiswahili', english: 'Swahili' },
  { code: 'mr', native: 'मराठी', english: 'Marathi' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'ko', native: '한국어', english: 'Korean' },
  { code: 'fa', native: 'فارسی', english: 'Persian', rtl: true },
  { code: 'fil', native: 'Filipino', english: 'Filipino' },
  { code: 'th', native: 'ไทย', english: 'Thai' },
  { code: 'it', native: 'Italiano', english: 'Italian' },
  { code: 'ms', native: 'Bahasa Melayu', english: 'Malay' },
  { code: 'pl', native: 'Polski', english: 'Polish' },
  { code: 'uk', native: 'Українська', english: 'Ukrainian' },
  { code: 'nl', native: 'Nederlands', english: 'Dutch' },
  { code: 'ro', native: 'Română', english: 'Romanian' },
] as const satisfies readonly LocaleMeta[];

export type Locale = (typeof LOCALES)[number]['code'];

const RTL_LOCALES = new Set<string>(['ar', 'ur', 'fa']);

/** Narrows persisted locale strings to a shipped catalog. */
export function isLocale(value: string): value is Locale {
  return LOCALES.some((locale) => locale.code === value);
}

const SPECIAL_LOCALES: Record<string, Locale> = {
  'zh-hans': 'zh-CN',
  'zh-hans-cn': 'zh-CN',
  'zh-sg': 'zh-CN',
  'zh-hant': 'zh-TW',
  'zh-hant-tw': 'zh-TW',
  'zh-hant-hk': 'zh-TW',
  'zh-hk': 'zh-TW',
  'zh-mo': 'zh-TW',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  tl: 'fil',
  'tl-ph': 'fil',
  'fil-ph': 'fil',
};

/**
 * Resolves an explicit or system tag to a shipped locale. Exact tags win,
 * then special Chinese/Portuguese/Filipino aliases, then the language subtag.
 */
export function normalizeLocale(value: string): Locale | null {
  const cleaned = value.trim().replaceAll('_', '-').toLowerCase();
  if (!cleaned) {
    return null;
  }
  const exact = LOCALES.find((locale) => locale.code.toLowerCase() === cleaned);
  if (exact) {
    return exact.code;
  }
  const special = SPECIAL_LOCALES[cleaned];
  if (special) {
    return special;
  }
  const language = cleaned.split('-')[0] ?? cleaned;
  return LOCALES.find((locale) => locale.code.split('-')[0] === language)?.code ?? null;
}

function navigatorLocaleCandidates(): string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }
  return [...navigator.languages, navigator.language];
}

/** Picks the best shipped catalog for the operating system's preferences. */
export function systemLocale(candidates: readonly string[] = navigatorLocaleCandidates()): Locale {
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) {
      return locale;
    }
  }
  return 'en';
}

/** Returns the locale Paraglide resolved for this window. */
export function currentLocale(): Locale {
  const value = getLocale();
  return isLocale(value) ? value : 'en';
}

/** Applies the document language and writing direction without reloading. */
export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.lang = locale;
  document.documentElement.dir = localeDirection(locale);
  document.documentElement.dataset.locale = locale;
}

/** Applies a locale before the first render. */
export async function prepareLocale(locale: Locale): Promise<void> {
  await setLocale(locale, { reload: false });
  applyDocumentLocale(locale);
}

/** Reloads the window after a user language change so every message updates. */
export function switchLocale(locale: Locale): void {
  applyDocumentLocale(locale);
  void setLocale(locale);
}

export function localeDirection(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

export function localeMeta(locale: Locale): LocaleMeta {
  return LOCALES.find((item) => item.code === locale) ?? LOCALES[0];
}

/** Matches native name, English name, and language code, case-insensitively. */
export function filterLocales(
  query: string,
  locales: readonly LocaleMeta[] = LOCALES,
): readonly LocaleMeta[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return locales;
  }
  return locales.filter((locale) =>
    [locale.native, locale.english, locale.code].some((value) =>
      value.toLowerCase().includes(needle),
    ),
  );
}
