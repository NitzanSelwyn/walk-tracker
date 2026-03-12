# Walk Tracker Map

**Live at [walk-tracker-zeta.vercel.app](https://walk-tracker-zeta.vercel.app)**

A community-driven app that helps people track every street they walk, share their progress, and encourage each other to explore their neighborhoods on foot.

## Why Walk Tracker Map?

Most of us live in the same area for years without ever walking down every street. Walk Tracker Map changes that by turning everyday walks into a fun, visual challenge. Upload your GPS tracks, see which streets you've covered, and watch your map fill up over time.

It's also a social experience. You can follow friends and neighbors, see their routes on the map, compare coverage stats, and climb the leaderboard together. The goal is simple: get people outside, walking more, and discovering the places they live in.

## Features

- **GPX upload & route visualization** -- Upload GPS tracks and see them on an interactive map
- **Street coverage tracking** -- See exactly which streets you've walked and which ones are left
- **Social feed & profiles** -- Follow other walkers, view their routes, and share progress
- **Leaderboard** -- Friendly competition to motivate more walking
- **Community map** -- See how much of your area the community has covered together
- **Bilingual** -- Full English and Hebrew support (with RTL)

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4
- **Backend:** Convex (auth, database, file storage, server functions)
- **Maps:** Leaflet + React-Leaflet
- **Geo calculations:** @turf/turf
- **i18n:** i18next (English + Hebrew)

## Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- A free [Convex](https://www.convex.dev/) account

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/<your-username>/walk-tracker-map.git
   cd walk-tracker-map
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Convex**

   ```bash
   npx convex dev
   ```

   This will prompt you to log in to Convex (or create an account) and link a project. It will also start the Convex dev server that syncs your backend functions.

4. **Set up Google OAuth**

   The app uses **Google Sign-In** for authentication (via Convex Auth). You need to create OAuth credentials:

   1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
   2. Create a new project (or use an existing one).
   3. Go to **APIs & Services > Credentials** and click **Create Credentials > OAuth client ID**.
   4. Set the application type to **Web application**.
   5. Add `http://localhost:5173` to **Authorized JavaScript origins**.
   6. Add your Convex deployment's HTTP Actions URL to **Authorized redirect URIs** (it looks like `https://<your-deployment>.convex.site/api/auth/callback/google`).
   7. Copy the **Client ID** and **Client Secret**.

   Then add them as environment variables in the [Convex dashboard](https://dashboard.convex.dev/) under your deployment's settings:

   | Variable | Description |
   |---|---|
   | `AUTH_GOOGLE_ID` | Your Google OAuth Client ID |
   | `AUTH_GOOGLE_SECRET` | Your Google OAuth Client Secret |
   | `JWT_PRIVATE_KEY` | PEM-encoded private key for signing auth tokens |
   | `JWKS` | Public key in JWKS JSON format |
   | `SITE_URL` | Your local frontend URL (e.g. `http://localhost:5173`) |

   > **Generating JWT keys:** You can generate a key pair using `npx @convex-dev/auth`. Follow the prompts and it will set the `JWT_PRIVATE_KEY` and `JWKS` variables for you.

   > **Note:** On Windows, PEM keys with newlines can't be pasted via the CLI. Use the Convex dashboard UI to set `JWT_PRIVATE_KEY` instead.

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`.

### Available Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |
| `npx convex dev` | Start the Convex dev server (run in a separate terminal alongside `npm run dev`) |

## Contributing

Contributions are welcome! Whether it's a bug fix, a new feature, or an improvement to existing functionality, we'd love your help.

### How to contribute

1. **Fork the repository** and create a new branch from `master`.
2. **Make your changes** in the new branch.
3. **Open a Pull Request** with a clear explanation that covers:
   - **What** you changed and where in the codebase
   - **Why** you made this change (the problem it solves or the value it adds)
   - **What you expect this to add** to the project (user-facing impact, performance improvement, developer experience, etc.)
   - **How to test it** (steps to verify your change works correctly)

### What makes a good PR

- Keep changes focused. One PR per feature or fix is easier to review.
- Follow the existing code style and patterns (TypeScript, Tailwind utility classes, Convex conventions).
- Make sure `npm run build` passes before submitting.
- If you're adding a user-facing feature, include translations for both English (`src/i18n/en.json`) and Hebrew (`src/i18n/he.json`).
- If you're not sure whether an idea is a good fit, open an issue first to discuss it.

## License

This project is open source. See the [LICENSE](LICENSE) file for details.
