# Quick Fix: "Failed to start the chronicle"

If you're seeing the error "Failed to start the chronicle. Please try again.", it means the environment variables are not configured in Vercel.

## Solution: Add Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard

1. Visit https://vercel.com/dashboard
2. Select your project (egamebook)
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Required Variables

Add these two environment variables:

#### 1. ANTHROPIC_API_KEY (Required)
- **Name**: `ANTHROPIC_API_KEY`
- **Value**: Your Anthropic API key (starts with `sk-ant-`)
- **Environment**: Select all (Production, Preview, Development)
- Get your key from: https://console.anthropic.com/

#### 2. OPENAI_API_KEY (Optional - for images)
- **Name**: `OPENAI_API_KEY`
- **Value**: Your OpenAI API key (starts with `sk-proj-` or `sk-`)
- **Environment**: Select all (Production, Preview, Development)
- Get your key from: https://platform.openai.com/api-keys
- Note: Only needed for DALL-E image generation

### Step 3: Redeploy

After adding the environment variables:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋯** menu → **Redeploy**

Or simply push a new commit to trigger a deployment.

### Step 4: Verify

After redeployment:

1. Visit your site (egamebook.vercel.app)
2. Click "New Story" button
3. The story should now start successfully

## Health Check

To verify your configuration, visit:
```
https://egamebook.vercel.app/api/health
```

This will show:
- ✓ API keys configured correctly
- ✗ Missing API keys
- Format validation

## Common Issues

### "Invalid API key"
- Make sure you copied the full key without spaces
- Anthropic keys start with `sk-ant-`
- OpenAI keys start with `sk-proj-` or `sk-`

### Still not working after adding keys?
1. Make sure you selected all environments when adding the variables
2. Verify you clicked "Save"
3. Redeploy the project
4. Clear your browser cache and hard reload (Ctrl+Shift+R)

### Check the logs
1. Vercel Dashboard → Deployments → Click deployment
2. View Function Logs to see detailed error messages

## Need Help?

Check the full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
