# MCAT Mastery

AAMC-style MCAT practice questions with detailed explanations for every answer choice. Built with Next.js, Supabase, and Stripe.

## Architecture

```
Frontend:  Next.js 14 (App Router) + Tailwind CSS  →  Deploy on Vercel
Database:  Supabase (PostgreSQL + Auth + Row-Level Security)
Payments:  Stripe (Subscriptions)
```

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd mcat-mastery
npm install
```

### 2. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the contents of `sql/schema.sql` — run it
3. Go to **Settings → API** and copy your project URL and anon key

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Import Questions

Place your batch JSON files (B001_*.json, B002_*.json, etc.) in a `batches/` directory, then run:

```bash
npm run import-questions
```

Or import a specific file:

```bash
npm run import-questions -- --file ./batches/B001_Fluids_Circulation.json
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
mcat-mastery/
├── sql/
│   └── schema.sql              # Supabase database schema (run this first)
├── scripts/
│   └── import-questions.js      # Loads batch JSON into Supabase
├── src/
│   ├── app/
│   │   ├── layout.js            # Root layout
│   │   ├── page.js              # Landing page
│   │   └── dashboard/
│   │       └── page.js          # Section selection + exam launcher
│   ├── components/
│   │   └── ExamInterface.jsx    # Core Pearson VUE-style exam component
│   ├── lib/
│   │   └── supabase.js          # Supabase client
│   └── styles/
│       └── globals.css          # Global styles + Tailwind
├── .env.local.example           # Environment variable template
├── package.json
├── tailwind.config.js
└── next.config.js
```

## Key Components

### ExamInterface

The core product component. Renders a Pearson VUE-style split-panel exam interface:

- **Top bar**: Section name, question counter, timer, flag button
- **Left panel**: Scrollable passage text (hideable)
- **Right panel**: Question stem, answer choices with radio buttons, strikethrough tool
- **Bottom strip**: Question number navigation with color-coded status
- **Review screen**: Navigate all questions, see completion status
- **Score report**: Results with per-question breakdown
- **Review mode**: Full explanations for every answer choice

Props:
```jsx
<ExamInterface
  questions={[...]}        // Array of question objects
  sectionName="Chem/Phys"  // Full section name
  sectionAbbr="C/P"        // Abbreviation for nav bar
  sectionColor="#0891b2"    // Accent color
  timeLimit={5700}          // Seconds (null = untimed)
  onComplete={(results) => {...}}
/>
```

### Question JSON Format

Each batch file follows this structure:

```json
{
  "batch": "B001",
  "section": "cp",
  "questions": [
    {
      "id": "cp_fluids_001",
      "passage": "Passage text...",
      "usePrevPassage": false,
      "stem": "Question text...",
      "choices": [
        { "label": "A", "text": "Answer A" },
        { "label": "B", "text": "Answer B" },
        { "label": "C", "text": "Answer C" },
        { "label": "D", "text": "Answer D" }
      ],
      "correct": "B",
      "explanations": {
        "A": "Why A is wrong...",
        "B": "Why B is correct...",
        "C": "Why C is wrong...",
        "D": "Why D is wrong..."
      },
      "topic": "Fluid Dynamics",
      "difficulty": "Medium"
    }
  ]
}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect the repo at [vercel.com](https://vercel.com)
3. Add environment variables in Vercel's dashboard
4. Deploy — Vercel auto-detects Next.js

### Stripe Setup (When Ready)

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create a Product with a recurring Price (e.g., $29/month)
3. Add Stripe keys to `.env.local`
4. Set up the webhook endpoint at `/api/webhooks/stripe`

## Development Roadmap

- [x] Exam interface (Pearson VUE style)
- [x] Question bank JSON format
- [x] Database schema with RLS
- [x] Question import script
- [x] Landing page
- [ ] Supabase auth (login/signup)
- [ ] Dashboard with Supabase data fetching
- [ ] Performance analytics (topic/difficulty breakdown)
- [ ] Stripe subscription gating
- [ ] Question filtering (by topic, difficulty, unanswered)
- [ ] Spaced repetition for missed questions
- [ ] Mobile-responsive exam interface

## License

Proprietary. All rights reserved.
