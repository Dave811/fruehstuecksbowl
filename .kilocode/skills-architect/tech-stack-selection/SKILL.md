# Tech Stack Selection - React + HeroUI + Node.js

## Description

This skill covers selecting and justifying appropriate technologies for a school web application, considering factors like developer experience, component availability, deployment complexity, and privacy requirements.

## Selected Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React 18+ with Vite | Fast dev server, excellent ecosystem |
| **UI Framework** | HeroUI + Tailwind v4 | Modern components, mobile-first |
| **Language** | TypeScript | Type safety, maintainability |
| **Runtime** | Bun | Faster than Node.js, built-in TypeScript support, all-in-one tool
| **ORM** | Prisma | Type-safe database access |
| **Database** | SQLite (dev) / PostgreSQL (prod) | Simple to complex scaling |
| **Auth** | JWT + DOB Hash | Privacy-preserving, no passwords |

## When to Use

Use this skill when:
- Evaluating UI frameworks (HeroUI vs alternatives)
- Choosing between SQLite and PostgreSQL
- Deciding on authentication approach
- Planning print-optimized outputs
- Designing for mobile-first (QR code access)

## Key Decisions

### HeroUI Selection
- **Pros**: Modern React components, Tailwind v4 native, responsive
- **Cons**: Requires Tailwind v4 specifically
- **Mitigation**: Proper Vite + Tailwind configuration

### Auth without Passwords
- Students identified by Name + DOB hash (no PII storage)
- JWT tokens for session management
- Admin PIN for staff access

### Print Views
- Browser native print (Ctrl+P / Cmd+P)
- Print CSS media queries
- No PDF library dependency

## Related Skills

- [System Design](./system-design) - Architecture patterns
- [Database Design](./database-design) - Schema decisions
