import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local FIRST
config({ path: resolve(process.cwd(), '.env.local') })

async function setupStoragePolicies() {
  try {
    console.log('Setting up Supabase storage policies...')
    
    // Create supabase client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('⚠️  Storage policies need to be created manually in Supabase Dashboard')
    console.log('')
    console.log('Please go to: https://supabase.com/dashboard/project/bbqggqkvxqnjvrslrmea/settings/api')
    console.log('Then navigate to: Storage → Settings → Policies')
    console.log('')
    console.log('Create these policies for the "objects" table in the "storage" schema:')
    console.log('')
    console.log('1. Policy Name: "Users can upload to own folder"')
    console.log('   Operation: INSERT')
    console.log('   Policy Definition:')
    console.log('   bucket_id = \'books\' AND auth.uid()::text = (storage.foldername(name))[1]')
    console.log('')
    console.log('2. Policy Name: "Users can read own files"')
    console.log('   Operation: SELECT')  
    console.log('   Policy Definition:')
    console.log('   bucket_id = \'books\' AND auth.uid()::text = (storage.foldername(name))[1]')
    console.log('')
    console.log('3. Policy Name: "Users can update own files"')
    console.log('   Operation: UPDATE')
    console.log('   Policy Definition:')
    console.log('   bucket_id = \'books\' AND auth.uid()::text = (storage.foldername(name))[1]')
    console.log('')
    console.log('4. Policy Name: "Users can delete own files"')
    console.log('   Operation: DELETE')
    console.log('   Policy Definition:')
    console.log('   bucket_id = \'books\' AND auth.uid()::text = (storage.foldername(name))[1]')
    console.log('')
    console.log('Alternative: Run these SQL commands in the SQL Editor:')
    console.log('')
    
    const sqlCommands = [
      "-- Enable RLS on storage.objects",
      "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;",
      "",
      "-- Policy for INSERT (upload)",
      "CREATE POLICY \"Users can upload to own folder\" ON storage.objects",
      "FOR INSERT WITH CHECK (",
      "  bucket_id = 'books' AND",
      "  auth.uid()::text = (storage.foldername(name))[1]", 
      ");",
      "",
      "-- Policy for SELECT (read)",
      "CREATE POLICY \"Users can read own files\" ON storage.objects", 
      "FOR SELECT USING (",
      "  bucket_id = 'books' AND",
      "  auth.uid()::text = (storage.foldername(name))[1]",
      ");",
      "",
      "-- Policy for UPDATE",
      "CREATE POLICY \"Users can update own files\" ON storage.objects",
      "FOR UPDATE USING (",
      "  bucket_id = 'books' AND", 
      "  auth.uid()::text = (storage.foldername(name))[1]",
      ");",
      "",
      "-- Policy for DELETE", 
      "CREATE POLICY \"Users can delete own files\" ON storage.objects",
      "FOR DELETE USING (",
      "  bucket_id = 'books' AND",
      "  auth.uid()::text = (storage.foldername(name))[1]",
      ");"
    ]
    
    sqlCommands.forEach(cmd => console.log(cmd))
    
    console.log('')
    console.log('🔧 After creating these policies, try uploading a file again.')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

setupStoragePolicies()
