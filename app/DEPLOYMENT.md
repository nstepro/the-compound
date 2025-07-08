# Heroku Deployment Guide

## Prerequisites
- Heroku CLI installed and logged in
- Git repository initialized

## Deployment Steps

**Note:** Since your app is in the `app/` subdirectory, you have two deployment options:
- **Option A:** Use git subtree (recommended - simpler)
- **Option B:** Use monorepo buildpack (see Alternative section below)

### 1. Create a Heroku App
```bash
heroku create your-app-name
```

### 2. Configure Build Settings
Heroku will automatically detect this as a Node.js app and:
- Install dependencies with `npm install`
- Build the app with `npm run build`
- Start the server with `npm run start`

### 3. Deploy (App is in subdirectory)
Since the app is in the `app/` subdirectory, use git subtree:

```bash
# First, commit your changes to the main repo
git add .
git commit -m "Prepare for Heroku deployment"

# Push only the app directory to Heroku
git subtree push --prefix app heroku main
```

**For subsequent deployments:**
```bash
git add .
git commit -m "Update app"
git subtree push --prefix app heroku main
```

### 4. Open Your App
```bash
heroku open
```

## Alternative: Monorepo Buildpack

If you prefer not to use git subtree, you can use the monorepo buildpack:

```bash
# Set the buildpack
heroku buildpacks:set https://github.com/lstoll/heroku-buildpack-monorepo

# Set the app path
heroku config:set APP_BASE=app

# Then deploy normally
git push heroku main
```

## Files Added/Modified for Heroku

1. **Procfile** - Tells Heroku how to start your app
2. **server.js** - Express server to serve static files
3. **package.json** - Added Express dependency and start script
4. **Fixed TypeScript errors** - Removed unused variables for clean build

## Environment Variables
If you need to set environment variables (like API keys):
```bash
heroku config:set VARIABLE_NAME=value
```

## Notes
- The app serves static files from the `dist` directory
- Client-side routing is handled by serving `index.html` for all routes
- The places data is currently served from the static file in `public/`
- Since the app is in a subdirectory, use git subtree or monorepo buildpack for deployment
- When you're ready to connect the parser and use S3, you'll need to update the data fetching logic 