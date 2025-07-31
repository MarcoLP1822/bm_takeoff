import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function updateStoragePolicies() {
  try {
    console.log('Updating Supabase storage policies for Clerk integration...')
    
    // Create supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔧 Manual SQL commands to run in Supabase SQL Editor:')
    console.log('')
    
    const sqlCommands = [
      "-- Drop existing policies if they exist",
      "DROP POLICY IF EXISTS \"Users can upload to own folder\" ON storage.objects;",
      "DROP POLICY IF EXISTS \"Users can read own files\" ON storage.objects;", 
      "DROP POLICY IF EXISTS \"Users can update own files\" ON storage.objects;",
      "DROP POLICY IF EXISTS \"Users can delete own files\" ON storage.objects;",
      "",
      "-- Enable RLS on storage.objects",
      "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;",
      "",
      "-- Create a custom function to get user ID from JWT",
      "CREATE OR REPLACE FUNCTION get_user_id() RETURNS TEXT AS $$",
      "BEGIN",
      "  -- Extract user ID from JWT claim 'sub'", 
      "  RETURN auth.jwt() ->> 'sub';",
      "END;",
      "$$ LANGUAGE plpgsql SECURITY DEFINER;",
      "",
      "-- Policy for INSERT (upload) - works with Clerk JWT",
      "CREATE POLICY \"Users can upload to own folder\" ON storage.objects",
      "FOR INSERT WITH CHECK (",
      "  bucket_id = 'books' AND",
      "  get_user_id() = (storage.foldername(name))[1]", 
      ");",
      "",
      "-- Policy for SELECT (read)",
      "CREATE POLICY \"Users can read own files\" ON storage.objects", 
      "FOR SELECT USING (",
      "  bucket_id = 'books' AND",
      "  get_user_id() = (storage.foldername(name))[1]",
      ");",
      "",
      "-- Policy for UPDATE",
      "CREATE POLICY \"Users can update own files\" ON storage.objects",
      "FOR UPDATE USING (",
      "  bucket_id = 'books' AND", 
      "  get_user_id() = (storage.foldername(name))[1]",
      ");",
      "",
      "-- Policy for DELETE", 
      "CREATE POLICY \"Users can delete own files\" ON storage.objects",
      "FOR DELETE USING (",
      "  bucket_id = 'books' AND",
      "  get_user_id() = (storage.foldername(name))[1]",
      ");"
    ]
    
    sqlCommands.forEach(cmd => console.log(cmd))
    
    console.log('')
    console.log('🔧 After running these SQL commands:')
    console.log('1. Configure Clerk JWT template as described in docs/clerk-supabase-integration.md')
    console.log('2. Test file upload again')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

updateStoragePolicies()
