# Rest App - Caffeine & Sleep Tracker

A mobile-first web application that helps users understand the relationship between their caffeine consumption and sleep quality. Users can log their daily caffeine intake, track sleep metrics (including Oura Ring integration), and view insights about how their habits affect their rest.

**Features:**
- Demo mode with simulated sleep data (default)
- Live Oura Ring integration for real sleep data
- Manual caffeine logging
- Sleep quality insights and correlations

## About This Project

This repository is a **technical case study** demonstrating a code review and refactoring exercise. The original codebase had several architectural and UX issues that have been identified and addressed.

### Key Documents

| Document | Description |
|----------|-------------|
| [**Feedback.md**](./Feedback.md) | Comprehensive code review organized by severity: critical issues, bad practices, and polish items |
| [**Approach-and-Plan.md**](./Approach-and-Plan.md) | Strategy and prioritization framework used to address the issues |
| [**Instructions.md**](./Instructions.md) | Detailed setup guide for first-time users, including troubleshooting |

## Quick Start

```bash
npm install    # First time only
npm start      # Starts database, backend, and frontend
```

Then open [http://localhost:5173](http://localhost:5173) and log in with:
- **Email:** `test@example.com`
- **Password:** `test123`

For detailed setup instructions, troubleshooting, Oura integration details, and alternative commands, see [Instructions.md](./Instructions.md).

**Note:** The app includes both demo mode (simulated data) and live Oura Ring integration. By default, demo mode is enabled. See [Instructions.md](./Instructions.md#-oura-ring-integration--demo-mode) for details on connecting your Oura Ring.

## What Was Changed

The original app connected the frontend directly to a Supabase database. This refactor:

- **Added a backend layer** (Express.js) to properly separate concerns
- **Implemented proper authentication** with JWT tokens
- **Replaced localStorage abuse** with proper API-driven state management
- **Added URL-based routing** for better developer experience
- **Improved mobile responsiveness** for the caffeine logging modal
- **Enhanced accessibility** with info tooltips
- **Created a progress tracker** to give users a compelling reason to return
- **Implemented Oura Ring integration** with demo mode and live data sync
- **Added demo mode toggle** for testing without an Oura Ring

See [Feedback.md](./Feedback.md) for the full list of issues identified and addressed.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Database   │
│  React/TS   │     │  Express.js │     │ PostgreSQL  │
│  Port 5173  │     │  Port 3001  │     │  Port 5432  │
└─────────────┘     └─────────────┘     └─────────────┘
```

- **Frontend:** React + TypeScript + Vite
- **Backend:** Express.js with JWT authentication
- **Database:** PostgreSQL (via Docker)
- **Styling:** Tailwind CSS

## Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start everything (recommended) |
| `npm run dev:all` | Start backend + frontend (if DB already running) |
| `npm run db:seed` | Add 30 days of sample data |
| `npm run db:reset` | Reset database completely |

## Connection Info

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Database | postgresql://postgres:postgres@localhost:5432/femmli_casestudy |
