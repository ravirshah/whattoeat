# Production Debug Guide

## Issue: Works in Development, Fails in Production (Vercel)

The app returns sample recipes in production but works fine locally with `npm run dev`.

## Debugging Steps Added

### 1. Enhanced Server-Side Logging

The `/api/generate-recipes` endpoint now logs:
- Environment variables status (GEMINI_API_KEY exists)
- Vercel environment info (VERCEL, VERCEL_ENV, VERCEL_REGION)
- Function start time and timeout adjustments
- Detailed error information from Gemini API
- Response parsing details

### 2. Enhanced Client-Side Logging

The generate page now logs:
- Main API response details (recipes count, apiInfo)
- Detailed error information when API fails
- Fallback API response details

### 3. Vercel-Specific Handling

- Timeout adjusted for Vercel limitations (45s in production)
- Vercel environment detection and logging
- Function timeout information

## How to Debug in Production

1. **Deploy these changes to Vercel**
2. **Open browser dev tools** (Console tab)
3. **Generate recipes** and watch for log messages
4. **Check Vercel Function logs** in your Vercel dashboard

## What to Look For

### Most Likely Issues:

1. **Environment Variable Missing**
   - Look for: `"No Gemini API key found in environment variables"`
   - Solution: Add `GEMINI_API_KEY` to Vercel environment variables

2. **Vercel Timeout Limits** 
   - Look for: `"Gemini API timeout after Xs"`
   - Solution: Upgrade Vercel plan or optimize API calls

3. **Network/Infrastructure Issues**
   - Look for: Specific Gemini API error messages
   - Solution: May need retry logic or different API configuration

### Log Messages to Check:

**In Browser Console:**
```
Main API response received: { hasRecipes: true/false, apiInfo: {...} }
```

**In Vercel Function Logs:**
```
Environment variables check:
- GEMINI_API_KEY exists: true/false
- VERCEL_ENV: production
Gemini API error (detailed): { ... }
```

## Temporary Fix

If the issue persists, you can temporarily modify the client-side logic to:
1. Always try the main API first
2. Only fall back to simple API on genuine failures
3. Show appropriate user messages based on the actual error type

## Next Steps After Debugging

Once you identify the root cause from the logs:
1. Remove the extensive logging to clean up the code
2. Implement the specific fix for the identified issue
3. Test thoroughly in both development and production 