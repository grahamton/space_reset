# Space Reset Coach - Firebase Hosting Deployment

## 🔥 Deploy to Firebase Hosting in 5 Minutes

You have Firebase! Perfect. Follow these steps to get Space Reset Coach live.

---

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

---

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser to authenticate with your Google account.

---

## Step 3: Initialize Firebase in Your Project

```bash
cd H:/TishTish-main
firebase init
```

When prompted:

1. **"Which Firebase features do you want to set up?"**
   → Select `Hosting: Configure files for Firebase Hosting`
   → Press Space to select, then Enter

2. **"Use an existing project or create a new one?"**
   → Choose existing project (your Firebase project)
   → Select your project from the list

3. **"What do you want to use as your public directory?"**
   → Enter: `dist`
   → Press Enter

4. **"Configure as a single-page app?"**
   → Answer: `y` (yes)
   → This rewrites all routes to index.html (important for React Router)

5. **"Set up automatic builds?"**
   → Answer: `n` (no - we'll do it manually)

This creates two files:
- `.firebaserc` - Your Firebase project config
- `firebase.json` - Deployment rules

---

## Step 4: Build Your App

```bash
npm run build
```

This creates a `dist/` folder with the production build.

---

## Step 5: Deploy to Firebase

```bash
firebase deploy
```

**That's it!** Firebase automatically:
- Builds your assets
- Uploads to CDN
- Gives you a live URL

You'll see output like:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/YOUR-PROJECT
Hosting URL: https://YOUR-PROJECT.web.app
```

---

## Your Live App

**Visit:** `https://YOUR-PROJECT.web.app`

(Replace YOUR-PROJECT with your actual Firebase project ID)

---

## Step 6: Verify It Works

1. Open the URL in your browser
2. Test file upload
3. Test mission flow
4. Reload page (session should persist)
5. Test offline mode:
   - DevTools → Network → Offline
   - Refresh page
   - App should work offline!

---

## Optional: Setup Custom Domain

If you want a custom domain (yoursite.com):

1. Go to **Firebase Console** → **Hosting**
2. Click **Add custom domain**
3. Enter your domain
4. Follow DNS setup instructions

---

## Automatic Redeployment Setup

To auto-deploy on every git push, add GitHub Actions:

**Create `.github/workflows/firebase-hosting-pull-request.yml`:**

```yaml
name: Deploy to Firebase on Push

on:
  push:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: YOUR-PROJECT-ID
          channelId: live
```

Then add your Firebase service account as a GitHub secret.

---

## Useful Firebase Commands

### View deployment history:
```bash
firebase hosting:channel:list
```

### Deploy specific version:
```bash
firebase deploy --only hosting
```

### View logs:
```bash
firebase hosting:log
```

### Delete old versions:
```bash
firebase hosting:delete
```

### Local preview before deploying:
```bash
npm run build
firebase serve
# Visit http://localhost:5000
```

---

## Firebase Hosting Features

✅ **Free tier includes:**
- 1GB/month storage
- 10GB/month bandwidth
- SSL certificate (automatic)
- Global CDN (fast worldwide)
- Custom domain support
- Rollback functionality

✅ **Features you get:**
- Auto-HTTPS
- Automatic gzip compression
- 301/302 redirects
- Cache headers optimization
- Single Page App routing

---

## Troubleshooting

### "Command not found: firebase"
```bash
npm install -g firebase-tools
```

### "No project selected"
```bash
firebase use --add
# Then select your project
```

### "Permission denied"
```bash
firebase logout
firebase login
```

### App shows 404 errors
Make sure in `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## Post-Deploy Checklist

✅ App loads at firebase URL
✅ File upload works
✅ Missions display correctly
✅ Timer starts/pauses
✅ Session persists on reload
✅ Before/after photos work
✅ Stats dashboard loads
✅ Offline mode works
✅ Responsive on mobile
✅ No console errors

---

## Share Your Live App!

**Your URL:** `https://YOUR-PROJECT.web.app`

Share with ADHD community:
- Reddit: r/ADHD
- Discord: ADHD communities
- Twitter: #ADHDTwitter
- Friends who need it!

---

## Next Steps

1. **Monitor performance:**
   - Firebase Console → Hosting → View metrics
   - Monitor bandwidth usage
   - Check error rates

2. **Setup analytics:**
   - Firebase Console → Realtime Database (optional)
   - Track user behavior

3. **Get feedback:**
   - Add in-app feedback button
   - Survey users
   - Iterate based on feedback

4. **Plan Phase 4:**
   - Social features
   - Community leaderboards
   - More integrations

---

## Firebase Console

Access your app management at:
https://console.firebase.google.com/project/YOUR-PROJECT/hosting

From there you can:
- View deployment history
- Manage domains
- Check analytics
- View logs
- Manage storage

---

## Questions?

Check Firebase docs: https://firebase.google.com/docs/hosting

---

**🎉 Your Space Reset Coach is now LIVE on Firebase!**

Built with ❤️ for ADHD warriors everywhere.

