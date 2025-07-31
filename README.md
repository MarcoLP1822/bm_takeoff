
# 🚀 Book Marketing Takeoff

Un template di applicazione Next.js completo e pronto per la produzione con autenticazione, pagamenti, analytics e strumenti AI integrati.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Indice

- [Stack Tecnologico](#-stack-tecnologico)
- [Caratteristiche Principali](#-caratteristiche-principali)
- [Demo Live](#-demo-live)
- [Prerequisiti](#-prerequisiti)
- [Installazione](#️-installazione)
- [Configurazione](#️-configurazione)
- [Script Disponibili](#-script-disponibili)
- [Struttura del Progetto](#-struttura-del-progetto)
- [Funzionalità](#-funzionalità)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contribuire](#-contribuire)
- [Supporto](#-supporto)

## 🛠 Stack Tecnologico

### Frontend
- **[Next.js 15.3](https://nextjs.org/)** - Framework React con App Router
- **[React 19](https://react.dev/)** - Libreria UI con Server Components
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type safety e developer experience
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Framework CSS utility-first
- **[Shadcn/ui](https://ui.shadcn.com/)** - Componenti UI accessibili e customizzabili
- **[Framer Motion](https://www.framer.com/motion/)** - Animazioni performanti
- **[Lucide React](https://lucide.dev/)** - Icone moderne e consistenti

### Backend & Database
- **[PostgreSQL](https://www.postgresql.org/)** - Database relazionale robusto
- **[Supabase](https://supabase.com/)** - Backend-as-a-Service con real-time
- **[Drizzle ORM](https://orm.drizzle.team/)** - ORM type-safe per TypeScript
- **[Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)** - Server-side logic
- **[Upstash Redis](https://upstash.com/)** - Caching e rate limiting

### Autenticazione & Pagamenti
- **[Clerk](https://clerk.com/)** - Autenticazione completa e sicura
- **[Stripe](https://stripe.com/)** - Pagamenti e gestione abbonamenti

### AI & Content
- **[OpenAI](https://openai.com/)** - Generazione contenuti con GPT
- **[PDF Parse](https://www.npmjs.com/package/pdf-parse)** - Estrazione testo da PDF
- **[Mammoth](https://www.npmjs.com/package/mammoth)** - Conversione documenti Word

### Development & Testing
- **[Jest](https://jestjs.io/)** - Test unitari
- **[Playwright](https://playwright.dev/)** - Test end-to-end
- **[ESLint](https://eslint.org/)** - Linting del codice
- **[Prettier](https://prettier.io/)** - Formattazione automatica

## ✨ Caratteristiche Principali

- 🎨 **Design Moderno**: UI/UX responsive con dark/light mode
- 🔐 **Autenticazione Robusta**: Login sociale, 2FA, gestione sessioni
- 💳 **Pagamenti Completi**: Stripe con abbonamenti e webhook
- 📊 **Analytics Avanzate**: Dashboard con metriche real-time
- 🤖 **AI Integrata**: Generazione contenuti e analisi automatica
- 📱 **Social Media Tools**: Gestione e pianificazione post
- 🧪 **Testing Completo**: Copertura unitaria e E2E
- 🚀 **Performance Ottimizzate**: Caching, compressione, lazy loading
- 📱 **Mobile-First**: Design responsive per tutti i dispositivi
- � **SEO Ready**: Meta tags, sitemap, structured data
- 🛡️ **Sicurezza**: Rate limiting, validazione input, CSRF protection
- 📄 **File Processing**: Upload, conversione e ottimizzazione
- 🌍 **Internazionalizzazione**: Supporto multilingua (IT/EN) con locale di default italiana


## 📋 Prerequisiti

### Account Richiesti

Avrai bisogno di account per i seguenti servizi. Tutti offrono piani gratuiti generosi per iniziare:

| Servizio | Scopo | Piano Gratuito |
|----------|-------|----------------|
| [GitHub](https://github.com/) | Repository e CI/CD | ✅ Illimitato |
| [Supabase](https://supabase.com/) | Database e Storage | ✅ 500MB DB |
| [Clerk](https://clerk.com/) | Autenticazione | ✅ 10K MAU |
| [Stripe](https://stripe.com/) | Pagamenti | ✅ + commissioni |
| [Vercel](https://vercel.com/) | Hosting | ✅ 100GB bandwidth |
| [OpenAI](https://openai.com/) | API AI | 💰 Pay-per-use |
| [Upstash](https://upstash.com/) | Redis Cache | ✅ 10K requests |

### Requisiti Sistema

- **Node.js**: 18.17+ o 20.3+
- **npm**: 9+ (o yarn/pnpm/bun)
- **Git**: Per il controllo versione

## ⚙️ Configurazione

### Variabili d'Ambiente

Crea un file `.env.local` nella root del progetto con le seguenti variabili:

```bash
# 🗄️ Database (Supabase)
DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
# Studio locale: http://127.0.0.1:54323/project/default

# 🔐 Autenticazione (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/login"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/signup"

# 💳 Pagamenti (Stripe)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY="https://buy.stripe.com/..."
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY="https://buy.stripe.com/..."

# 🤖 AI (OpenAI)
OPENAI_API_KEY="sk-..."

# 🚀 Cache (Upstash Redis)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# 🔧 Ambiente
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Guide di Configurazione

<details>
<summary>🗄️ <strong>Configurazione Supabase</strong></summary>

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Crea un nuovo progetto
3. Vai su **Settings > Database**
4. Copia la **Connection string** e sostituisci `[password]` con la password del database
5. Per sviluppo locale, usa `npm run db:local`

</details>

<details>
<summary>🔐 <strong>Configurazione Clerk</strong></summary>

1. Vai su [Clerk Dashboard](https://dashboard.clerk.com/)
2. Crea una nuova applicazione
3. Vai su **API Keys**
4. Copia **Publishable key** e **Secret key**
5. Configura i redirect URLs:
   - Sign-in: `http://localhost:3000/login`
   - Sign-up: `http://localhost:3000/signup`
   - After sign-in: `http://localhost:3000/dashboard`

</details>

<details>
<summary>💳 <strong>Configurazione Stripe</strong></summary>

1. Vai su [Stripe Dashboard](https://dashboard.stripe.com/)
2. Attiva la **modalità test**
3. Vai su **Developers > API Keys**
4. Copia la **Secret key**
5. Crea prodotti e prezzi per gli abbonamenti
6. Configura i webhook endpoint: `http://localhost:3000/api/webhooks/stripe`

</details>

<details>
<summary>🤖 <strong>Configurazione OpenAI</strong></summary>

1. Vai su [OpenAI Platform](https://platform.openai.com/)
2. Crea un account e verifica l'email
3. Vai su **API Keys**
4. Crea una nuova **Secret key**
5. Aggiungi crediti al tuo account per utilizzare l'API

</details>

## 🛠️ Installazione

### Installazione Rapida

```bash
# 1. Clona il repository
git clone https://github.com/mckaywrigley/mckays-app-template.git
cd mckays-app-template

# 2. Installa le dipendenze
npm install

# 3. Configura le variabili d'ambiente
cp .env.example .env.local
# Compila le variabili nel file .env.local

# 4. Configura il database
npm run db:local        # Avvia Supabase localmente
npm run db:generate      # Genera le migrazioni
npm run db:migrate       # Applica le migrazioni
npm run db:seed          # (Opzionale) Dati di esempio

# 5. Avvia l'applicazione
npm run dev
```

### Installazione Passo-Passo

<details>
<summary><strong>Passo 1: Clona il Repository</strong></summary>

```bash
git clone https://github.com/mckaywrigley/mckays-app-template.git
cd mckays-app-template
```

Oppure usa il template direttamente da GitHub:
- Vai su [github.com/mckaywrigley/mckays-app-template](https://github.com/mckaywrigley/mckays-app-template)
- Clicca su **"Use this template"**
- Crea il tuo nuovo repository

</details>

<details>
<summary><strong>Passo 2: Gestione Dipendenze</strong></summary>

```bash
# Con npm (raccomandato)
npm install

# Con yarn
yarn install

# Con pnpm
pnpm install

# Con bun (più veloce)
bun install
```

</details>

<details>
<summary><strong>Passo 3: Configurazione Database</strong></summary>

```bash
# Installa Supabase CLI (se non già installato)
npm install -g supabase

# Avvia Supabase localmente
npm run db:local

# In un nuovo terminale, genera le migrazioni
npm run db:generate

# Applica le migrazioni
npm run db:migrate

# Popola con dati di esempio (opzionale)
npm run db:seed
```

</details>

<details>
<summary><strong>Passo 4: Verifica Setup</strong></summary>

```bash
# Verifica che tutto sia configurato correttamente
npm run setup:verify

# Configura lo storage (se necessario)
npm run setup:storage

# Configura le policy di sicurezza
npm run setup:policies
```

</details>

### ✅ Verifica Installazione

Dopo l'installazione, dovresti vedere:

- ✅ Server in esecuzione su `http://localhost:3000`
- ✅ Supabase Studio su `http://127.0.0.1:54323`
- ✅ Database con tabelle create
- ✅ Nessun errore di TypeScript o ESLint

L'applicazione sarà disponibile su [http://localhost:3000](http://localhost:3000)

## 📜 Script Disponibili

### Development

| Script | Descrizione | Utilizzo |
|--------|-------------|----------|
| `npm run dev` | Avvia il server di sviluppo con Turbopack | Sviluppo quotidiano |
| `npm run build` | Build di produzione | Pre-deployment |
| `npm run start` | Avvia il server di produzione | Test produzione locale |
| `npm run analyze` | Analizza il bundle size | Ottimizzazione |

### Code Quality

| Script | Descrizione | Utilizzo |
|--------|-------------|----------|
| `npm run lint` | Verifica errori ESLint | CI/CD |
| `npm run lint:fix` | Corregge errori ESLint automaticamente | Pre-commit |
| `npm run format:write` | Formatta il codice con Prettier | Pre-commit |
| `npm run format:check` | Verifica formattazione Prettier | CI/CD |
| `npm run clean` | Lint + Format in un comando | Pulizia completa |
| `npm run types` | Verifica errori TypeScript | Type checking |

### Database & Storage

| Script | Descrizione | Utilizzo |
|--------|-------------|----------|
| `npm run db:local` | Avvia Supabase in locale | Sviluppo |
| `npm run db:generate` | Genera migrazioni Drizzle | Schema changes |
| `npm run db:migrate` | Applica migrazioni | Deploy DB |
| `npm run db:seed` | Popola DB con dati di esempio | Setup iniziale |

### Testing

| Script | Descrizione | Coverage |
|--------|-------------|----------|
| `npm run test` | Esegue tutti i test | Full suite |
| `npm run test:unit` | Solo test unitari con Jest | Components, utils |
| `npm run test:e2e` | Test end-to-end con Playwright | User journeys |

### Setup & Maintenance

| Script | Descrizione | Quando usare |
|--------|-------------|--------------|
| `npm run setup:verify` | Verifica configurazione | Post-install |
| `npm run setup:storage` | Configura Supabase Storage | Setup storage |
| `npm run setup:policies` | Configura RLS policies | Security setup |

### 🔄 Workflow Consigliato

```bash
# 🚀 Setup iniziale
npm install
npm run setup:verify

# 💻 Sviluppo quotidiano
npm run dev                    # In un terminale
npm run db:local              # In un altro terminale

# 🧹 Prima del commit
npm run clean                 # Format + lint
npm run types                 # Type check
npm run test:unit            # Test veloci

# 🚢 Prima del deploy
npm run test                  # Test completi
npm run build                # Verifica build
```

## 📁 Struttura del Progetto

```
mckays-app-template/
├── 📱 app/                     # Next.js App Router
│   ├── (authenticated)/        # 🔒 Route protette da autenticazione
│   │   ├── dashboard/          # 📊 Dashboard principale
│   │   ├── books/             # 📚 Gestione libri
│   │   ├── content/           # 📝 Gestione contenuti
│   │   ├── social/            # 📱 Social media tools
│   │   └── analytics/         # 📈 Analytics e metriche
│   ├── (unauthenticated)/     # 🌐 Route pubbliche
│   │   ├── login/             # 🔑 Pagina di login
│   │   ├── signup/            # 📝 Registrazione
│   │   └── landing/           # 🏠 Landing page
│   ├── api/                   # 🔌 API Routes
│   │   ├── auth/              # Autenticazione
│   │   ├── stripe/            # Pagamenti
│   │   ├── ai/                # AI endpoints
│   │   └── webhooks/          # Webhook handlers
│   ├── globals.css            # 🎨 Stili globali
│   ├── layout.tsx             # Layout principale
│   └── not-found.tsx          # 404 page
│
├── 🧩 components/             # Componenti React riutilizzabili
│   ├── ui/                    # 🎯 Componenti UI base (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── analytics/             # 📊 Componenti analytics
│   ├── books/                 # 📚 Componenti gestione libri
│   ├── content/               # 📝 Componenti contenuti
│   ├── payments/              # 💳 Componenti pagamenti
│   ├── social/                # 📱 Componenti social media
│   └── utility/               # 🔧 Componenti utility
│
├── 🗄️ db/                      # Database e schema
│   ├── schema/                # 📋 Schema Drizzle
│   │   ├── users.ts
│   │   ├── subscriptions.ts
│   │   ├── content.ts
│   │   └── analytics.ts
│   ├── migrations/            # 🔄 Migrazioni database
│   ├── seed/                  # 🌱 Dati di esempio
│   ├── index.ts               # Configurazione DB
│   └── validate-schema.ts     # Validazione schema
│
├── 🔧 lib/                    # Utilities e servizi
│   ├── ai-analysis.ts         # 🤖 Servizi AI
│   ├── analytics-service.ts   # 📊 Analytics
│   ├── auth.ts                # 🔐 Configurazione auth
│   ├── database.ts            # 💾 Database utilities
│   ├── stripe.ts              # 💳 Configurazione Stripe
│   ├── supabase.ts            # ☁️ Client Supabase
│   ├── validation.ts          # ✅ Schemi validazione
│   └── utils.ts               # 🛠️ Utility generiche
│
├── 🪝 hooks/                   # Custom React hooks
│   ├── use-auth.ts            # 🔐 Hook autenticazione
│   ├── use-subscription.ts    # 💳 Hook abbonamenti
│   ├── use-analytics.ts       # 📊 Hook analytics
│   └── use-mobile.ts          # 📱 Hook responsive
│
├── 🧪 __tests__/              # Test suites
│   ├── unit/                  # Test unitari
│   ├── integration/           # Test integrazione
│   ├── e2e/                   # Test end-to-end
│   └── performance/           # Test performance
│
├── 📊 actions/                # Server Actions
│   ├── auth.ts                # Azioni autenticazione
│   ├── payments.ts            # Azioni pagamenti
│   ├── content.ts             # Azioni contenuti
│   └── analytics.ts           # Azioni analytics
│
├── 🛠️ scripts/                # Script di utility
│   ├── setup-*.ts             # Script di setup
│   ├── migration-*.ts         # Script migrazioni
│   └── test-*.ts              # Script di test
│
├── 📚 docs/                   # Documentazione
│   ├── deployment.md          # Guide deployment
│   ├── api.md                 # Documentazione API
│   └── contributing.md        # Guide per contribuire
│
└── ⚙️ Config Files            # File di configurazione
    ├── next.config.ts          # Configurazione Next.js
    ├── tailwind.config.ts      # Configurazione Tailwind
    ├── drizzle.config.ts       # Configurazione Drizzle
    ├── jest.config.js          # Configurazione Jest
    ├── playwright.config.ts    # Configurazione Playwright
    └── tsconfig.json           # Configurazione TypeScript
```

### 🗂️ Organizzazione per Funzionalità

Il progetto segue una struttura modulare dove ogni funzionalità principale ha i suoi componenti, hook, azioni e test organizzati logicamente:

- **Authentication** (`/auth`): Login, registrazione, gestione profili
- **Payments** (`/payments`): Stripe, abbonamenti, fatturazione  
- **Content Management** (`/content`): Upload, processamento, AI analysis
- **Analytics** (`/analytics`): Metriche, dashboard, reportistica
- **Social Media** (`/social`): Integrazione piattaforme, scheduling
- **Books** (`/books`): Gestione libreria, metadati, categorizzazione

## 🚀 Funzionalità

### 🔐 Sistema di Autenticazione

**Basato su Clerk** - Autenticazione moderna e sicura

- ✅ **Login Sociale**: Google, GitHub, Microsoft, Apple
- ✅ **Autenticazione Multi-Factor**: SMS, TOTP, Email
- ✅ **Gestione Profili**: Avatar, informazioni personali, preferenze
- ✅ **Sicurezza Avanzata**: Rate limiting, protezione CSRF
- ✅ **Session Management**: JWT sicuri, refresh automatico
- ✅ **Organizzazioni**: Gestione team e workspace

```typescript
// Esempio di protezione route
import { auth } from '@clerk/nextjs'

export default async function DashboardPage() {
  const { userId } = auth()
  if (!userId) redirect('/login')
  // Route protetta...
}
```

### 💳 Sistema di Pagamenti

**Integrazione Stripe Completa** - Pagamenti sicuri e scalabili

- ✅ **Abbonamenti**: Mensili, annuali, con trial gratuiti
- ✅ **Pagamenti Una Tantum**: Prodotti digitali e fisici
- ✅ **Gestione Fatture**: PDF automatici, storici pagamenti
- ✅ **Webhook Sicuri**: Gestione eventi in real-time
- ✅ **Multi-Currency**: Supporto valute internazionali
- ✅ **Dispute Management**: Gestione chargebacks

```typescript
// Esempio di creazione abbonamento
import { stripe } from '@/lib/stripe'

const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: priceId }],
  trial_period_days: 14
})
```

### 📊 Analytics e Dashboard

**Sistema di Metriche Avanzato** - Insights actionable

- ✅ **Real-time Analytics**: Utenti attivi, conversioni, revenue
- ✅ **Dashboard Personalizzabili**: Grafici interattivi con Recharts
- ✅ **Funnel Analysis**: Tracking del customer journey
- ✅ **A/B Testing**: Split testing integrato
- ✅ **Performance Monitoring**: Core Web Vitals, errori
- ✅ **Export Data**: CSV, JSON, API endpoints

```typescript
// Esempio di tracking eventi
import { analytics } from '@/lib/analytics'

await analytics.track({
  event: 'subscription_created',
  userId,
  properties: { plan: 'pro', amount: 99 }
})
```

### 🤖 Strumenti AI Integrati

**Powered by OpenAI** - Automazione intelligente

- ✅ **Generazione Contenuti**: Blog posts, social media, email
- ✅ **Analisi Testi**: Sentiment, keywords, readability
- ✅ **Ottimizzazione SEO**: Meta descriptions, titoli
- ✅ **Traduzione Automatica**: Multi-lingua con context awareness
- ✅ **Content Moderation**: Filtri automatici per spam/inappropriate
- ✅ **Smart Recommendations**: Contenuti personalizzati

```typescript
// Esempio di generazione contenuto
import { openai } from '@/lib/openai'

const content = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ 
    role: "user", 
    content: `Genera un post per ${platform} su ${topic}` 
  }]
})
```

### 📱 Social Media Management

**Multi-Platform Publishing** - Gestione centralizzata

- ✅ **Pianificazione Post**: Calendario editoriale avanzato
- ✅ **Multi-Platform**: Facebook, Instagram, Twitter, LinkedIn
- ✅ **Auto-Posting**: Pubblicazione automatica programmata
- ✅ **Hashtag Intelligence**: Generazione hashtag ottimizzati
- ✅ **Analytics Social**: Engagement, reach, click-through rates
- ✅ **Content Templates**: Template pre-costruiti per ogni piattaforma

### 📚 Content Management System

**Gestione Contenuti Avanzata** - Dal upload alla pubblicazione

- ✅ **File Processing**: PDF, EPUB, Word, immagini
- ✅ **Text Extraction**: OCR avanzato con correzione errori
- ✅ **Image Optimization**: Compressione, resize, WebP conversion
- ✅ **Version Control**: Storico modifiche, rollback
- ✅ **Collaborative Editing**: Real-time collaboration
- ✅ **SEO Optimization**: Meta tags automatici, structured data

### 🛡️ Sicurezza e Compliance

**Security-First Approach** - Protezione completa

- ✅ **Data Encryption**: At-rest e in-transit
- ✅ **Rate Limiting**: Protezione API abuse
- ✅ **Input Validation**: Sanitizzazione automatica
- ✅ **GDPR Compliance**: Privacy by design
- ✅ **Audit Logging**: Tracciamento completo attività
- ✅ **Security Headers**: CSP, HSTS, X-Frame-Options

### 🌍 Sistema di Internazionalizzazione

**Supporto Multilingua Nativo** - Esperienza localizzata

- ✅ **Italiano di Default**: Lingua principale predefinita
- ✅ **Inglese Supportato**: Traduzione completa interfaccia
- ✅ **Language Selector**: Cambio lingua dinamico nell'UI
- ✅ **Route Localizzate**: URL automatici per ogni lingua
- ✅ **Traduzioni Complete**: Dashboard, forme, errori, notifiche
- ✅ **Server Components**: SSR con traduzioni server-side

```typescript
// Esempio di utilizzo
import { useNavigationTranslations } from '@/hooks/use-translations'

function MyComponent() {
  const t = useNavigationTranslations()
  return <h1>{t('dashboard')}</h1> // "Dashboard" o "Cruscotto"
}
```

**Struttura URL:**
- 🇮🇹 **Italiano**: `/dashboard`, `/books` (default, senza prefisso)
- 🇺🇸 **Inglese**: `/en/dashboard`, `/en/books`

## 🧪 Testing

Il template include una suite di test completa per garantire affidabilità e qualità del codice.

### 🔧 Setup Testing

```bash
# Installa le dipendenze di test (già incluse)
npm install

# Esegue tutti i test
npm run test

# Test specifici
npm run test:unit      # Solo test unitari
npm run test:e2e       # Solo test end-to-end
```

### 📋 Tipi di Test Inclusi

#### 🎯 **Test Unitari** (Jest + Testing Library)

- **Componenti React**: Rendering, props, interazioni
- **Utilities**: Funzioni helper, validazione, formatters
- **Hooks**: Custom hooks e state management
- **API Functions**: Server actions e utility functions

```typescript
// Esempio test componente
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

test('renders button with correct text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button')).toHaveTextContent('Click me')
})
```

#### 🌐 **Test End-to-End** (Playwright)

- **Critical User Journeys**: Registration, login, payment flow
- **Multi-Browser Testing**: Chrome, Firefox, Safari
- **Mobile Testing**: Responsive design validation
- **Performance Testing**: Core Web Vitals monitoring

```typescript
// Esempio test E2E
import { test, expect } from '@playwright/test'

test('user can sign up and access dashboard', async ({ page }) => {
  await page.goto('/signup')
  await page.fill('[name="email"]', 'test@example.com')
  await page.click('[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

#### ⚡ **Test di Performance**

- **AI Analysis Performance**: Tempi di risposta API
- **File Processing**: Upload e conversione documenti
- **Database Queries**: Ottimizzazione query performance
- **Bundle Size**: Monitoraggio dimensioni build

#### 🔗 **Test di Integrazione**

- **API Integration**: Stripe, Clerk, OpenAI
- **Database Operations**: CRUD operations
- **Workflow Testing**: Book-to-content pipeline

### 📊 Coverage Report

I test mirano a mantenere una copertura alta:

- **Statements**: 85%+
- **Branches**: 80%+
- **Functions**: 90%+
- **Lines**: 85%+

```bash
# Genera report di coverage
npm run test:coverage

# Apre report nel browser
open coverage/lcov-report/index.html
```

### 🚀 CI/CD Integration

I test sono integrati nel workflow CI/CD:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e
```

### 🔍 Test Utils e Mocks

Il template include utilities per semplificare i test:

```typescript
// __tests__/utils/test-utils.tsx
import { render } from '@testing-library/react'
import { ClerkProvider } from '@clerk/nextjs'

export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ClerkProvider publishableKey="test-key">
      {ui}
    </ClerkProvider>
  )
}
```

### 🐛 Debug Testing

```bash
# Test in modalità debug
npm run test:debug

# Test specifico con watch mode
npm run test -- --watch Button.test.tsx

# Test E2E con UI browser
npx playwright test --ui
```

## 🚀 Deployment

### 🌟 Vercel (Consigliato)

**Deployment ottimizzato per Next.js**

<details>
<summary><strong>Setup Automatico</strong></summary>

1. **Connetti Repository**
   - Vai su [vercel.com](https://vercel.com)
   - Clicca "Import Project"
   - Connetti il tuo repository GitHub

2. **Configura Variabili d'Ambiente**
   ```bash
   # Nel dashboard Vercel > Settings > Environment Variables
   DATABASE_URL=your_production_database_url
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   OPENAI_API_KEY=sk-...
   ```

3. **Deploy Automatico**
   - Ogni push al branch `main` triggera un deploy automatico
   - Preview deploys per ogni PR

</details>

<details>
<summary><strong>Setup Manuale</strong></summary>

```bash
# Installa Vercel CLI
npm i -g vercel

# Login e setup
vercel login
vercel

# Deploy
vercel --prod
```

</details>

### 🌐 Altre Piattaforme Cloud

<details>
<summary>🚀 <strong>Netlify</strong></summary>

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

</details>

<details>
<summary>🚂 <strong>Railway</strong></summary>

```dockerfile
# Railway Deploy
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

</details>

<details>
<summary>☁️ <strong>AWS Amplify</strong></summary>

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

</details>

<details>
<summary>🐳 <strong>Docker</strong></summary>

```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

</details>

### 🔧 Configurazione Produzione

#### Environment Variables di Produzione

```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database Production
DATABASE_URL=postgresql://prod_user:pass@prod-db.com:5432/prod_db

# Auth Production Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Stripe Live Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...

# OpenAI Production
OPENAI_API_KEY=sk-live-...
```

#### Database Migration

```bash
# Migrazione database di produzione
npm run db:generate
npm run db:migrate

# Verifica schema
npm run setup:verify
```

#### Performance Optimizations

```typescript
// next.config.ts
const nextConfig = {
  // Compressione
  compress: true,
  
  // Ottimizzazione immagini
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  
  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    bundle: {
      analyzer: {
        enabled: true,
      },
    },
  }),
}
```

### 📈 Monitoring e Observability

<details>
<summary><strong>Setup Monitoring</strong></summary>

```typescript
// lib/monitoring.ts
import { init } from '@sentry/nextjs'

init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
```

**Tools Consigliati:**
- 🔍 **Sentry**: Error tracking e performance monitoring
- 📊 **Vercel Analytics**: Web vitals e user insights  
- 🚨 **Uptime Robot**: Monitoring uptime e alerting
- 📈 **PostHog**: Product analytics e feature flags

</details>

### ✅ Deployment Checklist

- [ ] ✅ Environment variables configurate
- [ ] 🗄️ Database migrato e testato
- [ ] 🔐 Certificati SSL attivi
- [ ] 📊 Analytics e monitoring configurati
- [ ] 🔍 SEO tags e meta verificati
- [ ] 🚀 Performance ottimizzate
- [ ] 🧪 Test E2E passati in produzione
- [ ] 📱 Mobile responsiveness verificata
- [ ] 🔒 Security headers configurati
- [ ] 💳 Webhook Stripe testati

## 🤝 Contribuire

Apprezziamo ogni contributo! Ecco come puoi aiutare a migliorare il template.

### 🚀 Come Contribuire

#### 1. **Setup Locale**

```bash
# Fork e clone del repository
git clone https://github.com/TUO_USERNAME/mckays-app-template.git
cd mckays-app-template

# Aggiungi upstream remote
git remote add upstream https://github.com/mckaywrigley/mckays-app-template.git

# Setup completo
npm install
npm run setup:verify
```

#### 2. **Development Workflow**

```bash
# Crea un branch per la tua feature
git checkout -b feature/amazing-feature

# Fai le tue modifiche
# ...

# Verifica tutto funzioni
npm run test
npm run lint
npm run build

# Commit delle modifiche
git add .
git commit -m "feat: add amazing feature"

# Push al tuo fork
git push origin feature/amazing-feature
```

#### 3. **Pull Request**

1. Vai su GitHub e apri una Pull Request
2. Compila il template di PR
3. Aspetta la review e feedback
4. Applica i suggerimenti se necessario

### 📝 Guidelines

#### **Commit Convention**

Seguiamo [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new payment provider
fix: resolve authentication bug
docs: update API documentation
style: format code with prettier
refactor: optimize database queries
test: add unit tests for components
chore: update dependencies
```

#### **Code Style**

```bash
# Il codice deve passare questi check
npm run lint         # ESLint
npm run format:check # Prettier
npm run types        # TypeScript
npm run test         # Test coverage
```

#### **Pull Request Template**

```markdown
## 📋 Descrizione
Brief description of the changes

## 🔧 Tipo di Modifica
- [ ] 🐛 Bug fix
- [ ] ✨ Nuova feature
- [ ] 💥 Breaking change
- [ ] 📚 Documentazione
- [ ] 🎨 Style/UI changes

## ✅ Checklist
- [ ] Tests aggiunti/aggiornati
- [ ] Documentazione aggiornata
- [ ] Code review self-completata
- [ ] Nessun breaking change
```

### 🐛 Bug Reports

Quando segnali un bug, includi:

```markdown
## 🐛 Bug Description
Clear description of the bug

## 🔄 Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## ✅ Expected Behavior
What you expected to happen

## 📱 Environment
- OS: [e.g. iOS, Windows]
- Browser: [e.g. chrome, safari]
- Version: [e.g. 22]
- Node.js version:
- npm version:
```

### 💡 Feature Requests

Per richiedere nuove funzionalità:

```markdown
## 🚀 Feature Request

**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots.
```

### 🎯 Aree di Contribuzione

Cerchiamo aiuto in queste aree:

- 🐛 **Bug Fixes**: Risoluzione problemi esistenti
- ✨ **Nuove Features**: Implementazione funzionalità richieste
- 📚 **Documentazione**: Miglioramento docs e guide
- 🧪 **Testing**: Aggiunta test coverage
- 🌐 **Internazionalizzazione**: Traduzioni e i18n
- ♿ **Accessibilità**: Miglioramenti a11y
- 🎨 **UI/UX**: Design e user experience
- ⚡ **Performance**: Ottimizzazioni performance

### 🏆 Contributors

Grazie a tutti i contributor che hanno aiutato:

<!-- AUTO-GENERATED-CONTENT:START (CONTRIBUTORS) -->
<!-- AUTO-GENERATED-CONTENT:END -->

### 📜 Code of Conduct

Adottiamo il [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). 
Partecipando, accetti di rispettare questo codice.

### 🎉 Riconoscimenti

I contributor vengono riconosciuti in:
- README.md (Contributors section)
- CHANGELOG.md per ogni release
- Social media shoutouts
- Accesso anticipato a nuove feature

## 🆘 Supporto

Hai bisogno di aiuto? Ecco le risorse disponibili:

### 📚 Documentazione

- 📖 **[Wiki Completa](https://github.com/mckaywrigley/mckays-app-template/wiki)** - Guide dettagliate
- 🔌 **[API Documentation](https://github.com/mckaywrigley/mckays-app-template/docs/api.md)** - Riferimenti API
- 🚀 **[Deployment Guide](https://github.com/mckaywrigley/mckays-app-template/docs/deployment.md)** - Guide deployment

### 💬 Community & Support

- 🐛 **[GitHub Issues](https://github.com/mckaywrigley/mckays-app-template/issues)** - Bug reports e feature requests
- 💡 **[GitHub Discussions](https://github.com/mckaywrigley/mckays-app-template/discussions)** - Q&A e discussioni
- 🎓 **[Workshop su Takeoff](https://JoinTakeoff.com/)** - Workshop live e training
- 📺 **[YouTube Channel](https://www.youtube.com/c/McKayWrigley)** - Tutorial e deep-dives

### 🔧 Troubleshooting

#### Problemi Comuni

<details>
<summary><strong>❌ Database Connection Issues</strong></summary>

```bash
# Verifica variabili d'ambiente
echo $DATABASE_URL

# Test connessione database
npm run setup:verify

# Reset database locale
npm run db:local
npm run db:migrate
```

</details>

<details>
<summary><strong>❌ Authentication Problems</strong></summary>

```bash
# Verifica chiavi Clerk
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
echo $CLERK_SECRET_KEY

# Controlla redirect URLs in Clerk Dashboard:
# - Sign-in URL: http://localhost:3000/login
# - Sign-up URL: http://localhost:3000/signup
# - After sign-in: http://localhost:3000/dashboard
```

</details>

<details>
<summary><strong>❌ Build Errors</strong></summary>

```bash
# Pulisci cache e reinstalla
rm -rf .next node_modules package-lock.json
npm install

# Verifica TypeScript
npm run types

# Check ESLint
npm run lint
```

</details>

<details>
<summary><strong>❌ Stripe Webhook Issues</strong></summary>

```bash
# Test webhook locale
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Verifica endpoint secret
echo $STRIPE_WEBHOOK_SECRET

# Check logs nel Stripe Dashboard
```

</details>

### 📧 Contatto Diretto

Per supporto prioritario o questioni urgenti:

- 📧 **Email**: [mckay@takeoff.com](mailto:mckay@takeoff.com)
- 🐦 **Twitter**: [@McKayWrigley](https://twitter.com/McKayWrigley)
- 💼 **LinkedIn**: [McKay Wrigley](https://linkedin.com/in/mckaywrigley)

### 🎯 Business Inquiries

- 🏢 **Consulting**: Personalizzazioni enterprise
- 🎓 **Training**: Workshop personalizzati per team
- 🤝 **Partnership**: Collaborazioni e sponsorships

### ⚡ Risposta Veloce

| Canale | Tempo Risposta | Tipo |
|--------|----------------|------|
| GitHub Issues | 24-48h | Bug reports, feature requests |
| GitHub Discussions | 12-24h | Q&A, supporto generale |
| Email | 2-5 giorni | Business, consulenze |
| Twitter | Varia | Updates, quick questions |

### 📋 Template Issue

Quando apri un issue, usa questo template:

```markdown
## 🔍 Environment
- OS: [e.g. macOS, Windows, Linux]
- Node.js: [e.g. 18.17.0]
- npm: [e.g. 9.6.7]
- Browser: [e.g. Chrome 91]

## 📋 Steps to Reproduce
1. 
2. 
3. 

## ✅ Expected Behavior


## ❌ Actual Behavior


## 📎 Additional Context
```

---

**Non esitare a chiedere aiuto! La community è qui per supportarti. 🚀**

## 📄 Licenza

Questo progetto è distribuito sotto **licenza MIT**. Vedi il file [LICENSE](LICENSE) per i dettagli completi.

### 🔓 Cosa Puoi Fare

```
✅ Uso commerciale      ✅ Modifica
✅ Distribuzione        ✅ Uso privato
✅ Sublicenziamento     ✅ Vendita
```

### 📋 Requisiti

- ✅ **Includi la licenza**: Mantieni il copyright notice
- ✅ **Includi gli autori**: Riconosci i contributor originali

### 🚫 Limitazioni

- ❌ **Nessuna garanzia**: Il software è fornito "as-is"
- ❌ **Nessuna responsabilità**: Gli autori non sono responsabili per danni

### 💡 TL;DR

**Puoi fare tutto quello che vuoi con questo codice, basta che includi la licenza MIT!**

---

## 🙏 Ringraziamenti

Questo template non sarebbe possibile senza questi fantastici progetti:

### 🛠️ Core Technologies

- 🔥 **[Next.js Team](https://nextjs.org/)** - Il framework React che rende tutto possibile
- ⚛️ **[React Team](https://react.dev/)** - La libreria UI che amiamo
- 🎨 **[Tailwind CSS](https://tailwindcss.com/)** - CSS framework incredibile
- 🧩 **[Shadcn/ui](https://ui.shadcn.com/)** - Componenti UI bellissimi e accessibili

### 🔐 Infrastructure & Services

- 🔑 **[Clerk](https://clerk.com/)** - Autenticazione semplice e sicura
- 💳 **[Stripe](https://stripe.com/)** - Pagamenti robusti e scalabili  
- 🗄️ **[Supabase](https://supabase.com/)** - Backend potente e developer-friendly
- 🔍 **[Drizzle ORM](https://orm.drizzle.team/)** - ORM type-safe fantastico

### 🤖 AI & Analytics

- 🧠 **[OpenAI](https://openai.com/)** - AI che potenzia la generazione contenuti
- 📊 **[Upstash](https://upstash.com/)** - Redis serverless per caching

### 🧪 Development Tools

- 🃏 **[Jest](https://jestjs.io/)** - Test framework affidabile
- 🎭 **[Playwright](https://playwright.dev/)** - E2E testing moderno
- 🎯 **[TypeScript](https://www.typescriptlang.org/)** - Type safety e DX eccellente

### 🌟 Ispirazione

- 💡 **[T3 Stack](https://create.t3.gg/)** - Full-stack TypeScript inspirations
- 🚀 **[Vercel Templates](https://vercel.com/templates)** - Deployment e hosting perfetti
- 📚 **[Developer Community](https://dev.to/)** - Knowledge sharing continuo

---

## 🚀 Pronto a Costruire?

```bash
git clone https://github.com/mckaywrigley/mckays-app-template.git
cd mckays-app-template
npm install
npm run dev
```

**Costruisci il futuro. Oggi. 🌟**

---

<div align="center">

**Costruito con ❤️ da [Mckay Wrigley](https://github.com/mckaywrigley)**

[🌟 Star su GitHub](https://github.com/mckaywrigley/mckays-app-template) • 
[🐦 Seguimi su Twitter](https://twitter.com/McKayWrigley) • 
[🎓 Join Takeoff](https://JoinTakeoff.com/)

</div>
