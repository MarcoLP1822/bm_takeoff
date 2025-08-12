// Test rapido per verificare i nuovi endpoint dell'Analysis Hub
// Questo script testa gli endpoint di analisi granulare e rigenerazione

const BASE_URL = 'http://localhost:3000'

async function testAnalysisEndpoints() {
  console.log('🧪 Testing Analysis Hub endpoints...\n')
  
  // Test 1: Verifica endpoint status
  console.log('1️⃣ Testing /api/books/[bookId]/analysis/status')
  try {
    const response = await fetch(`${BASE_URL}/api/books/test-book-id/analysis/status`)
    console.log(`   Status: ${response.status}`)
    if (response.status === 401) {
      console.log('   ✅ Expected 401 (needs authentication)')
    } else {
      const data = await response.json()
      console.log('   Response:', data)
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message)
  }
  
  console.log('')
  
  // Test 2: Verifica endpoint regenerate
  console.log('2️⃣ Testing /api/books/[bookId]/regenerate/themes')
  try {
    const response = await fetch(`${BASE_URL}/api/books/test-book-id/regenerate/themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    console.log(`   Status: ${response.status}`)
    if (response.status === 401) {
      console.log('   ✅ Expected 401 (needs authentication)')
    } else {
      const data = await response.json()
      console.log('   Response:', data)
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message)
  }
  
  console.log('')
  
  // Test 3: Verifica endpoint regenerate con sezione non valida
  console.log('3️⃣ Testing /api/books/[bookId]/regenerate/invalid')
  try {
    const response = await fetch(`${BASE_URL}/api/books/test-book-id/regenerate/invalid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    console.log(`   Status: ${response.status}`)
    const data = await response.json()
    console.log('   Response:', data)
    if (response.status === 400) {
      console.log('   ✅ Expected 400 for invalid section')
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message)
  }
  
  console.log('')
  console.log('🏁 Test completed!')
}

// Esegui i test se il server è in running
if (typeof window === 'undefined') {
  // Node.js environment
  testAnalysisEndpoints().catch(console.error)
} else {
  // Browser environment
  console.log('Run this script after starting the dev server with: npm run dev')
  console.log('Then open browser console and run: testAnalysisEndpoints()')
}

// Export per uso in browser
if (typeof window !== 'undefined') {
  window.testAnalysisEndpoints = testAnalysisEndpoints
}
