# Quick Setup Guide

## 1. Install Dependencies
```bash
npm install
```

## 2. Supabase Setup

### Create Project
1. Go to https://supabase.com
2. Create new project
3. Wait for database to initialize

### Run SQL Scripts
1. Open SQL Editor in Supabase Dashboard
2. Run `supabase/schema.sql` (creates tables + RLS policies)
3. Run `supabase/storage-policies.sql` (creates storage policies)

### Create Storage Bucket
1. Go to Storage in Supabase Dashboard
2. Click "New bucket"
3. Name it: `resources`
4. Make it **public** (policies control access)

### Get API Keys
1. Go to Project Settings > API
2. Copy:
   - Project URL (looks like: https://xxxxx.supabase.co)
   - anon/public key (long string)

## 3. Environment Variables

Create `.env` file in root:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Create Admin User

After signing up first user:

1. Go to Supabase Dashboard > Authentication > Users
2. Copy the user's UUID
3. Go to SQL Editor and run:
```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'PASTE_USER_UUID_HERE';
```

## 5. Run App

```bash
npm start
# Then press 'i' for iOS or 'a' for Android
```

## Assets Note

The `app.json` references these asset files that you'll need to add:
- `assets/icon.png` (1024x1024)
- `assets/splash.png` (1284x2778)
- `assets/adaptive-icon.png` (1024x1024)
- `assets/favicon.png` (48x48)

For now, you can use placeholder images or generate them using Expo's asset generation tools.

## Troubleshooting

### Database errors
- Ensure all SQL scripts ran successfully
- Check RLS policies are enabled on all tables
- Verify user is authenticated

### Storage errors
- Ensure bucket is named exactly `resources`
- Check storage policies are applied
- Verify file size is under 50MB (free tier limit)

### SMS not working
- Test on physical device (simulator limitations)
- Check permissions are granted
- Verify expo-sms is installed

## Next Steps

1. Add your app assets (icons, splash screens)
2. Test all features (signup, scripts, resources, SMS)
3. Set up admin user
4. Upload some test resources
5. Create sample scripts
