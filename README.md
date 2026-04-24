# Tavla Backgammon

Premium casual browser backgammon built with React, TypeScript, Vite, Zustand, Tailwind CSS, Supabase Realtime, and Vercel.

Live app: https://tavla-backgammon.vercel.app

GitHub repo: https://github.com/yasergirit/tavla-backgammon

## Local Development

```bash
npm install
npm run dev
npm run build
```

## Online Play Rooms

Play Rooms use Supabase tables plus Postgres Realtime:

- `play_rooms`: room list and room status
- `play_room_seats`: white/black seats, player identity, ready state
- `online_games`: shared game state JSON for realtime turns

The app falls back to local-only rooms when Supabase env vars are missing. To enable real online rooms, configure these variables:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase Setup

Option 1, Dashboard:

1. Open Supabase SQL Editor.
2. Run `supabase/schema.sql`.
3. Confirm Realtime is enabled for `play_rooms`, `play_room_seats`, and `online_games`.
4. Copy Project URL and anon public key from Project Settings > API.
5. Add both values to Vercel production env vars.

Option 2, CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Then add env vars to Vercel:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

## Deployment

The project is connected to Vercel project `tavla-backgammon`. Pushes to GitHub can be deployed by Vercel, and manual production deploys can be run with:

```bash
vercel --prod
```

## Security Note

The current Play Rooms schema is an MVP anonymous multiplayer setup with permissive anon policies. Before larger public launch, move game validation server-side or tighten RLS so clients cannot update other rooms/games arbitrarily.
