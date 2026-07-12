# KVK Digital Management Dashboard

Production-ready KVK (Krishi Vigyan Kendra) Management Dashboard built with React, Express, MongoDB and AWS S3.

---

# Tech Stack

Frontend

- React 18
- React Router 6
- TypeScript
- Vite
- TailwindCSS
- Radix UI
- Lucide React

Backend

- Express
- MongoDB
- JWT Authentication
- AWS S3
- TypeScript

Package Manager

- pnpm

---

# Project Structure

client/
    pages/
    components/
    hooks/
    lib/
    styles/

server/
    index.ts
    routes/

shared/
    api.ts
    appConstants.ts

scripts/
    data generation
    import utilities
    seed utilities

public/
    static assets only

---

# Important Notes

GeoJSON files are NOT stored in Git.

GeoJSON files are hosted on AWS S3.

Never regenerate or commit GeoJSON unless explicitly requested.

---

# Coding Guidelines

Always:

- Use TypeScript strict typing.
- Prefer existing utilities over creating new ones.
- Reuse UI components.
- Keep styling consistent with Tailwind.
- Use shared interfaces whenever possible.
- Use pnpm instead of npm.

Avoid:

- Duplicated business logic.
- Creating API endpoints unless server-side logic is required.
- Hardcoded values.
- Hardcoded secrets.

---

# Backend Guidelines

Current backend entry point:

server/index.ts

Current size:

~4260 lines

This file is too large.

When modifying backend code:

Prefer moving code into:

server/routes/
server/controllers/
server/services/
server/middleware/
server/utils/
server/config/

instead of increasing the size of index.ts.

Do not change behaviour while refactoring.

---

# Frontend Guidelines

Pages belong in

client/pages/

Reusable UI belongs in

client/components/

Business logic belongs in

client/lib/

Reusable hooks belong in

client/hooks/

Avoid placing API logic directly inside components.

---

# Authentication

Uses JWT authentication.

Never hardcode:

- JWT secret
- MongoDB URI
- AWS credentials

Read all secrets from environment variables.

---

# Maps

Maps load GeoJSON from AWS S3.

Do not regenerate GeoJSON.

Do not commit generated GeoJSON.

---

# Before Creating New Code

Always:

1. Search for existing implementation.
2. Search for reusable components.
3. Search for reusable utilities.
4. Reuse existing API endpoints where possible.

---

# Refactoring Rules

Prefer:

Small focused files.

Target sizes:

Components:
<300 lines

Hooks:
<200 lines

Utilities:
<250 lines

Routes:
<250 lines

Services:
<400 lines

Avoid adding more code to server/index.ts.

---

# Current Refactoring Priority

Highest priority:

Refactor

server/index.ts

into

- routes
- controllers
- services
- middleware
- config

without changing application behaviour.

Maintain backward compatibility.

---

# Development Commands

pnpm dev

pnpm build

pnpm start

pnpm test

pnpm typecheck

---

# AI Agent Instructions

Before writing any code:

- Read existing implementation.
- Preserve existing functionality.
- Keep TypeScript error free.
- Avoid duplicate code.
- Prefer modular architecture.
- Minimize breaking changes.