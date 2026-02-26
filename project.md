# Identity Reconciliation System Guidelines

This document outlines the technical specifications and logic for the Identity Reconciliation service. The system is designed to link disparate customer contact points into a single, unified identity.

## 🎯 Project Objective

The goal is to create a "Single Customer View" for FluxKart.com. Because customers may use different emails and phone numbers for different orders to remain anonymous, this service "connects the dots" by finding common identifiers across transactions.

## 🛠️ Technical Stack

- **Database:** Any SQL-based relational database.
- **Language:** Node.js with TypeScript is preferred (though other frameworks are allowed).
- **Protocol:** HTTP POST using JSON payloads (no form-data).
- **Deployment:** Publicly accessible via a hosting provider (e.g., render.com).

## 🗄️ Data Model

The system relies on a single `Contact` table with the following schema:

| Field            | Type      | Description                                                       |
| :--------------- | :-------- | :---------------------------------------------------------------- |
| `id`             | Integer   | Unique identifier.                                                |
| `phoneNumber`    | String?   | Customer's phone number.                                          |
| `email`          | String?   | Customer's email address.                                         |
| `linkedId`       | Integer?  | The ID of the Primary contact this record links to.               |
| `linkPrecedence` | Enum      | `"primary"` (the first record) or `"secondary"` (all subsequent). |
| `createdAt`      | DateTime  | Timestamp of record creation.                                     |
| `updatedAt`      | DateTime  | Timestamp of the last update.                                     |
| `deletedAt`      | DateTime? | Timestamp for soft deletes.                                       |

## 🚦 Business Logic & Scenarios

### 1. New Identity

If the incoming email and phoneNumber do not match any existing records, create a new row with `linkPrecedence: "primary"`.

### 2. Information Enrichment

If the request contains a new email or phone number that matches an existing contact, create a new secondary record linked to the primary one.

### 3. Identity Merging

If a request contains an email from one primary chain and a phone number from another, the older primary remains `"primary,"` and the newer primary (and its associated records) are converted to `"secondary"`.

## ✅ What We ARE Trying to Achieve

- **Identity Linkage:** Automatically connecting different orders to the same person.
- **Data Consistency:** Ensuring the oldest record is always the root "Primary".
- **Unified Response:** Providing a consolidated JSON object containing all unique emails, phone numbers, and secondary IDs associated with a user.

## ❌ What We ARE NOT Trying to Achieve

- **Hard Merging:** We are not deleting or overwriting old rows; we are linking them via the `linkedId`.
- **Fuzzy Matching:** The system only links on exact matches of email or phone number.
- **Complex Auth:** This is a data reconciliation service, not a user login or password management system.
