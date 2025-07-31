import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function testFileUpload() {
  try {
    console.log('🧪 Testing file upload API endpoint...')
    
    // Create a test file buffer
    const testContent = 'This is a test document for file upload testing.'
    const testBuffer = Buffer.from(testContent, 'utf8')
    
    // Create form data
    const formData = new FormData()
    const testFile = new File([testBuffer], 'test-document.txt', {
      type: 'text/plain'
    })
    formData.append('file', testFile)
    
    console.log('📤 Attempting to upload test file...')
    
    // Test the upload endpoint
    const response = await fetch('http://localhost:3001/api/books/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Simulate authenticated request - in real app this would come from Clerk
        'Authorization': 'Bearer test-token'
      }
    })
    
    const result = await response.text()
    console.log('📥 Response status:', response.status)
    console.log('📄 Response body:', result)
    
    if (response.status === 401) {
      console.log('✅ Authentication check working - user not authenticated (expected)')
    } else if (response.status === 500) {
      console.log('⚠️  Server error - likely RLS policy issue (expected until JWT is configured)')
    } else {
      console.log('🎉 Unexpected response - check the details above')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testFileUpload()
