# Vercel Deployment Setup Guide

This guide will help you set up automatic deployment of your maintenance app to Vercel using GitHub Actions.

## Prerequisites

1. A Vercel account
2. Your project already created in Vercel
3. GitHub repository with your code

## Step 1: Get Vercel Credentials

### 1.1 Get Vercel Token
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your profile picture → Settings
3. Go to "Tokens" tab
4. Click "Create Token"
5. Give it a name (e.g., "GitHub Actions Deploy")
6. Set expiration (recommended: 1 year)
7. Copy the token (you'll need this for GitHub secrets)

### 1.2 Get Organization ID and Project ID
1. Go to your project in Vercel dashboard
2. Click on "Settings" tab
3. Go to "General" section
4. Copy the following values:
   - **Project ID**: Found in the "Project ID" field
   - **Team ID**: Found in the "Team ID" field (this is your ORG_ID)

## Step 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click on "Settings" tab
3. Go to "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VERCEL_TOKEN` | Your Vercel token | Token for authentication |
| `ORG_ID` | Your Team ID | Your Vercel team/organization ID |
| `PROJECT_ID` | Your Project ID | Your Vercel project ID |

## Step 3: Environment Variables in Vercel

Make sure to add all necessary environment variables in your Vercel project:

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Environment Variables"
3. Add all the environment variables your app needs (database URLs, API keys, etc.)

## Step 4: Deployment Strategy

Your deployment is configured with the following strategy:

### Production Deployment
- **Trigger**: Push to `main` branch
- **Destination**: Vercel Production
- **Workflows**: 
  - `.github/workflows/deploy-vercel.yml` (Vercel Action)
  - `.github/workflows/deploy-vercel-cli.yml` (Vercel CLI)

### Preview Deployment
- **Trigger**: Push to branches starting with `feature/` or Pull Requests to `main`
- **Destination**: Vercel Preview (temporary URLs)
- **Workflows**:
  - `.github/workflows/deploy-vercel-preview.yml` (Vercel Action)
  - `.github/workflows/deploy-vercel-preview-cli.yml` (Vercel CLI)

## Step 5: Choose Your Workflow

You have four workflow options:

### Option A: Vercel Action (Recommended)
- **Production**: `.github/workflows/deploy-vercel.yml`
- **Preview**: `.github/workflows/deploy-vercel-preview.yml`
- Uses the `amondnet/vercel-action`
- Simpler configuration
- Good for most use cases

### Option B: Vercel CLI
- **Production**: `.github/workflows/deploy-vercel-cli.yml`
- **Preview**: `.github/workflows/deploy-vercel-preview-cli.yml`
- Uses official Vercel CLI
- More control over the deployment process
- Better for complex deployments

## Step 6: Workflow Triggers

The workflows are configured as follows:

### Production Workflows
- **Trigger**: Push to `main` branch
- **Result**: Deploys to production domain

### Preview Workflows
- **Trigger**: 
  - Push to branches matching `feature/**` pattern
  - Pull requests to `main` branch
- **Result**: Creates preview deployments with temporary URLs

## Step 7: Test the Deployment

### Test Production Deployment
1. Push your changes to the `main` branch
2. Go to your GitHub repository → "Actions" tab
3. You should see the "Deploy to Vercel Production" workflow running
4. Check the logs for any errors
5. Once successful, your app will be deployed to your production domain

### Test Preview Deployment
1. Create a new branch starting with `feature/` (e.g., `feature/new-feature`)
2. Push your changes to that branch
3. Go to your GitHub repository → "Actions" tab
4. You should see the "Deploy to Vercel Preview" workflow running
5. Check the logs for any errors
6. Once successful, you'll get a preview URL in the workflow logs
7. You can also test with Pull Requests to `main` branch

## Troubleshooting

### Common Issues:

1. **Authentication Error**: Check that your `VERCEL_TOKEN` is correct and not expired
2. **Project Not Found**: Verify `PROJECT_ID` and `ORG_ID` are correct
3. **Build Failures**: Check that all environment variables are set in Vercel
4. **Permission Issues**: Ensure your Vercel token has the necessary permissions

### Debug Steps:

1. Check the GitHub Actions logs for detailed error messages
2. Verify all secrets are correctly set
3. Test the deployment manually using Vercel CLI:
   ```bash
   npm install -g vercel
   vercel login
   vercel deploy
   ```

## Additional Configuration

### Custom Domain
If you have a custom domain:
1. Configure it in Vercel dashboard
2. The GitHub Action will automatically deploy to your custom domain

### Preview Deployments
The workflow supports preview deployments for pull requests. You can modify the workflow to:
- Deploy previews for all pull requests
- Skip deployment for certain branches
- Add custom build commands

### Cron Jobs
Your app includes cron jobs (as seen in `vercel.json`). Make sure these are properly configured in your Vercel project settings.

## Support

If you encounter issues:
1. Check Vercel documentation: https://vercel.com/docs
2. Check GitHub Actions documentation: https://docs.github.com/en/actions
3. Review the workflow logs for specific error messages
