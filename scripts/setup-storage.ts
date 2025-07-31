import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local FIRST
config({ path: resolve(process.cwd(), '.env.local') })

async function setupStorageBucket() {
  try {
    console.log('Setting up Supabase storage bucket...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    
    // Create supabase client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Create the 'books' bucket
    const { data: bucket, error: bucketError } = await supabaseAdmin.storage.createBucket('books', {
      public: true, // Make bucket public to avoid RLS issues
      allowedMimeTypes: [
        'application/pdf',
        'application/epub+zip',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ],
      fileSizeLimit: 50 * 1024 * 1024 // 50MB
    })

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket "books" already exists')
      } else {
        console.error('❌ Error creating bucket:', bucketError)
        return
      }
    } else {
      console.log('✅ Created bucket "books":', bucket)
    }

    console.log('🎉 Storage setup complete!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

setupStorageBucket()
