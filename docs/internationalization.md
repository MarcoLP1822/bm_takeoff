# Sistema di Internazionalizzazione (i18n)

Questo documento spiega come utilizzare il sistema di internazionalizzazione implementato nell'applicazione Book Marketing Takeoff.

## 🌍 Configurazione

### Lingue Supportate
- **Italiano (it)** - Lingua di default
- **Inglese (en)** - Lingua secondaria

### Configurazione Base

Il sistema è configurato in `i18n.ts`:

```typescript
export const locales = ['it', 'en'] as const
export const defaultLocale: Locale = 'it' // Italiano come default
```

## 🛠️ Come Aggiungere Traduzioni

### 1. Aggiungere Nuove Chiavi di Traduzione

Modifica i file in `/messages/`:

**messages/it.json:**
```json
{
  "navigation": {
    "newPage": "Nuova Pagina"
  }
}
```

**messages/en.json:**
```json
{
  "navigation": {
    "newPage": "New Page"
  }
}
```

### 2. Utilizzare le Traduzioni nei Componenti

#### Con Hook Personalizzati
```typescript
import { useNavigationTranslations } from '@/hooks/use-translations'

function MyComponent() {
  const t = useNavigationTranslations()
  
  return <h1>{t('newPage')}</h1>
}
```

#### Con Hook Standard
```typescript
import { useTranslations } from 'next-intl'

function MyComponent() {
  const t = useTranslations('navigation')
  
  return <h1>{t('newPage')}</h1>
}
```

### 3. Server Components

Per i Server Components:

```typescript
import { getTranslations } from 'next-intl/server'

export default async function ServerComponent() {
  const t = await getTranslations('navigation')
  
  return <h1>{t('newPage')}</h1>
}
```

## 🔗 Routing Localizzato

### Struttura URL

- **Italiano (default)**: `/dashboard`, `/books`
- **Inglese**: `/en/dashboard`, `/en/books`

### Creare Link Localizzati

```typescript
import { useLocale } from 'next-intl'
import Link from 'next/link'

function MyComponent() {
  const locale = useLocale()
  
  return (
    <Link href={`/${locale}/dashboard`}>
      Dashboard
    </Link>
  )
}
```

## 🎯 Language Selector

Il componente `LanguageSelector` è già integrato nell'header del dashboard:

```typescript
import { LanguageSelector } from '@/components/ui/language-selector'

// Utilizzo
<LanguageSelector />
```

## 📝 Hook Personalizzati Disponibili

Il file `/hooks/use-translations.ts` fornisce hook specializzati:

```typescript
import {
  useNavigationTranslations,
  useDashboardTranslations,
  useBooksTranslations,
  useContentTranslations,
  // ... altri hook
} from '@/hooks/use-translations'
```

## 🚀 Aggiungere Nuove Lingue

### 1. Aggiorna la Configurazione

In `i18n.ts`:
```typescript
export const locales = ['it', 'en', 'es'] as const // Aggiungi spagnolo
```

### 2. Crea il File di Traduzione

Crea `/messages/es.json` con tutte le traduzioni.

### 3. Aggiorna il Language Selector

In `language-selector.tsx`:
```typescript
const localeNames: Record<Locale, string> = {
  it: '🇮🇹 Italiano',
  en: '🇺🇸 English',
  es: '🇪🇸 Español' // Aggiungi
}
```

## ⚠️ Note Importanti

### Middleware
Il middleware gestisce automaticamente:
- Rilevazione lingua dal browser
- Redirect alla lingua appropriata
- Protezione route autenticate

### Clerk Integration
Le route di autenticazione sono integrate con il sistema i18n:
- Login: `/{locale}/login`
- Signup: `/{locale}/signup`

### File Structure
```
app/
├── [locale]/
│   ├── (authenticated)/
│   │   └── dashboard/
│   ├── (unauthenticated)/
│   │   ├── login/
│   │   └── signup/
│   └── layout.tsx
└── layout.tsx (redirect root)
```

## 🔧 Troubleshooting

### URL non Localizzati
Se trovi URL hardcoded come `/dashboard`, sostituiscili con:
```typescript
const locale = useLocale()
const url = `/${locale}/dashboard`
```

### Traduzioni Mancanti
Se una traduzione manca, next-intl mostrerà la chiave come fallback. Aggiungi sempre le traduzioni in tutti i file lingua.

### Cache Issues
Se le traduzioni non si aggiornano, riavvia il server di sviluppo:
```bash
npm run dev
```

## 📚 Risorse

- [Next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js Internationalization](https://nextjs.org/docs/advanced-features/i18n)
- [React Intl](https://formatjs.io/docs/react-intl/)

---

**Il sistema è configurato con l'italiano come lingua di default e include il language selector nel header del dashboard per permettere agli utenti di cambiare facilmente lingua.**
