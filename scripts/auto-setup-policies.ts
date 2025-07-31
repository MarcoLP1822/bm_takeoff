import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function setupStoragePoliciesAutomatically() {
  try {
    console.log('🔧 Setting up storage policies automatically...')
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // SQL commands to execute
    const sqlCommands = [
      // Drop existing policies
      `DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;`,
      
      // Enable RLS
      `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`,
      
      // Create helper function
      `CREATE OR REPLACE FUNCTION get_user_id() RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt() ->> 'sub';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
      
      // Create policies
      `CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'books' AND
  get_user_id() = (storage.foldername(name))[1]
);`,
      
      `CREATE POLICY "Users can read own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'books' AND
  get_user_id() = (storage.foldername(name))[1]
);`,
      
      `CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'books' AND
  get_user_id() = (storage.foldername(name))[1]
);`,
      
      `CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'books' AND
  get_user_id() = (storage.foldername(name))[1]
);`
    ]
    
    // Execute each command
    for (const sql of sqlCommands) {
      if (sql.trim()) {
        console.log(`Executing: ${sql.split('\n')[0]}...`)
        
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql })
        
        if (error) {
          // Try alternative method with direct query
          const { error: directError } = await supabaseAdmin
            .from('_realtime_schema')
            .select('*')
            .limit(0) // This is just to test connection, then we'll use raw SQL
          
          console.log(`⚠️  Standard RPC failed, this is expected. Policies need to be set manually.`)
          break
        } else {
          console.log('✅ Command executed successfully')
        }
      }
    }
    
    console.log('')
    console.log('📋 Manual setup required:')
    console.log('Since direct SQL execution requires special permissions, please:')
    console.log('')
    console.log('1. Go to: https://supabase.com/dashboard/project/bbqggqkvxqnjvrslrmea/sql/new')
    console.log('2. Copy and paste this SQL:')
    console.log('')
    
    // Print all commands as a single block
    console.log('-- Storage policies for Clerk integration')
    sqlCommands.forEach(cmd => {
      if (cmd.trim()) {
        console.log(cmd)
        console.log('')
      }
    })
    
    console.log('3. Click "Run" to execute')
    console.log('')
    console.log('✨ After running the SQL, the file upload should work with proper RLS!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

setupStoragePoliciesAutomatically()
