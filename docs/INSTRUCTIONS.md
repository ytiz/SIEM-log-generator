# SIEM Log Generator Instructions

## Purpose
This standalone generator sends synthetic security events to the SIEM backend for testing detections, dashboards, and ingest stability.

## Prerequisites
- Node.js 18+
- npm
- SIEM backend running and reachable

## Environment Setup
Create or update `.env` at project root with:

```env
SIEM_BASE_URL=http://localhost:3001
SIEM_USERNAME= // username in siem env file
SIEM_PASSWORD= // password in siem env file
```

Supported credential keys:
- Preferred: `SIEM_USERNAME` and `SIEM_PASSWORD`
- Also supported for backward compatibility: `SIMULATOR_EMAIL` and `SIMULATOR_PASSWORD`

## Install Dependencies
```bash
npm install
```

## Run the Generator
```bash
npm start
```

Expected startup output includes:
- `Authenticated.`
- `Log Emitted: ...`

## Type Check
```bash
npm run typecheck
```

## Optional Runtime Tuning
You can tune event cadence with these optional env vars:

```env
BRUTE_FORCE_ATTEMPTS=5
BRUTE_FORCE_INTERVAL_MS=30000
BRUTE_FORCE_ATTEMPT_DELAY_MS=500
NOISE_INTERVAL_MS=10000
```

## What It Sends
- Repeated `auth_failure` events (brute-force simulation)
- A high-severity `auth_success` follow-up event
- Periodic low-severity `system_health` noise events

## Troubleshooting
### Auth fails with 400
- Confirm `.env` has valid values for `SIEM_USERNAME` and `SIEM_PASSWORD`
- Ensure the SIEM login endpoint expects `email` + `password` in the request body

### Auth fails with 401
- Verify credentials exist in the SIEM backend seed/users
- Check for stale account password values

### Ingest fails
- Confirm backend is running and reachable at `SIEM_BASE_URL`
- Confirm account role can call `POST /events/ingest`
- Confirm JWT auth is enabled and login succeeds first

## Stop the Generator
Press `Ctrl+C` to stop cleanly.
