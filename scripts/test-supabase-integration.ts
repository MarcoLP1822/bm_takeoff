import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function testSupabaseIntegration() {
  try {
    console.log('🧪 Testing Supabase integration...')
    
    // Test basic connection
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Test bucket existence
    console.log('📦 Checking storage bucket...')
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets()
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError)
      return
    }
    
    const booksBucket = buckets.find(bucket => bucket.name === 'books')
    if (booksBucket) {
      console.log('✅ Books bucket found:', booksBucket)
    } else {
      console.log('⚠️  Books bucket not found. Creating...')
      
      const { data, error } = await supabaseAdmin.storage.createBucket('books', {
        public: false,
        allowedMimeTypes: [
          'application/pdf',
          'application/epub+zip',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ],
        fileSizeLimit: 50 * 1024 * 1024
      })
      
      if (error) {
        console.error('❌ Error creating bucket:', error)
      } else {
        console.log('✅ Books bucket created:', data)
      }
    }
    
    // Check if RLS is enabled
    console.log('🔒 Checking RLS policies...')
    const { data: policies, error: policyError } = await supabaseAdmin
      .from('storage.objects')
      .select('*')
      .limit(1)
    
    if (policyError && policyError.message.includes('row-level security')) {
      console.log('✅ RLS is enabled on storage.objects')
    } else {
      console.log('⚠️  RLS status unclear')
    }
    
    console.log('')
    console.log('🎯 Next steps:')
    console.log('1. Configure Clerk JWT template:')
    console.log('   - Go to Clerk Dashboard → JWT Templates')
    console.log('   - Create new template named "supabase"')
    console.log('   - Use the configuration in docs/clerk-supabase-integration.md')
    console.log('')
    console.log('2. Run these SQL commands in Supabase:')
    console.log('   - Copy the commands from the previous script output')
    console.log('   - Paste them in Supabase Dashboard → SQL Editor')
    console.log('')
    console.log('3. Test file upload again')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSupabaseIntegration()
