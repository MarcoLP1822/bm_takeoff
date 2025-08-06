import { describe, it, expect } from '@jest/globals'

// Simple test to verify translation files structure
import enMessages from '@/messages/en.json'
import itMessages from '@/messages/it.json'

describe('Internationalization (i18n) - Translation Files', () => {
  describe('Translation Completeness', () => {
    it('should have all required translation keys in Italian', () => {
      // Verify that all critical keys exist in Italian messages
      expect(itMessages.dashboard).toBeDefined()
      expect(itMessages.dashboard.descriptions).toBeDefined()
      expect(itMessages.dashboard.descriptions.noBooksYet).toBeDefined()
      expect(itMessages.dashboard.descriptions.uploadYourFirstBook).toBeDefined()
      expect(itMessages.breadcrumbs).toBeDefined()
      expect(itMessages.breadcrumbs.books).toBeDefined()
      expect(itMessages.breadcrumbs.content).toBeDefined()
    })

    it('should have all required translation keys in English', () => {
      // Verify that all critical keys exist in English messages
      expect(enMessages.dashboard).toBeDefined()
      expect(enMessages.dashboard.descriptions).toBeDefined()
      expect(enMessages.dashboard.descriptions.noBooksYet).toBeDefined()
      expect(enMessages.dashboard.descriptions.uploadYourFirstBook).toBeDefined()
      expect(enMessages.breadcrumbs).toBeDefined()
      expect(enMessages.breadcrumbs.books).toBeDefined()
      expect(enMessages.breadcrumbs.content).toBeDefined()
    })

    it('should have same structure in both language files', () => {
      // Check that both files have the same keys structure
      const getKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
        let keys: string[] = []
        for (const key in obj) {
          const fullKey = prefix ? `${prefix}.${key}` : key
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(getKeys(obj[key] as Record<string, unknown>, fullKey))
          } else {
            keys.push(fullKey)
          }
        }
        return keys
      }

      const enKeys = getKeys(enMessages).sort()
      const itKeys = getKeys(itMessages).sort()

      expect(enKeys).toEqual(itKeys)
    })

    it('should have consistent content for critical UI elements', () => {
      // Test specific translations that are critical for UX
      expect(itMessages.dashboard.stats.totalBooks).toBe('Libri Totali')
      expect(enMessages.dashboard.stats.totalBooks).toBe('Total Books')
      
      expect(itMessages.dashboard.descriptions.generatedToday).toBe('generati oggi')
      expect(enMessages.dashboard.descriptions.generatedToday).toBe('generated today')
      
      expect(itMessages.dashboard.descriptions.noBooksYet).toBe('Nessun libro ancora')
      expect(enMessages.dashboard.descriptions.noBooksYet).toBe('No books yet')
    })

    it('should have consistent breadcrumb translations', () => {
      expect(itMessages.breadcrumbs.books).toBe('Libri')
      expect(enMessages.breadcrumbs.books).toBe('Books')
      
      expect(itMessages.breadcrumbs.content).toBe('Contenuti')
      expect(enMessages.breadcrumbs.content).toBe('Content')
      
      expect(itMessages.breadcrumbs.generate).toBe('Genera')
      expect(enMessages.breadcrumbs.generate).toBe('Generate')
    })

    it('should have no missing translations (empty strings)', () => {
      const checkForEmptyStrings = (obj: Record<string, unknown>, path = ''): string[] => {
        const emptyKeys: string[] = []
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key
          if (typeof value === 'string' && value.trim() === '') {
            emptyKeys.push(currentPath)
          } else if (typeof value === 'object' && value !== null) {
            emptyKeys.push(...checkForEmptyStrings(value as Record<string, unknown>, currentPath))
          }
        }
        return emptyKeys
      }

      const emptyEnKeys = checkForEmptyStrings(enMessages)
      const emptyItKeys = checkForEmptyStrings(itMessages)

      expect(emptyEnKeys).toEqual([])
      expect(emptyItKeys).toEqual([])
    })
  })
})
