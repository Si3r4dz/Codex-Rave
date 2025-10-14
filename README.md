# Freelance Dashboard

A personal web dashboard for tracking freelance work hours and income through Everhour integration. Built with Next.js, TypeScript, and SQLite.

## Features

- **Real-time Everhour Integration**: Automatically fetches time entries from Everhour API
- **Income Tracking**: Calculate earnings based on configurable hourly rates per project
- **Visual Analytics**: 
  - Daily hours bar chart
  - Project distribution pie chart
  - Income breakdown by project
- **Project Management**: Set and manage hourly rates for each project
- **Monthly Goals**: Track progress toward your monthly hours goal
- **Auto-refresh**: Dashboard data refreshes every 5 minutes

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Everhour account with API access

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd Codex-Rave
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment configuration:
   ```bash
   cp env.example .env.local
   ```

4. Configure your environment variables in `.env.local`:
   ```env
   EVERHOUR_API_TOKEN=your_everhour_api_token_here
   DATABASE_PATH=./data/dashboard.db
   MONTHLY_HOURS_GOAL=160
   DEFAULT_HOURLY_RATE=50
   ```

   **Configuration options:**
   - `EVERHOUR_API_TOKEN`: Your Everhour API token (required)
     - Get it from https://everhour.com/developers
   - `DATABASE_PATH`: Where to store the SQLite database (default is fine)
   - `MONTHLY_HOURS_GOAL`: Your target hours per month (default: 160)
   - `DEFAULT_HOURLY_RATE`: Default rate for all projects without specific rates (in USD)

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### First Time Setup

1. **Set your default hourly rate** via the Settings button (⚙️ icon)
   - Click the Settings button in the top right
   - Enter your default hourly rate (in PLN)
   - This rate applies to ALL projects automatically
   - You can also change the currency if needed (PLN, USD, EUR, GBP)

2. (Optional) **Override rates for specific projects**:
   - Click **"Manage Project Rates"**
   - Select projects from the dropdown (auto-populated from Everhour)
   - Set custom hourly rates for specific projects
   - Save the rates

**How it works:**
- Projects WITH custom rates → use the custom rate
- Projects WITHOUT custom rates → use the default rate from Settings
- Currency formatting adapts based on your selected currency
- This means you can start tracking income immediately without setting up each project individually

### Dashboard Views

- **Summary Cards**: Quick overview of total hours, income, active projects, and goal progress
- **Daily Hours Chart**: Visual representation of hours logged each day
- **Project Distribution**: Pie chart showing time allocation across projects
- **Income by Project**: Bar chart displaying earnings per project
- **Project Breakdown Table**: Detailed table with hours, rates, income, and percentages

### Managing Project Rates

- Click "Manage Project Rates" to open the modal
- Select a project from Everhour
- Enter or update the hourly rate
- Save to calculate income automatically
- Delete rates that are no longer needed

## Database

The app uses SQLite for local data persistence. The database file is created automatically at the path specified in `DATABASE_PATH` (default: `./data/dashboard.db`).

### Schema

```sql
CREATE TABLE project_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  everhour_project_id TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  hourly_rate REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

- `GET /api/stats` - Fetch dashboard statistics
- `GET /api/project-rates` - List all project rates
- `POST /api/project-rates` - Create or update project rate
- `DELETE /api/project-rates?id={id}` - Delete project rate
- `GET /api/everhour-projects` - Fetch projects from Everhour

## Building for Production

```bash
npm run build
npm start
```

## Future Enhancements

Potential features to add:
- Invoice generation
- CRM-style client tracking
- Multiple time tracking service integrations
- Export reports (PDF, CSV)
- Historical data comparison
- Dark mode
- Notification system for goals
- Multi-currency support

## Project Structure

```
Codex-Rave/
├── app/
│   ├── api/
│   │   ├── everhour-projects/
│   │   ├── project-rates/
│   │   └── stats/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Charts.tsx
│   ├── ProjectRateForm.tsx
│   ├── ProjectTable.tsx
│   └── StatCard.tsx
├── lib/
│   ├── db.ts
│   ├── everhour.ts
│   └── stats.ts
├── types/
│   └── index.ts
└── data/
    └── dashboard.db (auto-generated)
```

## License

Personal use project.

## Support

For Everhour API documentation, visit: https://everhour.com/developers
