# Smart Basket AI

AI-powered meal planning app. Built with React + Vite + Supabase + Vercel.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
Copy `.env.example` to `.env.local` and fill in:
- `VITE_SUPABASE_URL` — from Supabase → Settings → API
- `VITE_SUPABASE_ANON_KEY` — from Supabase → Settings → API

### 3. Vercel environment variables (server-side only)
In Vercel dashboard → Settings → Environment Variables, add:
- `ANTHROPIC_KEY` — your Anthropic API key (never put this in .env.local)

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy
Push to GitHub — Vercel auto-deploys.

## Architecture

```
src/
  App.jsx           — auth routing
  main.jsx          — entry point
  styles.css        — all styles
  supabase.js       — database functions
  ai.js             — AI calls (via backend)
  components/
    AuthScreen.jsx  — login/signup
    MainApp.jsx     — tabs + header
    SetupTab.jsx    — preferences + generate
    PantryTab.jsx   — pantry management
    MealsTab.jsx    — meal plan display
    ShoppingTab.jsx — shopping list
    RecipesTab.jsx  — recipe viewer + search + community
  hooks/
    useAppState.js  — central state + sync

api/
  generate.js       — Anthropic proxy (hides API key)
  recipe.js         — recipe fetcher (hides API key)
```

## Security
- Anthropic API key lives only in Vercel environment variables
- Never exposed to the browser
- Supabase Row Level Security enabled on all tables
- Users can only access their own data
