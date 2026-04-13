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
