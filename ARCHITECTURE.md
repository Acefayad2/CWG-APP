# Architecture Overview

## Tech Stack
- **Frontend**: React Native (Expo) with TypeScript
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Supabase (Auth + PostgreSQL + Storage)
- **State Management**: React Query (TanStack Query)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Validation**: Zod

## Database Schema

### Tables
1. **profiles** - User profiles with role (user/admin)
2. **scripts** - Scripts with is_admin flag
3. **script_favorites** - User favorites for scripts
4. **resources** - Admin-uploaded resources (images/videos/PDFs)
5. **resources_favorites** - User favorites for resources

### Security (RLS)
- All tables have Row Level Security enabled
- Policies enforce user/admin permissions
- Storage bucket policies control file access

## App Structure

### Authentication Flow
1. User signs up → Profile created automatically (trigger)
2. User signs in → Session stored in AsyncStorage
3. Auth state changes → Router navigates accordingly

### Navigation Structure
```
Root Stack
├── (auth) Stack (no header)
│   ├── login
│   └── signup
├── (tabs) Stack (with header)
│   ├── scripts
│   ├── resources
│   └── profile
└── Modal Screens (with headers)
    ├── script/[id]
    ├── script/create
    ├── script/edit/[id]
    ├── resource/[id]
    ├── contacts
    ├── send-preview
    ├── admin/scripts
    └── admin/resources
```

## Key Features Implementation

### Scripts
- **List**: Shows admin scripts + user's own scripts
- **Create**: Users create personal scripts (is_admin=false)
- **Edit/Delete**: Users can only edit/delete their own scripts
- **Favorites**: Stored in separate table, user-specific
- **Admin**: Can create/edit/delete all scripts (RLS policy)

### Resources
- **Upload**: Admin-only, uses Supabase Storage
- **View**: All authenticated users can view
- **Favorites**: User-specific favorites
- **File Handling**: Files uploaded as blobs, served via signed URLs

### Contacts & SMS
- **Import**: Uses expo-contacts API
- **Selection**: Multi-select contact picker
- **Sending**: Opens native SMS composer pre-filled with script text
- **Fallback**: Clipboard copy if SMS API unavailable

## Data Flow

### React Query Hooks
- `useScripts()` - Fetch scripts list
- `useScript()` - Fetch single script
- `useCreateScript()` - Create script
- `useUpdateScript()` - Update script
- `useDeleteScript()` - Delete script
- `useToggleScriptFavorite()` - Toggle favorite
- Similar hooks for resources and auth

### State Management
- Server state: React Query (cached, refetched on focus)
- Local state: React useState (forms, UI state)
- Auth state: Supabase Auth (persisted in AsyncStorage)

## Security Considerations

### RLS Policies
- Users can only read their own data + admin content
- Users can only modify their own content
- Admins can modify all content (checked via profiles table)
- Storage access controlled by bucket policies

### Authentication
- Email/password via Supabase Auth
- Sessions persisted in AsyncStorage
- Auto-refresh tokens enabled
- Protected routes check auth state

## File Upload Flow
1. User selects file (image/video/PDF)
2. File read as blob via fetch API
3. Uploaded to Supabase Storage bucket
4. Resource record created in database
5. Files served via signed URLs (1 hour expiry)

## SMS Sending Flow
1. User selects script
2. Opens contact picker
3. Selects one or more contacts
4. Preview screen shows script + contacts
5. "Send from Phone" opens native SMS composer
6. Script text pre-filled in message body

## Future Enhancements (Phase 2)
- Twilio integration for automated SMS
- Enhanced script categories and tags
- In-app resource preview
- Push notifications
- Analytics tracking
- Offline-first caching
- Full-text search
- Bulk operations
