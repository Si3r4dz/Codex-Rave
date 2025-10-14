# Quick Setup Guide

Follow these steps to get your freelance dashboard running:

## 1. Install Dependencies

```bash
npm install
```

## 2. Get Your Everhour API Token

1. Visit https://everhour.com/developers
2. Log in to your Everhour account
3. Click "Generate API Token"
4. Copy the token

## 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```

2. Open `.env.local` and add your configuration:
   ```env
   EVERHOUR_API_TOKEN=paste_your_token_here
   DATABASE_PATH=./data/dashboard.db
   MONTHLY_HOURS_GOAL=160
   ```

   **Customize these values:**
   - `EVERHOUR_API_TOKEN`: Your Everhour API token (required)
   - `DATABASE_PATH`: Where to store the SQLite database (default is fine)
   - `MONTHLY_HOURS_GOAL`: Your target hours per month (adjust as needed)

## 4. Start the Development Server

```bash
npm run dev
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000)

## 5. Configure Project Rates

1. Open the dashboard in your browser
2. Click **"Manage Project Rates"** button in the top right
3. Select a project from the dropdown (auto-populated from your Everhour account)
4. Enter the hourly rate for that project
5. Click "Save Rate"
6. Repeat for all projects

## 6. View Your Dashboard

Once rates are configured, the dashboard will display:
- Total hours worked this month
- Estimated income
- Project breakdown
- Visual charts

The dashboard auto-refreshes every 5 minutes, or you can click "Refresh" manually.

## Troubleshooting

### "Failed to fetch statistics" Error

**Possible causes:**
1. Invalid or missing Everhour API token
   - Verify your token in `.env.local`
   - Generate a new token if needed

2. Network connectivity issues
   - Check your internet connection
   - Verify Everhour API is accessible

### No Projects in Dropdown

**Possible causes:**
1. No projects in your Everhour account
   - Add projects in Everhour first
   - Refresh the dashboard

2. API token doesn't have proper permissions
   - Regenerate your API token
   - Ensure it has read access to projects

### Database Errors

**Possible causes:**
1. Permission issues with data directory
   - Ensure the app can create the `/data` folder
   - Check file permissions

2. Corrupted database
   - Delete `data/dashboard.db`
   - Restart the app (database will be recreated)

## Building for Production

When ready to deploy or run in production:

```bash
npm run build
npm start
```

The production build will run on port 3000 by default.

## Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review Everhour API docs: https://everhour.com/developers
- Verify your environment variables are correctly set

