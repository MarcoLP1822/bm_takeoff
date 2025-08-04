# Data Access Layer

Questo layer centralizza l'accesso ai dati con controlli di sicurezza integrati e caching automatico.

## Struttura

```
lib/data-access/
├── index.ts          # Esportazioni principali
├── book-queries.ts   # Query per libri
└── content-queries.ts # Query per contenuti
```

## Utilizzo

### Libri

```typescript
import { getUserBooks, findBookForUser, createBookForUser } from '@/lib/data-access';

// Ottenere tutti i libri dell'utente
const books = await getUserBooks('user-id');

// Trovare un libro specifico con controllo autorizzazione
const book = await findBookForUser('user-id', 'book-id');

// Creare nuovo libro
const newBook = await createBookForUser('user-id', {
  title: 'Il mio libro',
  // ... altri campi
});
```

### Contenuti

```typescript
import { getUserContent, createContentForBook } from '@/lib/data-access';

// Ottenere contenuti con filtri
const content = await getUserContent('user-id', {
  bookId: 'book-id',
  status: 'published',
  limit: 10
});

// Creare nuovo contenuto
const newContent = await createContentForBook('book-id', {
  title: 'Nuovo post',
  content: 'Contenuto...',
  // ... altri campi
});
```

## Caratteristiche

- **Sicurezza**: Ogni query include controlli di autorizzazione automatici
- **Cache**: Utilizza React `cache()` per ottimizzare le performance
- **TypeScript**: Completamente tipizzato con validazione runtime
- **Error Handling**: Gestione errori consistente in tutto il layer

## Vantaggi

1. **DRY**: Elimina duplicazione di query nei componenti
2. **Sicurezza**: Centralizza tutti i controlli di autorizzazione
3. **Performance**: Cache automatico per query frequenti
4. **Manutenibilità**: Punto unico per modifiche alle query
5. **Testing**: Facilita il testing delle operazioni su database
