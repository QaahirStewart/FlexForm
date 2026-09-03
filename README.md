# FlexForm

A premium, mobile-first visual exercise guide built with Next.js 16, React 19, and Supabase.

The app includes 26 image-led movement guides, muscle and category filtering, saved exercises, compact three-step form cues, workout logging, and a floating mobile navigation system.

## Run locally

```bash
npm install
npm run dev
```

The product runs in demo mode and saves favorites and completed guides to local storage when Supabase is not configured.

## Connect Supabase

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations` in numerical order.
3. Copy `.env.example` to `.env.local`.
4. Add your project URL and publishable key.

Authenticated workout, favorite, and guide-completion data is protected by Row Level Security and automatically syncs when a user session exists.
