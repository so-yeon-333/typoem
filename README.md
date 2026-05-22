# Typoem

![CI](https://github.com/so-yeon-333/typoem/actions/workflows/test.yml/badge.svg)

> *Type + Poem* — A cozy little corner where friends gather to read a daily poem and leave their ink-marks across the page.

Typoem is a full-stack web application where small groups of close friends gather in private code-based rooms to read one English poem together each day. Users can leave memos on the poem as a whole, attach line-level annotations to specific lines, and look up unfamiliar words through a built-in dictionary.

This project is the team submission for **ITM519 Web Programming (Spring 2026)**, Team 5.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Team](#team)
- [AI Use Disclosure](#ai-use-disclosure)
- [License](#license)

---

## Features

**Core**

- Create or join private rooms with invite codes
- Receive a daily English poem in each room
- Write and share full-poem memos
- Attach line-level annotations to specific lines
- Look up unknown words with an in-app dictionary

**Stretch (time permitting)**

- Personal vocabulary notebook
- Review past poems with notes
- Likes and replies on memos
- Streaks and badges
- Calendar with friend activity
- Dark mode

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML + CSS + Vanilla JavaScript |
| Backend | Node.js + Express |
| Database | SQLite |
| Authentication | JWT (`jsonwebtoken`) + `bcrypt` |
| API Documentation | `swagger-ui-express` + `yamljs` |
| Testing | Jest + Supertest |
| CI | GitHub Actions |
| Deployment | Render (free tier) |

**External APIs**

- [PoetryDB](https://poetrydb.org/) — Source of English poems (free, no auth)
- [Free Dictionary API](https://dictionaryapi.dev/) — Word definitions and pronunciation (free, no auth)

---

## Project Structure

```
typoem/
├── app.js                  # Express entry point
├── db.js                   # Database connection
├── openapi.yaml            # OpenAPI 3.0 specification
├── package.json
├── package-lock.json
├── routes/                 # Express routers
│   ├── auth.js
│   ├── rooms.js
│   ├── memos.js
│   ├── annotations.js
│   └── dictionary.js
├── controllers/            # Route handler logic
├── models/                 # DB access layer
├── middleware/
│   └── authMiddleware.js
├── db/
│   ├── schema.sql          # CREATE TABLE statements
│   └── seed.js             # DB initialization + seed data
├── data/
│   └── poems.json          # Pre-fetched poems from PoetryDB
├── tests/                  # Jest + Supertest tests
├── scripts/                # Utility scripts (e.g., fetch-poems.js)
├── public/                 # Frontend (Lecture 12 pattern)
│   ├── index.html / index.js          # Home — room list
│   ├── register.html / register.js
│   ├── login.html / login.js
│   ├── create-room.html / create-room.js
│   ├── join.html / join.js
│   ├── room.html / room.js            # Today's poem + memos + annotations
│   ├── auth.js                        # Shared helper (JWT, requireLogin, authFetch)
│   └── styles.css
├── .github/
│   └── workflows/
│       └── test.yml        # GitHub Actions CI
├── .env.example
├── .gitignore
└── README.md
```

The structure follows the MVC pattern taught in Lecture 10, with frontend pages served as static files from `public/` (Lecture 12 pattern).

---

## Prerequisites

- **Node.js** v20 or higher
- **npm** v10 or higher
- A GitHub account (for cloning)

Check your versions:

```bash
node --version
npm --version
```

---

## Setup

```bash
git clone https://github.com/so-yeon-333/typoem.git
cd typoem
npm install
cp .env.example .env
```

Then edit `.env` and fill in your values (see [Environment Variables](#environment-variables)).

The database is seeded automatically on first startup. If you want to reset it, delete `typoem.db` and restart.

---

## Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | Port the server listens on | `3000` |
| `JWT_SECRET` | Secret key for signing JWTs (use a long random string) | `your-long-random-string-here` |
| `DB_PATH` | Path to the SQLite database file | `./typoem.db` |
| `NODE_ENV` | Environment mode | `development` or `production` |

> ⚠️ **Never commit `.env` to git.** It is listed in `.gitignore`.

---

## Running the App

### Development

```bash
npm run dev
```

Uses Node's `--watch` mode for automatic restart on file changes. Open `http://localhost:3000` in your browser. The same Express server serves both the REST API and the frontend pages from `public/`.

### Production-style run

```bash
npm start
```

---

## Testing

All tests are written with Jest and Supertest.

```bash
npm test
```

**What's tested:**

- Unit tests for controllers, validators, and utilities (at least 2 non-trivial modules)
- API tests covering at least one authenticated route, one error case (401/404/400), and one successful main-flow endpoint

Tests run automatically on every push to `main` and on every pull request via GitHub Actions (see CI badge at the top of this README).

---

## API Documentation

The OpenAPI 3.0 specification is in `openapi.yaml`.

When the server is running, interactive API documentation is available at:

```
http://localhost:3000/api/docs
```

The docs are generated using `swagger-ui-express` + `yamljs` (Lecture 10 approach).

---

## Deployment

While deployment is optional per the project specification (Section 3.6), the application is deployed on **Render (free tier)** for convenient access during evaluation.

**Deployed URL**: *(to be added once deployed)*

### Notes on Render's free tier

- Render's free web service uses an **ephemeral filesystem**, so the SQLite database is reset on every redeploy or after 15 minutes of inactivity.
- To handle this, the database is seeded on startup with curated poems, so the app is always demonstrable.
- User-generated data (accounts, rooms, memos) persists only between redeploys.
- Free services spin down after 15 minutes of inactivity; the first request after spin-down may take ~30 seconds.

### Running locally as a fallback

If the deployed URL is unavailable, follow the [Setup](#setup) and [Running the App](#running-the-app) sections.

---

## Contributing

This is a team project; the following workflow is followed by all team members.

### Branch Naming

```
feature/<area>-<short-description>    # e.g., feature/auth-jwt
fix/<area>-<short-description>        # e.g., fix/login-validation
test/<area>                           # e.g., test/auth-controller
docs/<area>                           # e.g., docs/readme-update
chore/<area>                          # e.g., chore/install-bcrypt
```

### Commit Messages

We follow simplified Conventional Commits:

```
feat: <description>     # New feature
fix: <description>      # Bug fix
test: <description>     # Test addition
docs: <description>     # Documentation
refactor: <description> # Code refactoring
chore: <description>    # Maintenance, setup
```

All commit messages are written in English.

### Pull Request Workflow

1. Create a feature branch from `main`
2. Make changes and commit
3. Push the branch and open a Pull Request on GitHub
4. CI must pass before merging
5. Review from a teammate is recommended but not required
6. Use **Merge commit** (not Squash) to preserve individual commit history on `main`
7. Delete the feature branch after merging (GitHub does this automatically)

### Git Configuration

Before your first commit, ensure your git identity matches your GitHub account:

```bash
git config user.name "Your Name"
git config user.email "your-github-email@example.com"
```

This is important for individual commit history (see Section 6.1 of the project specification).

---

## Team

**Team 5 — ITM519 Web Programming (Spring 2026)**

| Member | Role |
| --- | --- |
| 박소연 | Team Lead, Frontend (poem screen, memo/annotation UI), Deployment, Initial repo and CI setup |
| 권시현 | Backend (DB schema, memos, line annotations, tests) |
| 이지섭 | Backend (authentication, rooms, today's poem API) |
| 김경윤 | Frontend (auth pages, room list, dictionary), CI maintenance and reporting |

---

## AI Use Disclosure

In accordance with **Section 7 of the project specification (Academic Integrity and AI Use)**, the team discloses the use of AI assistants during this project.

**Tools used:**

- Claude (Anthropic)

**Areas where AI was used (updated as the project progresses):**

- Refining the application concept and feature prioritization during the proposal phase
- Reviewing the data model and REST API design for consistency
- Drafting initial README structure and team workflow documentation
- *(additional areas to be documented as development progresses, e.g., code review suggestions, debugging assistance, test scaffolding, etc.)*

All AI-assisted output is reviewed, understood, and modified by the responsible team member before being committed. Individual understanding will be verified during the live evaluation (Section 5.2 of the specification).

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
