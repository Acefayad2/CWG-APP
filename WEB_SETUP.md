# Running on Web (localhost)

## Quick Start

1. **Set up environment variables** (if not done):
   Create `.env` file in the root directory:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Start the web server**:
   ```bash
   npm run web
   # OR
   npx expo start --web
   ```

3. **Access the app**:
   - The app will open automatically in your browser
   - Usually at: `http://localhost:8081` or `http://localhost:19006`
   - Check the terminal output for the exact URL

## Mobile-Friendly Features

The app is already mobile-friendly because:
- Built with React Native, optimized for mobile screens
- Uses responsive design with Tailwind CSS (NativeWind)
- Touch-friendly UI components
- Responsive layouts that adapt to screen sizes

## Testing on Mobile Devices

### Option 1: Browser Dev Tools
- Open browser DevTools (F12)
- Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
- Select a mobile device preset
- Refresh the page

### Option 2: Network Access
- Find your computer's IP address
- Access from mobile browser: `http://YOUR_IP:PORT`
- Make sure both devices are on the same network

## Web Limitations

Note: Some features work differently on web:
- **Contacts**: Web browsers have limited contact access (may not work)
- **SMS**: SMS sending via native composer won't work on web (will use fallback)
- **File Upload**: Works but uses browser file picker instead of native

For full functionality, test on:
- iOS Simulator: `npm run ios`
- Android Emulator: `npm run android`
- Physical device via Expo Go app

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8081
npx kill-port 8081

# Or use a different port
npx expo start --web --port 3000
```

### Environment Variables Not Loading
- Restart the dev server after creating/updating `.env`
- Make sure variables start with `EXPO_PUBLIC_`
- Check `.env` file is in the root directory

### Build Errors
```bash
# Clear cache and restart
npx expo start --web --clear
```
