# StadiumPulse Backend

A production-ready backend for a Smart Stadium Experience System, built with Node.js, Express, better-sqlite3, and WebSockets.

## Architecture

This project consists of an Express HTTP server for RESTful endpoints and a separate WebSocket server for real-time telemetry (simulation data, incident tracking, queue management).

## Prerequisites

- Node.js 20 LTS or higher
- npm

## Setup & Running

1. Clone or copy the files.
2. Run `npm install`.
3. Create `.env` from `.env.example` (or use the provided `.env`).
4. Run `npm start` to start the HTTP and WebSocket servers. The database will initialize automatically with seed data.
5. Use `npm test` to run the test suite.

## Environment Variables

- `PORT`: HTTP Server port (default 5000)
- `WS_PORT`: WebSocket server port (default 5001)
- `NODE_ENV`: environment (development/production)
- `DB_PATH`: path to sqlite database (default ./stadiumpulse.sqlite)
- `JWT_SECRET`: Secret used for signing auth tokens
- `SIMULATION_TICK_RATE_MS`: Speed of the stadium simulation loops (default 5000ms)

## Real Data Sources

| Feature           | Source         | Cost | API Key? |
|-------------------|---------------|------|----------|
| Live weather      | wttr.in        | Free | No       |
| Stadium detection | GPS geofence   | Free | No       |
| Match score       | CricAPI        | Free | Yes*     |
| Queue times       | Virtual system | Free | No       |

*CricAPI free tier: 100 calls/day
 Get key at: https://cricapi.com
 Leave CRICAPI_KEY blank = uses simulation fallback

## Getting CricAPI Key (2 minutes)
1. Go to cricapi.com
2. Click "Sign Up Free"  
3. Verify email
4. Copy API key from dashboard
5. Add to .env: CRICAPI_KEY=your_key_here
6. Restart server — live scores now real
