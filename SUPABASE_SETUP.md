# Supabase Setup Instructions

## What You Need to Provide

To fix the Supabase error, you need **2 values** from your Supabase project:

1. **Supabase Project URL**
2. **Supabase Anon Key**

## How to Get These Values

### Step 1: Create/Login to Supabase
1. Go to https://supabase.com
2. Sign in or create a free account
3. Create a new project (or use an existing one)
   - Give it a name (e.g., "CWG APP")
   - Set a database password (save this!)
   - Choose a region close to you
   - Wait 2-3 minutes for setup to complete

### Step 2: Get Your Credentials
1. In your Supabase project dashboard, click the **⚙️ Settings** (gear icon) in the left sidebar
2. Click **API** in the settings menu
3. You'll see a section called **Project API keys**
4. Copy these values:
   - **Project URL** - Looks like: `https://abcdefghijklmnop.supabase.co`
   - **anon public** key - A long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 3: Update Your .env File

Open the `.env` file in the root of your project and replace the placeholder values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace:
- `your-project-id.supabase.co` with your actual Project URL
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` with your actual anon key

### Step 4: Set Up Database

After updating the .env file, you also need to:

1. **Run the database schema:**
   - Go to SQL Editor in Supabase dashboard
   - Run the SQL from `supabase/schema.sql`
   - Run the SQL from `supabase/storage-policies.sql`

2. **Create storage bucket:**
   - Go to Storage in Supabase dashboard
   - Create a bucket named `resources`
   - Make it public (policies will control access)

3. **Restart the server:**
   ```bash
   pkill -f "expo start"
   npm run web -- --port 3939
   ```

## Example .env File

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI4MCwiZXhwIjoxOTU0NTQzMjgwfQ.example_signature
```

## Security Note

- Never commit your `.env` file to git (it's already in `.gitignore`)
- The `anon` key is safe to use in client-side code (that's why it's called "anon")
- Never share your `service_role` key (that one has admin access)

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Getting Started: https://supabase.com/docs/guides/getting-started
