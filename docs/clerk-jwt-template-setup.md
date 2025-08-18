# Configurazione JWT Template Clerk-Supabase

## Problema Risolto
L'errore `Error: Not Found` quando si cerca di ottenere il token Supabase da Clerk è causato dalla mancanza del JWT template "supabase" configurato in Clerk.

## Soluzione

### Configurazione in Clerk Dashboard

1. **Accedi al Clerk Dashboard**
   - Vai su [dashboard.clerk.com](https://dashboard.clerk.com)
   - Seleziona il tuo progetto

2. **Naviga a JWT Templates**
   - Nel menu laterale, vai su `Configure` → `JWT Templates`

3. **Crea un nuovo JWT Template**
   - Clicca su `+ New template`
   - Seleziona `Supabase` dal menu delle integrazioni

4. **Configura il Template**
   - **Nome**: `supabase`
   - **Audience**: Il tuo Supabase Project Reference ID
   - **Issuer**: `https://clerk.{your-domain}.com` (sostituisci con il tuo dominio)
   - **Claims**: Aggiungi i seguenti claims:
     ```json
     {
       "aud": "authenticated",
       "exp": "{{exp}}",
       "iat": "{{iat}}",
       "iss": "{{iss}}",
       "sub": "{{user.id}}",
       "email": "{{user.primary_email_address}}",
       "phone": "{{user.primary_phone_number}}",
       "app_metadata": {
         "provider": "clerk",
         "providers": ["clerk"]
       },
       "user_metadata": {
         "email": "{{user.primary_email_address}}",
         "email_verified": "{{user.primary_email_address_verified}}",
         "phone_verified": "{{user.primary_phone_number_verified}}",
         "sub": "{{user.id}}"
       }
     }
     ```

5. **Configura Supabase**
   - In Supabase Dashboard, vai su `Authentication` → `Settings`
   - Nella sezione `JWT Settings`, aggiungi Clerk come provider JWT
   - Usa la chiave pubblica di Clerk per verificare i token

### Variabili d'Ambiente Necessarie

Assicurati di avere queste variabili nel tuo `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Verifica della Configurazione

Una volta configurato, il sistema dovrebbe:
1. ✅ Ottenere correttamente il token JWT da Clerk
2. ✅ Autenticare l'utente con Supabase usando il token
3. ✅ Eliminare i warning di fallback nell'autenticazione

### Fallback di Sviluppo

Il sistema è configurato per funzionare anche senza il JWT template usando il client admin di Supabase come fallback. Tuttavia, per la produzione è fortemente raccomandato configurare correttamente il JWT template per rispettare le policy RLS di Supabase.

### Test

Per testare che tutto funzioni:
1. Avvia l'applicazione in sviluppo
2. Fai login come utente
3. Esegui operazioni che richiedono autenticazione (es. upload file)
4. Verifica nei log che non ci siano più errori "Not Found" per il template Supabase
