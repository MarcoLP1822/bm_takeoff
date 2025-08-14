# Fix per Contenuti Duplicati

## 🔍 Problema Identificato

L'utente ha segnalato la presenza di molti contenuti con lo stesso titolo e testo nella dashboard dei contenuti. Dopo un'analisi approfondita del codice, ho identificato le seguenti cause:

### Cause Principali:

1. **Funzione `extractThemeFromContent()` troppo generica**
   - Assegnava lo stesso nome di tema ("Love & Emotion", "General Insight") a contenuti diversi
   - Creava l'impressione di duplicati anche se i contenuti erano unici

2. **ID delle variazioni non sufficientemente unici**
   - Usava solo timestamp: `quote-${Date.now()}-${i}`
   - Non includeva informazioni del libro o identificatori univoci

3. **Mancanza di `variationGroupId` nel salvataggio**
   - I contenuti non venivano raggruppati correttamente nel database
   - Difficile tracciare quale contenuto apparteneva a quale variazione

4. **Nomi di tema generici**
   - "Quote", "Key Insight", "Theme" non erano descrittivi
   - Non mostravano il contenuto effettivo

## 🛠️ Soluzioni Implementate

### 1. Nuova Funzione `createUniqueThemeName()`

```typescript
function createUniqueThemeName(content: string, sourceType: string, contentId: string): string {
  // Estrae la prima frase significativa (fino a 50 caratteri)
  const cleanContent = content.trim().replace(/\s+/g, ' ')
  const firstSentence = cleanContent.split(/[.!?]/)[0].trim()
  const shortTitle = firstSentence.length > 50 
    ? firstSentence.substring(0, 47) + "..." 
    : firstSentence

  // Aggiunge prefisso per chiarezza
  const prefixes = {
    quote: "Quote:",
    insight: "Insight:",
    theme: "Theme:",
    summary: "Summary:",
    discussion: "Discussion:"
  }

  const prefix = prefixes[sourceType as keyof typeof prefixes] || "Content:"
  return `${prefix} ${shortTitle}`
}
```

**Benefici:**
- Nomi di tema unici e descrittivi
- Mostra il contenuto effettivo
- Previene duplicati apparenti

### 2. ID delle Variazioni Migliorati

**Prima:**
```typescript
id: `quote-${Date.now()}-${i}`
```

**Dopo:**
```typescript
id: `quote-${bookId ? bookId.slice(-8) : Date.now()}-${Date.now()}-${i}`
```

**Benefici:**
- Include identificatore del libro
- Più univoco e tracciabile
- Facilita il debugging

### 3. Nomi di Tema Descrittivi

**Prima:**
```typescript
theme: "Quote"
theme: "Key Insight"
theme: "Theme"
```

**Dopo:**
```typescript
theme: `Quote: ${quote.length > 50 ? quote.substring(0, 47) + "..." : quote}`
theme: `Insight: ${insight.length > 50 ? insight.substring(0, 47) + "..." : insight}`
theme: theme // Usa il nome effettivo del tema
```

**Benefici:**
- Immediatamente riconoscibile
- Mostra il contenuto reale
- Elimina confusione

### 4. Salvataggio con `variationGroupId`

**Aggiunto ai route API:**
```typescript
variationGroupId: variation.id, // Raggruppa variazioni correlate
generationContext: {
  preset: preset?.id,
  presetName: preset?.name,
  bookTitle: book.title,
  generatedAt: new Date().toISOString(),
  sourceType: variation.sourceType
}
```

**Benefici:**
- Raggruppa correttamente le variazioni
- Migliora la tracciabilità
- Facilita la gestione nel Content Manager

### 5. Raggruppamento Migliorato in `/api/content/variations`

**Aggiornata la logica di raggruppamento:**
```typescript
const theme = content.sourceType === 'theme' 
  ? content.sourceContent || extractThemeFromContent(content.content)
  : createUniqueThemeName(content.content, content.sourceType || "quote", content.id)
```

**Benefici:**
- Usa contenuto originale quando disponibile
- Crea nomi unici per contenuti senza sourceContent
- Evita duplicati apparenti

## 📊 Risultati Attesi

Dopo queste modifiche, l'utente dovrebbe vedere:

1. **Nomi di tema più descrittivi e unici**
   - Invece di "Love & Emotion" ripetuto 5 volte
   - Nomi come "Quote: Bruma è una storia di mistero...", "Insight: Il personaggio principale scopre..."

2. **Raggruppamento corretto delle variazioni**
   - Contenuti correlati raggruppati insieme
   - Facile distinguere variazioni diverse

3. **Migliore tracciabilità**
   - Chiaro da quale libro e sezione proviene ogni contenuto
   - Contesto di generazione salvato

4. **UI più pulita**
   - Meno confusione sui contenuti "duplicati"
   - Informazioni più utili per l'utente

## 🧪 Test Consigliati

1. **Genera nuovo contenuto** usando un preset
2. **Verifica che i nomi siano descrittivi** e unici
3. **Controlla il raggruppamento** nel Content Manager
4. **Testa con libri diversi** per assicurarsi che gli ID siano unici

## 📝 Note Tecniche

- Le modifiche sono retrocompatibili
- Contenuti esistenti continueranno a funzionare
- Nuovi contenuti avranno nomi più descrittivi
- Database schema inalterato

## 🔄 File Modificati

1. `app/api/content/variations/route.ts` - Logica di raggruppamento migliorata
2. `app/api/content/generate/preset/route.ts` - Salvataggio con variationGroupId
3. `app/api/content/generate/route.ts` - Salvataggio migliorato
4. `lib/content-generation.ts` - ID e nomi di tema migliorati

---

**Data:** 14 Agosto 2025  
**Problema risolto:** Contenuti duplicati con stesso titolo  
**Impatto:** Miglioramento significativo dell'UX nel Content Manager
