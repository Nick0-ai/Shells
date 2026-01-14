export interface Caption {
  id: string
  text: string
  translatedText?: string
  timestamp: Date
  speaker: 'them' | 'you'
  isFinal: boolean
}

export interface Language {
  code: string
  name: string
  deepgramCode: string
  deeplCode: string
}

export interface AudioSource {
  id: string
  name: string
  thumbnail: string
}

export interface SessionConfig {
  yourLanguage: string
  theirLanguage: string
  deepgramApiKey: string
  deeplApiKey: string
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', deepgramCode: 'en', deeplCode: 'EN' },
  { code: 'fr', name: 'Français', deepgramCode: 'fr', deeplCode: 'FR' },
  { code: 'es', name: 'Español', deepgramCode: 'es', deeplCode: 'ES' },
  { code: 'de', name: 'Deutsch', deepgramCode: 'de', deeplCode: 'DE' },
  { code: 'it', name: 'Italiano', deepgramCode: 'it', deeplCode: 'IT' },
  { code: 'pt', name: 'Português', deepgramCode: 'pt-BR', deeplCode: 'PT' },
  { code: 'nl', name: 'Nederlands', deepgramCode: 'nl', deeplCode: 'NL' },
  { code: 'pl', name: 'Polski', deepgramCode: 'pl', deeplCode: 'PL' },
  { code: 'ru', name: 'Русский', deepgramCode: 'ru', deeplCode: 'RU' },
  { code: 'ja', name: '日本語', deepgramCode: 'ja', deeplCode: 'JA' },
  { code: 'zh', name: '中文', deepgramCode: 'zh', deeplCode: 'ZH' },
  { code: 'ko', name: '한국어', deepgramCode: 'ko', deeplCode: 'KO' },
  { code: 'hi', name: 'हिन्दी (Hindi)', deepgramCode: 'hi', deeplCode: 'EN' }, // DeepL doesn't support Hindi, fallback to EN
  { code: 'ar', name: 'العربية', deepgramCode: 'ar', deeplCode: 'EN' }, // DeepL doesn't support Arabic, fallback to EN
  { code: 'tr', name: 'Türkçe', deepgramCode: 'tr', deeplCode: 'TR' },
  { code: 'sv', name: 'Svenska', deepgramCode: 'sv', deeplCode: 'SV' },
  { code: 'da', name: 'Dansk', deepgramCode: 'da', deeplCode: 'DA' },
  { code: 'fi', name: 'Suomi', deepgramCode: 'fi', deeplCode: 'FI' },
  { code: 'uk', name: 'Українська', deepgramCode: 'uk', deeplCode: 'UK' },
  { code: 'id', name: 'Bahasa Indonesia', deepgramCode: 'id', deeplCode: 'ID' },
]

// Helper to get language by code
export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code)
}
