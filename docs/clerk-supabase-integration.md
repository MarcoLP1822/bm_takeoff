# Clerk + Supabase Integration Setup

## Step 1: Configure Clerk JWT Template

1. Go to your Clerk Dashboard: https://dashboard.clerk.com
2. Navigate to your project
3. Go to "JWT Templates" in the sidebar
4. Click "New template"
5. Select "Supabase" from the list
6. Name it "supabase"
7. Use this configuration:

```json
{
  "aud": "authenticated",
  "exp": {{exp}},
  "iat": {{iat}},
  "iss": "https://{{domain}}",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "phone": "{{user.primary_phone_number.phone_number}}",
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "user_metadata": {
    "full_name": "{{user.full_name}}",
    "first_name": "{{user.first_name}}",
    "last_name": "{{user.last_name}}"
  },
  "role": "authenticated"
}
```

## Step 2: Configure Supabase for Clerk

In your Supabase project:

1. Go to Settings → Auth → Settings
2. Set JWT Secret to your Clerk JWT signing key
3. Set Site URL to your application URL
4. Configure additional redirect URLs if needed

## Step 3: Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Step 4: RLS Policies

The RLS policies should use `auth.uid()` which will work with Clerk tokens:

```sql
-- Example policy for books bucket
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'books' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

The `auth.uid()` function will extract the user ID from the Clerk JWT token.
