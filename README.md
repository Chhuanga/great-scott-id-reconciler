# great-scott-id-reconciler

> "Roads? Where we're going, we don't need roads... but we DO need unified data clusters."

## The Mission

Meet Dr. Emmett Brown — visionary, eccentric, and a loyal FluxKart customer. To avoid drawing attention to his rather ambitious time-travel project, Doc places orders under different email addresses and phone numbers. FluxKart is none the wiser.

This service fixes that. It reconciles Doc's scattered contact points — across every alias he has ever used — into a single, authoritative identity. Bitespeed calls this the **Identity Reconciliation Problem**. We call it Tuesday.

## Live Endpoint

```
POST https://<your-deployment-url>/identify
```

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL (or a hosted instance — see below)

### Installation

```bash
git clone https://github.com/Chhuanga/great-scott-id-reconciler.git
cd great-scott-id-reconciler
npm install
```

### Configuration

Copy the example environment file and fill in your database URL:

```bash
cp .env.example .env
```

```
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
PORT=3000
```

If your password contains special characters — and it should — URL-encode them.
A `#` becomes `%23`. The database parser is not a mind reader.

### Database

Run migrations to create the `Contact` table:

```bash
npm run db:deploy
```

### Running Locally

```bash
npm run dev
```

The server starts on port 3000. A Docker Compose file is included if you need a local Postgres instance:

```bash
docker compose up -d
```

This spins up Postgres on port 5433 to avoid conflicts with any existing local instances.

## API Reference

### POST /identify

Accepts a JSON body with at least one of the following fields:

```json
{
  "email": "doc@fluxkart.com",
  "phoneNumber": "88005553535"
}
```

Returns the consolidated identity cluster:

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["doc@fluxkart.com", "emmett@hillvalley.com"],
    "phoneNumbers": ["88005553535", "11111111111"],
    "secondaryContactIds": [2, 3]
  }
}
```

The primary contact's email and phone number always appear first in their respective arrays.

### Validation

- At least one of `email` or `phoneNumber` must be present.
- Phone numbers must be at least 10 digits.
- Emails must follow a standard format.
- Empty strings are treated as not provided.

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express
- **ORM:** Prisma
- **Database:** PostgreSQL (hosted on Supabase)
- **Deployment:** Railway

## Deployment

The service is deployed on Railway with the database on Supabase. Railway runs the following on each deploy:

```
npm install → prisma generate → tsc → node dist/index.js
```

No manual steps required after the initial `npm run db:deploy`.
