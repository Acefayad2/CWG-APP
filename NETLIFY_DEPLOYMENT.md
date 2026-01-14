# Netlify Deployment Guide

This guide will help you deploy the CWG APP to Netlify.

## Prerequisites

- A Netlify account (free tier works)
- A GitHub repository with your code (already set up at https://github.com/Acefayad2/CWG-APP.git)
- Supabase credentials (URL and anon key)

## Step 1: Connect Repository to Netlify

1. **Log in to Netlify**:
   - Go to [netlify.com](https://www.netlify.com)
   - Sign in with your GitHub account

2. **Add New Site**:
   - Click "Add new site" → "Import an existing project"
   - Select GitHub as your Git provider
   - Authorize Netlify to access your GitHub repositories
   - Select the `CWG-APP` repository

3. **Configure Build Settings** (Netlify should auto-detect from `netlify.toml`):
   - **Build command**: `npm run build:web`
   - **Publish directory**: `web-build`
   - Netlify should automatically detect these from `netlify.toml`

## Step 2: Set Environment Variables

1. **In Netlify Dashboard**:
   - Go to your site's settings
   - Navigate to "Site configuration" → "Environment variables"
   - Click "Add a variable"

2. **Add the following variables**:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Replace the values with your actual Supabase credentials:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL (e.g., `https://xxx.supabase.co`)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key

3. **Click "Save"**

## Step 3: Deploy

1. **Trigger Deployment**:
   - After connecting the repository, Netlify will automatically trigger a deployment
   - You can also manually trigger a deployment from the "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"

2. **Monitor Build**:
   - Go to the "Deploys" tab to watch the build progress
   - The build will:
     - Install dependencies (`npm install`)
     - Run the build command (`npm run build:web`)
     - Deploy the static files from `web-build/`

3. **Access Your Site**:
   - Once the deployment completes, your site will be live
   - Netlify will provide a URL like: `https://your-site-name.netlify.app`
   - You can customize the site name in Site settings → "Change site name"

## Step 4: Custom Domain (Optional)

1. **Add Custom Domain**:
   - Go to "Site configuration" → "Domain management"
   - Click "Add custom domain"
   - Follow the instructions to configure your domain
   - Update DNS records as instructed

## Configuration Details

### Build Process

- **Build Command**: `npm run build:web` (runs `npx expo export -p web`)
- **Output Directory**: `web-build/`
- **Node Version**: 18 (specified in `netlify.toml`)

### Routing

- All routes are redirected to `index.html` for client-side routing (Expo Router)
- This ensures deep links work correctly

### Caching

- Static assets (JS, CSS) are cached for 1 year
- This improves performance for returning visitors

## Troubleshooting

### Build Fails

1. **Check Build Logs**:
   - Go to "Deploys" → Click on the failed deployment
   - Review the build logs for errors

2. **Common Issues**:
   - **Missing environment variables**: Make sure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set
   - **Node version mismatch**: Netlify should use Node 18 (specified in `netlify.toml`)
   - **Build timeout**: Free tier has a 15-minute build limit; upgrade if needed

### Environment Variables Not Working

- Make sure variable names start with `EXPO_PUBLIC_` (required for Expo web)
- Redeploy after adding/updating environment variables
- Check that values don't have extra spaces or quotes

### Routing Issues

- The `netlify.toml` includes redirects for client-side routing
- All routes redirect to `index.html` with a 200 status
- If routes don't work, check the redirect configuration

### Performance

- Static assets are cached for 1 year (configured in `netlify.toml`)
- Enable "Automatic HTTPS" in Site settings → "HTTPS"
- Use Netlify's CDN for faster global delivery

## Continuous Deployment

Netlify automatically deploys when you push to your repository:
- **Main branch**: Deploys to production
- **Other branches**: Creates deploy previews

To disable auto-deploy:
- Go to "Site configuration" → "Build & deploy" → "Continuous Deployment"
- Configure branch settings as needed

## Environment-Specific Variables

You can set different environment variables for different contexts:
- **Production**: Default branch deployments
- **Branch deploys**: Preview deployments
- **Deploy previews**: Pull request previews

To set context-specific variables:
- Go to Environment variables
- Click "Add a variable"
- Select the appropriate scope (Production, Branch, or Deploy Preview)

## Support

For more information:
- [Netlify Documentation](https://docs.netlify.com/)
- [Expo Web Deployment](https://docs.expo.dev/workflow/web/)
- [Supabase Documentation](https://supabase.com/docs)
