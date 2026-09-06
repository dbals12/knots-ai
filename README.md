# Remix of Switch Studio

Project: Switch Manager (MVP)

I want to build a "Career Branding AI Agent" web application called Switch Manager.
This app converts a user's 3-minute voice memo into 4 different content formats (Blog, LinkedIn, Reels Script, Threads) using AI.

1. Tech Stack Requirements

Frontend: React, Vite, TypeScript, Tailwind CSS, Shadcn UI

Backend/DB: Supabase (Auth, Database, Edge Functions for AI)

Icons: Lucide React

Styling: Mobile-first, clean, professional but trendy aesthetic (Target: 20-30s women).

2. Core User Flow

Onboarding: User selects Job Role (Marketing, PM, Data, etc.) and Preferred Tone (Professional, Witty, Calm).

Main Input (Home): A very large, centered Recording Button (Red/Gradient). User clicks to record voice (simulate functionality if needed). Below it, 3 input chips for "Keywords".

Processing: A loading animation showing "Refracting your story..." (Prism effect).

Result View (Card Layout): Display 4 distinct cards for the generated content.

Blog: Long text, structured (Green accent)

LinkedIn: Professional insight style (Blue accent)

Reels: Split view (Visual description | Audio script) (Pink/Purple accent)

Threads: Short, witty text (Black/White accent)

Action: Each card has Copy, Save, and Regenerate buttons.

3. Database Schema (Supabase)

Please structure the app to connect with these Supabase tables:

users: id (uuid), email, job_role, tone_preference

sessions: id, user_id, raw_text (from STT), created_at

outputs: id, session_id, platform (blog/linkedin/reels/threads), content (text or json), is_saved (boolean)

edits: id, output_id, edit_type, feedback_score

4. UI/UX Details

Mobile First: The layout must look perfect on mobile.

The Switch Concept: Use a "Toggle Switch" or "Prism" motif in the logo or loading state.

Micro-interactions: Smooth transitions when switching between result cards.

5. Implementation Steps

Set up the Supabase client and Auth context.

Create the Onboarding flow to save user preferences.

Build the Main Recorder Interface (Mock the STT API call for now with a setTimeout and dummy text).

Create the Result Component that parses the dummy response and renders the 4-card view.

Implement the "Copy to Clipboard" function for each card.

Please start by scaffolding the project structure and setting up the routing.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://knots-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5dfb626d-9d5a-4e3e-b8dd-ce8424cdfc7e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
