/**
 * Scenario di Test End-to-End: Workflow Completo di Content Creation
 * 
 * Questo test manuale guida attraverso lo scenario completo:
 * 1. Upload libro
 * 2. Analisi con progresso granulare
 * 3. Rigenerazione sezioni
 * 4. Content Workshop
 * 5. Gestione contenuti
 */

# Test Scenario E2E: Complete Content Workflow

## Prerequisiti
- App in running su localhost:3001
- Database configurato e funzionante
- Account utente Clerk autenticato

## Scenario 1: Book Analysis Hub (Phase 3 Features)

### Test 1.1: Upload e Analisi Completa
1. **Navigare a**: http://localhost:3001/dashboard/books
2. **Azione**: Upload un file PDF/DOCX (es. libro di test)
3. **Verifica**: File appare nella library con status "pending"
4. **Azione**: Cliccare sul titolo del libro per aprire dettagli
5. **Verifica**: Vedere pulsante "Start Analysis"
6. **Azione**: Cliccare "Start Analysis"
7. **Verifica**: 
   - Status cambia a "processing"
   - Progress bar animata appare
   - Step-by-step progress visible:
     - ✓ Text Extraction
     - 🔄 Themes Identification (in progress)
     - ⏳ Quotes Extraction (pending)
     - ⏳ Insights Generation (pending)
8. **Attesa**: 30-60 secondi per completamento
9. **Verifica**: 
   - Status "completed"
   - Tutte le sezioni popolate (themes, quotes, insights)

### Test 1.2: Rigenerazione Granulare
1. **Navigare a**: Dettaglio libro analizzato
2. **Azione**: Cliccare "Regenerate" per sezione "Key Themes"
3. **Verifica**: 
   - Pulsante mostra "Regenerating..." con spinner
   - Sezione themes si aggiorna con nuovi risultati
   - Altre sezioni rimangono invariate
4. **Ripetere** per quotes e insights
5. **Verifica**: Ogni rigenerazione è indipendente

## Scenario 2: Content Workshop (Phase 4 Features)

### Test 2.1: Workshop da Theme
1. **Navigare a**: Dettaglio libro con analisi completa
2. **Azione**: Cliccare su un theme badge o "Create Content" per themes
3. **Verifica**: Workshop modal si apre con:
   - Source Theme mostrato
   - Tab per 4 piattaforme (Twitter, Instagram, LinkedIn, Facebook)
   - Tab Twitter attivo di default
4. **Azione**: Cliccare "Generate" per Twitter
5. **Verifica**: 
   - "Generating content variations..." appare
   - Dopo 5-20s, 3 variazioni Twitter appaiono
   - Ogni post ha content, hashtags, copy button
6. **Azione**: Cliccare "Generate New" per più variazioni
7. **Verifica**: Nuove variazioni si aggiungono alle esistenti

### Test 2.2: Workshop Multi-Platform
1. **Nel workshop aperto**, cliccare tab "Instagram"
2. **Azione**: Cliccare "Generate"
3. **Verifica**: Contenuti Instagram-specific generati
4. **Ripetere** per LinkedIn e Facebook
5. **Verifica**: Ogni piattaforma ha contenuti ottimizzati

### Test 2.3: Copy e Success Message
1. **Nel workshop**, cliccare "Copy" su un post
2. **Verifica**: Testo copiato negli appunti
3. **Azione**: Chiudere workshop
4. **Verifica**: Messaggio successo verde appare:
   - "✅ Generated and saved X posts! Check Content Management to review."

## Scenario 3: Content Management Integration (Phase 5 Features)

### Test 3.1: Contenuti dal Workshop Visibili
1. **Navigare a**: http://localhost:3001/dashboard/content
2. **Verifica**: 
   - Contenuti generati dal workshop appaiono
   - Raggruppati per variationGroupId
   - Source type e content mostrati (theme/quote/insight)
   - Book title e author visibili

### Test 3.2: Source Tracking
1. **Nel Content Manager**, trovare variazione dal workshop
2. **Verifica**: 
   - Source Type: "theme" (o quote/insight)
   - Source Content: testo originale theme
   - Book info: titolo e autore corretti
3. **Azione**: Espandere variazione
4. **Verifica**: Tutti i post delle 4 piattaforme raggruppati insieme

### Test 3.3: Create New Content Flow
1. **Se Content Manager vuoto**, cliccare "Create New Content"
2. **Verifica**: Reindirizza a /dashboard/books
3. **Se non vuoto**, cliccare "Create New Content" button in header
4. **Verifica**: Stesso redirect

## Scenario 4: Complete User Journey

### Test 4.1: Workflow End-to-End
1. **Upload** nuovo libro
2. **Analizzare** con progress tracking
3. **Rigenerare** 1-2 sezioni per ottimizzare
4. **Aprire workshop** da theme specifico
5. **Generare** contenuti per 2-3 piattaforme
6. **Copiare** alcuni post
7. **Chiudere** workshop
8. **Navigare** a Content Management
9. **Verificare** tutti i contenuti presenti e raggruppati
10. **Editare** un post nel content manager

### Test 4.2: Multiple Sources
1. **Generare** contenuti da theme
2. **Generare** contenuti da quote
3. **Generare** contenuti da insight
4. **Verificare** in Content Management:
   - 3 gruppi di variazioni distinti
   - Source tracking corretto per ognuno
   - Raggruppamento per variationGroupId funzionante

## Criteri di Successo

### ✅ Phase 3: Analysis Hub
- [ ] Progress granulare visualizzato in tempo reale
- [ ] Rigenerazione sezioni indipendente funziona
- [ ] UI responsive e user-friendly
- [ ] Error handling per fallimenti

### ✅ Phase 4: Content Workshop  
- [ ] Workshop si apre da analysis results
- [ ] Generazione platform-specific funziona
- [ ] Multi-platform navigation fluida
- [ ] Copy-to-clipboard operativo
- [ ] Contenuti salvati automaticamente

### ✅ Phase 5: Content Management
- [ ] Contenuti workshop visibili immediatamente
- [ ] Source tracking accurato
- [ ] Raggruppamento per variationGroupId
- [ ] Create new content flow intuitivo
- [ ] Backward compatibility mantenuta

## Troubleshooting

### Problemi Comuni
1. **Workshop non si apre**: Verificare che libro sia analizzato completamente
2. **Generazione lenta**: Normale 5-30s per OpenAI API
3. **Contenuti non appaiono**: Refresh Content Management page
4. **Progress non aggiorna**: Verificare polling API status

### Debug
- Console browser per errori JavaScript
- Network tab per API calls
- Terminal server per logs backend

## Metriche Performance
- **Upload + Analysis**: < 2 minuti per file medio
- **Rigenerazione sezione**: 10-30 secondi
- **Workshop generation**: 5-30 secondi per piattaforma
- **Content Management load**: < 2 secondi

---

**Data Test**: ___________
**Tester**: ___________
**Risultato**: ⭐⭐⭐⭐⭐ (1-5 stelle)
**Note**: _________________________
