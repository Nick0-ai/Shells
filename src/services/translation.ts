interface TranslationCache {
  [key: string]: string
}

export class TranslationService {
  private apiKey: string
  private cache: TranslationCache = {}
  private pendingTranslations: Map<string, Promise<string>> = new Map()
  private useFreePlan: boolean

  constructor(apiKey: string, useFreePlan = true) {
    this.apiKey = apiKey
    this.useFreePlan = useFreePlan
  }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    // Skip if same language
    if (sourceLang === targetLang) {
      return text
    }

    // Check cache
    const cacheKey = `${sourceLang}:${targetLang}:${text}`
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey]
    }

    // Check if already translating this text
    if (this.pendingTranslations.has(cacheKey)) {
      return this.pendingTranslations.get(cacheKey)!
    }

    // Create translation promise
    const translationPromise = this.performTranslation(text, sourceLang, targetLang)
    this.pendingTranslations.set(cacheKey, translationPromise)

    try {
      const result = await translationPromise
      this.cache[cacheKey] = result
      return result
    } finally {
      this.pendingTranslations.delete(cacheKey)
    }
  }

  private async performTranslation(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    // DeepL API endpoint
    const baseUrl = this.useFreePlan
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate'

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [text],
          source_lang: sourceLang.toUpperCase(),
          target_lang: targetLang.toUpperCase(),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[DeepL] API Error:', response.status, errorText)

        // Return original text on error
        return text
      }

      const data = await response.json()

      if (data.translations && data.translations.length > 0) {
        return data.translations[0].text
      }

      return text
    } catch (error) {
      console.error('[DeepL] Translation error:', error)
      return text // Return original text on error
    }
  }

  clearCache(): void {
    this.cache = {}
  }
}

// Fallback to free translation API if DeepL key not provided
export class FreeTranslationService {
  private cache: TranslationCache = {}

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    if (sourceLang === targetLang) {
      return text
    }

    const cacheKey = `${sourceLang}:${targetLang}:${text}`
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey]
    }

    try {
      // Using LibreTranslate or similar free API
      // For now, just return original text with a note
      // In production, you'd connect to a translation service
      const result = `[${targetLang.toUpperCase()}] ${text}`
      this.cache[cacheKey] = result
      return result
    } catch (error) {
      console.error('[FreeTranslation] Error:', error)
      return text
    }
  }
}
