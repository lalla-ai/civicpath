# CivicPath — Project Notes

## What is this project?
CivicPath is an AI-powered grant discovery and application platform built for a hackathon.
It uses 6 specialized AI agents to find, match, draft, verify, submit, and monitor grant opportunities for nonprofits and tech organizations.

---

## Project Location
- **Local path**: `/Users/asmaaalaoui/Desktop/hackathon/grant-scout-ui`
- **Tech stack**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, React Markdown

---

## GitHub
- **Repo URL**: https://github.com/lalla-ai/civicpath
- **Branch**: `main`
- **GitHub account**: `lalla-ai`
- **CLI**: `gh` is installed via Homebrew and authenticated

### Push changes to GitHub:
```bash
cd /Users/asmaaalaoui/Desktop/hackathon/grant-scout-ui
git add -A
git commit -m "your message"
git push origin main
```

---

## Vercel Deployment
- **Live URL**: https://grant-scout-ui.vercel.app
- **Vercel project**: `grant-scout-ui` under account `lallas-projects-40f66d16`
- **Dashboard**: https://vercel.com/lallas-projects-40f66d16/grant-scout-ui/settings
- **Vercel CLI**: installed globally via npm (`vercel`)

### Redeploy to production:
```bash
cd /Users/asmaaalaoui/Desktop/hackathon/grant-scout-ui
vercel --prod
```

### Add/update environment variable on Vercel:
```bash
vercel env add VITE_GEMINI_API_KEY
```
Select **Production** when prompted, then paste the key, then redeploy.

---

## Gemini API Key
- **Variable name**: `VITE_GEMINI_API_KEY`
- **Stored in**: `.env` file at the project root (NOT committed to GitHub — protected by .gitignore)
- **Also needed in**: Vercel environment variables for the live deployment to work

### Test if the key is valid:
```bash
source .env && curl -s -o /dev/null -w "%{http_code}" "https://generativelanguage.googleapis.com/v1beta/models?key=$VITE_GEMINI_API_KEY"
# Should return 200
```

### Update the key locally:
Open the file in TextEdit:
```bash
open -e /Users/asmaaalaoui/Desktop/hackathon/grant-scout-ui/.env
```

---

## The 6 AI Agents
| Agent | Role |
|---|---|
| 🔍 The Hunter | Searches for active grant opportunities |
| 🎯 The Matchmaker | Scores grants against your profile |
| ✍️ The Drafter | Writes the proposal using Gemini AI |
| 🛡️ The Controller | Compliance and verification check |
| ✉️ The Submitter | Sends proposal via Gmail API |
| 👁️ The Watcher | 24/7 background monitor for new grants |

---

## App Flow
1. **Onboarding page** — User enters: Company Name, Location, Focus Area, Background Info
2. **Dashboard** — Runs the 6-agent pipeline; shows live logs and agent outputs
3. **Grant Scheduler tab** — AI-planned work blocks synced to Google Calendar
4. **Meeting Summaries tab** — Paste transcripts or connect Google Meet
5. **Integrations tab** — Connect Gmail, Google Meet, Zoom

---

## Authentication (Planned — not yet implemented)
A login/signup system was planned using:
- `src/AuthContext.tsx` — localStorage-based auth context
- `src/LoginPage.tsx` — Login/signup UI matching CivicPath design
- `react-router-dom` (already installed) for routing
- Flow: `/login` → onboarding → dashboard

---

## Important Files
```
grant-scout-ui/
├── src/
│   ├── App.tsx          ← Main app (all UI + agent logic)
│   ├── main.tsx         ← React entry point
│   └── index.css        ← Global styles
├── .env                 ← API key (DO NOT COMMIT)
├── .gitignore           ← Includes .env
├── package.json
├── vite.config.ts
└── PROJECT_NOTES.md     ← This file
```

---

## Run locally
```bash
cd /Users/asmaaalaoui/Desktop/hackathon/grant-scout-ui
npm install
npm run dev
# Opens at http://localhost:5173
```

## Build for production
```bash
npm run build
```

---

## Next Steps / TODO
- [ ] Implement user authentication (login/signup with localStorage or Firebase)
- [ ] Add Gemini API key to Vercel environment variables and redeploy
- [ ] Connect GitHub repo to Vercel for auto-deploy on push (needs GitHub login connection in Vercel dashboard)
- [ ] Wire real Gemini API calls in The Drafter agent (currently mock output)
- [ ] Connect real Gmail OAuth for The Submitter agent
