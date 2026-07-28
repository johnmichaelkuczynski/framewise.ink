---
name: FrameWise Google OAuth
description: How Google OAuth is configured and what the user still needs to do in Google Cloud Console
---

# FrameWise Google OAuth

## Rule
The OAuth callback URL is constructed dynamically in `artifacts/api-server/src/app.ts`:
```
const callbackURL = process.env.GOOGLE_REDIRECT_URI || 
  (process.env.REPLIT_DEV_DOMAIN ? `https://${REPLIT_DEV_DOMAIN}/api/auth/google/callback` : "http://localhost:3000/...")
```

**Why:** REPLIT_DEV_DOMAIN is runtime-managed and not readable via viewEnvVars; constructing at runtime avoids hardcoding.

## How to apply
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are stored as Replit Secrets.
- The user must add `https://THEIR-DEV-DOMAIN/api/auth/google/callback` to Authorized Redirect URIs in Google Cloud Console.
- For production deployments, they must also add the production URL.
- SESSION_SECRET is already set as a Replit Secret.
