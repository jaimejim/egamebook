# Deployment Guide for The AI Chronicle

## Deploying to Vercel

### Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. An Anthropic API key (get one at https://console.anthropic.com/)

### Step 1: Prepare the Project

The project is already configured for Vercel with:
- ✅ `vercel.json` configuration
- ✅ Serverless API functions in `/api`
- ✅ Static files in `/public`

### Step 2: Deploy via Vercel CLI

```bash
# Navigate to the project directory
cd ai_chronicle

# Login to Vercel (if not already logged in)
vercel login

# Deploy to production
vercel --prod
```

### Step 3: Configure Environment Variables

After deployment, you need to add your Anthropic API key:

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add a new variable:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: Your Anthropic API key
   - **Environments**: Production, Preview, Development
5. Click "Save"
6. Redeploy the project for changes to take effect

**Option B: Via Vercel CLI**
```bash
vercel env add ANTHROPIC_API_KEY production
# Paste your API key when prompted

# Pull environment variables for local development
vercel env pull
```

### Step 4: Verify Deployment

1. Visit your deployment URL (provided by Vercel)
2. The game should load with the sepia book interface
3. Click "New Chronicle" to start a story
4. Verify that the AI generates story text

### Troubleshooting

**Problem**: "Failed to start the chronicle"
- **Solution**: Check that `ANTHROPIC_API_KEY` is set correctly in Vercel environment variables
- **Check**: Go to Vercel dashboard → Project → Settings → Environment Variables

**Problem**: 500 Internal Server Error
- **Solution**: Check Vercel function logs
- **How**: Vercel dashboard → Project → Deployments → Click deployment → View Function Logs

**Problem**: Dice rolls not working
- **Solution**: Check browser console for errors
- **Note**: The game requires JavaScript to be enabled

**Problem**: Styling looks broken
- **Solution**: Clear browser cache and hard reload (Ctrl+Shift+R or Cmd+Shift+R)

### Existing Vercel Project

If you're deploying to an existing Vercel project (like `egamebook`):

```bash
# Link to existing project
vercel link

# Select your existing project when prompted
# Follow the prompts to link this directory

# Deploy
vercel --prod
```

### Custom Domain (Optional)

1. Go to Vercel dashboard → Project → Settings → Domains
2. Add your custom domain
3. Follow Vercel's instructions to configure DNS

### Updating the Deployment

To deploy updates:

```bash
# Make your changes
git add .
git commit -m "Update game"

# Deploy to production
vercel --prod
```

Or simply push to your connected Git repository (GitHub, GitLab, Bitbucket) and Vercel will auto-deploy.

## Local Development

To test locally before deploying:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Create .env file with your API key
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Run local development server
vercel dev

# Open http://localhost:3000
```

## Performance Optimization

The game is already optimized for Vercel:
- Static files are cached
- API functions are serverless (no cold starts)
- CSS animations use GPU acceleration
- Minimal dependencies for fast loading

## Cost Estimation

**Vercel**: Free tier includes:
- Unlimited projects
- 100GB bandwidth/month
- Serverless function executions

**Anthropic API**: Pay per token
- Claude 3.5 Sonnet: ~$3 per million input tokens
- Average game session: ~5,000 tokens
- Cost per session: ~$0.015 (1.5 cents)

## Security Notes

- Never commit `.env` files to Git
- Keep your Anthropic API key secret
- Use Vercel's environment variables for all secrets
- The `.gitignore` file is already configured to exclude `.env`

## Monitoring

Monitor your deployment:
1. **Vercel Analytics**: View traffic and performance
2. **Function Logs**: Check API function execution
3. **Error Tracking**: Set up Vercel error alerts

## Support

For issues:
- Vercel: https://vercel.com/support
- Anthropic: https://support.anthropic.com/
- Project issues: Check the main repository
