# CWG APP - Production MVP

A React Native (Expo) mobile application for managing scripts and resources, with contact import and SMS sending capabilities.

## 🎯 Features

- **Authentication**: Email/password sign up and login with user profiles
- **Scripts Library**: Create, edit, delete, and favorite scripts. Admins can create official scripts.
- **Resources Hub**: Admins can upload images, videos, and PDFs. All users can view and favorite resources.
- **Contacts & SMS**: Import phone contacts and send scripts via native SMS composer
- **Role-based Access**: User and admin roles with appropriate permissions

## 🛠 Tech Stack

- **React Native (Expo)** - Mobile framework
- **TypeScript** - Type safety
- **Expo Router** - File-based navigation
- **Supabase** - Backend (Auth + PostgreSQL + Storage + RLS)
- **React Query (TanStack)** - Data fetching and caching
- **Zod** - Schema validation
- **NativeWind** - Tailwind CSS for React Native

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account (free tier works)
- iOS Simulator (Mac) or Android Emulator / Physical device

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Setup

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned

#### Run Database Schema
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and run the contents of `supabase/schema.sql`
4. Copy and run the contents of `supabase/storage-policies.sql`

#### Create Storage Bucket
1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `resources`
3. Make it **public** (or the policies will handle access)
4. The storage policies from `supabase/storage-policies.sql` will control access

#### Get API Keys
1. Go to Project Settings > API
2. Copy your `Project URL` and `anon/public` key

### 3. Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Create Admin User

After signing up your first user, set them as admin:

1. Go to Supabase Dashboard > Authentication > Users
2. Copy the user's UUID
3. Go to SQL Editor and run:
```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'YOUR_USER_UUID_HERE';
```

### 5. Run the App

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## 📁 Project Structure

```
/app                 # Expo Router routes
  /(auth)           # Authentication screens (login, signup)
  /(tabs)           # Tab navigation (scripts, resources, profile)
  /script           # Script detail, create, edit screens
  /resource         # Resource detail screen
  /admin            # Admin-only screens
  /contacts         # Contact picker
  /send-preview     # SMS preview screen
/lib
  /queries          # React Query hooks (auth, scripts, resources)
  supabase.ts       # Supabase client setup
  react-query.tsx   # Query client provider
/types              # TypeScript type definitions
/utils
  validation.ts     # Zod schemas
  sms.ts            # SMS sending utilities
/supabase
  schema.sql        # Database schema + RLS policies
  storage-policies.sql  # Storage bucket policies
  seed.sql          # Sample data (optional)
```

## 🔐 Security (RLS Policies)

All tables have Row Level Security (RLS) enabled:

- **Scripts**: Users can read admin scripts + their own. Users can create/edit/delete only their own. Admins can manage all scripts.
- **Resources**: All authenticated users can read. Only admins can create/update/delete.
- **Favorites**: Users can only manage their own favorites.
- **Storage**: Authenticated users can read. Only admins can write.

## 📱 Key Features Explained

### SMS Sending
- Uses native SMS composer (not automatic sending)
- Opens pre-filled SMS with script text
- Handles single and multiple recipients
- Falls back to clipboard copy if SMS API unavailable

### Scripts
- Users create personal scripts (is_admin=false)
- Admins can create admin scripts (is_admin=true) via SQL or admin interface
- All users see admin scripts + their own scripts
- Favorites are stored per user

### Resources
- Admins upload files to Supabase Storage
- Files are served via signed URLs (1 hour expiry)
- All authenticated users can view resources
- Resources can be favorited

## 🧪 Testing

1. **Sign Up**: Create a new user account
2. **Create Script**: Add a personal script
3. **Send Script**: Select script → Choose contacts → Send via SMS
4. **View Resources**: Browse admin-uploaded resources
5. **Admin Features**: Set a user as admin, then:
   - Upload resources from Profile > Upload Resources
   - Manage scripts from Profile > Manage Scripts

## 🐛 Troubleshooting

### "Cannot connect to Supabase"
- Check your `.env` file has correct credentials
- Ensure Supabase project is active
- Check network connectivity

### "Permission denied" errors
- Verify RLS policies are applied (run schema.sql)
- Check user role in profiles table
- Ensure user is authenticated

### SMS not opening
- Check device permissions (contacts, SMS)
- Verify expo-sms is installed
- On iOS simulator, SMS composer may not work (test on device)

### File upload fails
- Check storage bucket exists and is named `resources`
- Verify storage policies are applied
- Check file size limits (Supabase free tier: 50MB)

## 📝 Next Steps (Phase 2)

1. **Twilio Integration**: True automated SMS sending via Twilio API
2. **Script Categories**: Enhanced filtering and organization
3. **Resource Preview**: In-app preview for images/videos
4. **Push Notifications**: Notify users of new admin scripts/resources
5. **Analytics**: Track script usage and engagement
6. **Offline Support**: Enhanced caching for offline access
7. **Search**: Full-text search across scripts
8. **Bulk Operations**: Send to multiple contacts simultaneously

## 📄 License

Private project - All rights reserved

## 👥 Support

For issues or questions, please check the troubleshooting section or review the codebase documentation.
