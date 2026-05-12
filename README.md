# 🎭 Playwright Dashboard

A production-ready test execution dashboard for Playwright — tracks pass/fail stats, screenshots, videos, logs, error traces, and run history. Deployable to **Vercel** or **Netlify**.

---

## 📁 Project Structure

```
pw-dashboard/
├── tests/                          # Your Playwright test files
│   └── example.spec.ts
├── reporter/
│   └── dashboard-reporter.ts       # Custom reporter (writes dashboard-data.json)
├── dashboard/
│   └── public/                     # Static dashboard (deploy this folder)
│       ├── index.html
│       ├── css/style.css
│       ├── js/app.js
│       ├── dashboard-data.json     # Auto-generated after test run
│       └── history.json            # Cumulative run history (last 20 runs)
├── scripts/
│   └── generate-report.js          # Helper to generate/seed report data
├── .github/workflows/
│   └── playwright.yml              # GitHub Actions CI/CD pipeline
├── playwright.config.ts
├── vercel.json                     # Vercel deploy config
├── netlify.toml                    # Netlify deploy config
└── package.json
```

---

## ⚡ Setup Instructions

### 1. Prerequisites
- **Node.js** v18+ → https://nodejs.org
- **npm** v9+

### 2. Install Dependencies
```bash
cd pw-dashboard
npm install
```

### 3. Install Playwright Browsers
```bash
npx playwright install
```

---

## 🚀 Running Tests & Generating the Dashboard

### Run tests and generate dashboard data
```bash
npm run test:report
```
This runs all Playwright tests and writes `dashboard/public/dashboard-data.json`.

### Run tests only (no report generation)
```bash
npm test
```

### Generate/seed a demo report without running tests
```bash
npm run dashboard
```

### Preview dashboard locally
```bash
npm run serve
```
Then open → http://localhost:3000

---

## 🌐 Deploying the Dashboard

### Option A — Vercel (Recommended)

1. Install Vercel CLI (already in devDependencies):
```bash
npx vercel login
```

2. Deploy:
```bash
npm run deploy:vercel
```

3. For CI/CD via GitHub Actions, add these secrets to your repo:
   - `VERCEL_TOKEN` → from https://vercel.com/account/tokens
   - `VERCEL_ORG_ID` → from `.vercel/project.json` after first deploy
   - `VERCEL_PROJECT_ID` → from `.vercel/project.json` after first deploy

---

### Option B — Netlify

1. Install Netlify CLI (already in devDependencies):
```bash
npx netlify login
```

2. Link your site (first time only):
```bash
npx netlify init
```

3. Deploy:
```bash
npm run deploy:netlify
```

---

## 🤖 CI/CD — GitHub Actions

The workflow at `.github/workflows/playwright.yml` automatically:
1. Runs all Playwright tests on push/PR to `main`
2. Generates the dashboard report
3. Uploads the dashboard as a downloadable GitHub artifact (retained 30 days)
4. Deploys to Vercel on merge to `main`

To enable, push this project to GitHub and set the required secrets in **Settings → Secrets → Actions**.

---

## 📊 Dashboard Features

| Feature | Details |
|---|---|
| **Summary Cards** | Total, Passed, Failed, Skipped, Pass Rate %, Duration |
| **Donut Chart** | Visual result breakdown |
| **Run History Chart** | Last 20 runs as stacked bar chart |
| **Test Table** | Status, name, file, browser, duration, retries |
| **Artifact Links** | Screenshots, videos, traces (linked per test) |
| **Log Viewer** | Modal with stdout, stderr, and error traces |
| **Filtering** | Filter by status or search by test name |
| **Theme** | Auto dark/light (follows system preference) |

---

## 🔧 Customization

### Add your own tests
Place `.spec.ts` files in the `tests/` folder. They're auto-discovered by `playwright.config.ts`.

### Change browsers
Edit the `projects` array in `playwright.config.ts` to add/remove Chromium, Firefox, WebKit.

### Adjust history retention
In `reporter/dashboard-reporter.ts`, change `.slice(0, 20)` to keep more/fewer runs.

---

## 📦 Tech Stack

- **Playwright Test** — test runner & built-in reporters
- **TypeScript** — custom reporter
- **Vanilla HTML/CSS/JS** — zero-dependency dashboard UI
- **Canvas API** — charts (no Chart.js dependency)
- **Vercel / Netlify** — static site hosting

---

## 🆘 Troubleshooting

| Problem | Fix |
|---|---|
| `dashboard-data.json not found` | Run `npm run test:report` first |
| Charts not rendering | Open via `npm run serve`, not `file://` (CORS) |
| Vercel deploy fails | Check `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets |
| Netlify deploy fails | Run `npx netlify init` to link your site first |
