#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function verifyIntegration() {
  console.log('🔍 Verifying Clerk + Supabase Integration Setup...')
  console.log('')
  
  let allGood = true
  
  // Check environment variables
  console.log('1. 📋 Checking environment variables...')
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY'
  ]
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar} is set`)
    } else {
      console.log(`   ❌ ${envVar} is missing`)
      allGood = false
    }
  }
  
  // Check Supabase connection
  console.log('\n2. 🔗 Testing Supabase connection...')
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data, error } = await supabase.storage.listBuckets()
    if (error) {
      console.log(`   ❌ Supabase connection failed: ${error.message}`)
      allGood = false
    } else {
      console.log('   ✅ Supabase connection successful')
      
      const booksBucket = data.find(b => b.name === 'books')
      if (booksBucket) {
        console.log('   ✅ Books storage bucket exists')
      } else {
        console.log('   ❌ Books storage bucket missing')
        allGood = false
      }
    }
  } catch (error) {
    console.log(`   ❌ Supabase connection error: ${error}`)
    allGood = false
  }
  
  // Check development server
  console.log('\n3. 🌐 Checking development server...')
  try {
    const response = await fetch('http://localhost:3001/api/books/upload', {
      method: 'POST',
      body: new FormData() // Empty form data
    })
    
    if (response.status === 401) {
      console.log('   ✅ Upload endpoint responding (authentication required)')
    } else if (response.status === 400) {
      console.log('   ✅ Upload endpoint responding (validation working)')
    } else {
      console.log(`   ⚠️  Upload endpoint responded with status: ${response.status}`)
    }
  } catch (error) {
    console.log('   ❌ Development server not running. Run: npm run dev')
    allGood = false
  }
  
  console.log('\n📋 Setup Status:')
  if (allGood) {
    console.log('🎉 All basic checks passed!')
    console.log('')
    console.log('📝 Manual steps still required:')
    console.log('   1. Configure Clerk JWT template (see INTEGRATION_SETUP.md)')
    console.log('   2. Run SQL policies in Supabase (see INTEGRATION_SETUP.md)')
    console.log('   3. Test file upload at http://localhost:3001/dashboard/books')
  } else {
    console.log('❌ Some issues found. Please fix the errors above.')
  }
  
  console.log('')
  console.log('📖 For detailed setup instructions, see: INTEGRATION_SETUP.md')
}

verifyIntegration().catch(console.error)
