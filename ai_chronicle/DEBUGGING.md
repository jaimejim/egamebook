# AI Chronicle - Debugging Guide

## Current Issue: "Failed to connect to game server"

The error you're seeing ("The string did not match the expected pattern") suggests a JSON parsing issue with the health check or API response.

## Latest Changes (Just Deployed)

I've added comprehensive debugging and error handling:

1. **Detailed Console Logging** - Every API call now logs:
   - Request details
   - Response status and headers
   - Response body (first 500 chars)
   - Parsed JSON data
   - Any errors with full stack traces

2. **Better Error Messages** - Errors now show:
   - Exact problem description
   - Troubleshooting steps
   - API key status (format, length)

3. **Health Check Improvements** - Now verifies:
   - API key presence
   - API key format (should start with `sk-ant-`)
   - Key length
   - Returns detailed JSON response

4. **API Robustness** - Updated:
   - Latest Anthropic SDK patterns
   - Proper error handling
   - CORS headers fixed
   - Content-Type explicitly set

## How to Diagnose the Issue

### Step 1: Wait for Deployment
After pushing, wait 1-2 minutes for Vercel to deploy. Check:
- Vercel dashboard shows deployment as "Ready"
- Build logs show no errors

### Step 2: Hard Refresh the Browser
1. Open your game URL
2. Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
3. This clears cached JavaScript

### Step 3: Open Browser Console
1. Press **F12** to open developer tools
2. Go to the **Console** tab
3. Refresh the page
4. Look for logs tagged with:
   - `[Health Check]` - Health check process
   - `[Game]` - Game initialization
   - Any red error messages

### Step 4: Check What the Logs Show

#### If you see logs like:
```
[Health Check] Starting health check...
[Health Check] Response status: 200
[Health Check] Parsed response: {status: 'ok', ...}
```
✅ Health check is working! The issue is elsewhere.

#### If you see:
```
[Health Check] Response status: 500
[Health Check] Parsed response: {status: 'error', message: 'ANTHROPIC_API_KEY...'}
```
❌ API key is not configured or invalid. See "Fix API Keys" below.

#### If you see:
```
[Health Check] Failed to parse response: SyntaxError
```
❌ The server is returning non-JSON. This could be:
- Vercel error page (deployment issue)
- CORS error
- Network issue

### Step 5: Test the Health Endpoint Directly

Open in a new browser tab:
```
https://your-app-url.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T...",
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "anthropicKey": {
      "configured": true,
      "format": "valid",
      "length": 108
    },
    "openaiKey": {
      "configured": true,
      "format": "valid",
      "length": 51
    }
  }
}
```

If you see HTML or an error page instead, the deployment has an issue.

## Common Issues and Fixes

### Issue 1: API Keys Not Configured

**Symptoms:**
- Health check returns `status: 'error'`
- Message says "ANTHROPIC_API_KEY is not configured"

**Fix:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add `ANTHROPIC_API_KEY` with value starting with `sk-ant-`
5. Add `OPENAI_API_KEY` with value starting with `sk-` (optional)
6. Click **Redeploy** (important!)

### Issue 2: Invalid API Key Format

**Symptoms:**
- Health check shows `format: 'invalid'`
- Anthropic API key doesn't start with `sk-ant-`

**Fix:**
1. Verify your Anthropic API key from https://console.anthropic.com/
2. It should look like: `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. Update in Vercel environment variables
4. Redeploy

### Issue 3: Deployment Still in Progress

**Symptoms:**
- `/api/health` shows Vercel error page
- Console shows "Failed to parse response"

**Fix:**
1. Check Vercel dashboard deployment status
2. Wait for "Ready" status
3. Hard refresh browser

### Issue 4: Cached Old Code

**Symptoms:**
- You don't see new console logs with `[Health Check]` tags
- Error messages look old

**Fix:**
1. Hard refresh: **Ctrl+Shift+R** or **Cmd+Shift+R**
2. Or clear browser cache completely
3. Try incognito/private browsing mode

### Issue 5: CORS or Network Issues

**Symptoms:**
- Console shows CORS errors
- Network tab shows failed requests

**Fix:**
1. Try a different browser
2. Check network connectivity
3. Disable browser extensions temporarily
4. Try on mobile data instead of WiFi

## Testing API Keys Locally

If you have Node.js installed, you can test the API keys locally:

```bash
cd ai_chronicle

# Install dependencies
npm install

# Set environment variables (replace with your actual keys)
export ANTHROPIC_API_KEY="sk-ant-api03-xxx"
export OPENAI_API_KEY="sk-xxx"

# Run the test script
node test-api.js
```

Expected output:
```
✅ Anthropic API is working correctly
✅ OpenAI API is working correctly
✅ Story generation successful
✅ All critical tests passed!
```

If tests fail, the API keys are not working.

## Mobile-Specific Issues

Since this is primarily a mobile game:

### Mobile Browser Console Access

**iOS Safari:**
1. Connect iPhone to Mac
2. Open Safari on Mac → Develop → [Your iPhone] → [Page]
3. Console will show in Mac Safari

**Android Chrome:**
1. Enable USB debugging on Android
2. Connect to computer
3. Open `chrome://inspect` in desktop Chrome
4. Click "inspect" on your device

### Mobile Rendering Issues

If the error message is cut off or hard to read:
- Rotate to landscape mode
- Zoom out to see full message
- Check console logs as described above

## What to Send Me for Help

If the issue persists, please provide:

1. **Screenshot of browser console** (F12 → Console tab)
2. **Screenshot of `/api/health` response** (open URL directly)
3. **Vercel deployment logs** (from Vercel dashboard)
4. **Environment variable names** (not the actual keys!) from Vercel

This will help me pinpoint the exact issue.

## Next Steps

After the deployment completes (usually 1-2 minutes):

1. Hard refresh the browser
2. Open console (F12)
3. Check what the new detailed logs show
4. Send me screenshots if the issue persists

The detailed logging should tell us exactly where it's failing!
