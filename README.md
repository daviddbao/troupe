# Troupe

Group trip planning, done right. Coordinate availability, build itineraries, and actually go.

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** Supabase (Postgres + Auth)
- **Deployment:** Vercel

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
3. Run the migration in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor
4. `npm install && npm run dev`

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login + Signup
│   ├── dashboard/       # User home, trip list
│   ├── trips/[id]/      # Trip detail
│   │   ├── availability/  # Availability calendar
│   │   └── itinerary/     # Day-by-day itinerary builder
│   └── api/             # API routes
├── components/
│   ├── availability/    # Calendar UI
│   └── itinerary/       # Itinerary UI
├── lib/
│   ├── supabase/        # Client + server Supabase clients
│   ├── types.ts         # Shared TypeScript types
│   └── availability.ts  # Overlap window calculation logic
└── middleware.ts         # Auth middleware
supabase/
└── migrations/          # DB schema
```
