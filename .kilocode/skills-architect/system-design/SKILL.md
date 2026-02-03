# System Design - Frühstücksbowls Bestellsystem

## Description

This skill covers the ability to design and architect a full-stack web application for a school breakfast bowl ordering system with role-based access, deadline management, and print-optimized outputs.

## Context

Based on the project idea from `idea.md`, this skill enables:

- **Frontend**: React + HeroUI + Tailwind v4 + TypeScript
- **Backend**: Bun + Elysia (or Express/Fastify) + Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- **Auth**: Privacy-preserving student auth (DOB hash) + Admin PIN
- **Features**: Multi-tier ordering, deadline locking, print views, shopping calculations

## When to Use

Use this skill when:
- Planning project architecture and component structure
- Designing database schemas for orders, users, and menu items
- Planning API endpoints and data flow
- Defining validation rules and business logic
- Organizing print views and reporting features

## Examples

```typescript
// Example: Order validation logic
interface CategoryRule {
  minSelect: number;
  maxSelect: number;
}

function validateOrder(
  orderItems: OrderItem[],
  categoryRules: Map<string, CategoryRule>
): ValidationResult {
  // Check min/max per category
}
```

## Related Skills

- [Tech Stack Selection](./tech-stack-selection) - Selecting appropriate frameworks
- [Database Design](./database-design) - Prisma schema design
- [API Design](./api-design) - REST endpoint patterns
