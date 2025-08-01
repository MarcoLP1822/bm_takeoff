// Questo è un file temporaneo per testare le correzioni dei parametri
// In Next.js 15, i parametri delle route sono Promise che devono essere risolte

// PRIMA (errato):
// { params: { bookId: "123" } }

// DOPO (corretto):
// { params: Promise.resolve({ bookId: "123" }) }

// Gli errori principali sono nei seguenti pattern:
// 1. params: { bookId: mockBookId }
// 2. params: { contentId: mockContentId } 
// 3. params: { variationId: "var-123" }
// 4. params: { platform: "twitter" }
// 5. params: { platform: "invalid" }
// 6. params: { postId: "post-123" }

console.log("Guida alle correzioni per i test TypeScript");
