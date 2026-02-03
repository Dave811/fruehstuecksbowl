# Frühstücksbowls Bestellsystem - Implementierungsplan

## 1. Projektstruktur

```
bestellen/
├── docker-compose.yml
├── .env.example
├── README.md
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── providers.tsx
│   │   ├── index.css
│   │   ├── vite-env.d.ts
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── endpoints.ts
│   │   │   └── types.ts
│   │   ├── pages/
│   │   │   ├── OrderPage.tsx
│   │   │   ├── AdminLogin.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminOrders.tsx
│   │   │   ├── AdminMenu.tsx
│   │   │   ├── AdminCycles.tsx
│   │   │   └── PrintPages.tsx
│   │   ├── components/
│   │   │   ├── OrderConfigurator.tsx
│   │   │   ├── CategorySelector.tsx
│   │   │   ├── OrderSummary.tsx
│   │   │   ├── AuthForm.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   └── PrintLayout.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useOrder.ts
│   │   │   └── useAdmin.ts
│   │   ├── utils/
│   │   │   ├── validation.ts
│   │   │   └── calculations.ts
│   │   └── types/
│   │       └── index.ts
│   └── public/
│       └── uploads/
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── plugins/
│   │   │   ├── auth.ts
│   │   │   └── cors.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── public/
│   │   │   │   ├── menu.ts
│   │   │   │   └── orders.ts
│   │   │   └── admin/
│   │   │       ├── auth.ts
│   │   │       ├── orders.ts
│   │   │       ├── menu.ts
│   │   │       ├── cycles.ts
│   │   │       ├── stats.ts
│   │   │       └── shopping.ts
│   │   ├── services/
│   │   │   ├── auth.ts
│   │   │   ├── order.ts
│   │   │   └── shopping.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   └── utils/
│   │       └── hash.ts
│   └── uploads/
│
└── nginx/
    └── default.conf
```

## 2. Docker Compose Setup

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: breakfast-db
    environment:
      POSTGRES_USER: ${DB_USER:-breakfast}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-breakfast123}
      POSTGRES_DB: ${DB_NAME:-breakfast}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-breakfast}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: breakfast-backend
    environment:
      DATABASE_URL: postgresql://${DB_USER:-breakfast}:${DB_PASSWORD:-breakfast123}@postgres:5432/${DB_NAME:-breakfast}?schema=public
      JWT_SECRET: ${JWT_SECRET:-your-super-secret-jwt-key}
      ADMIN_PIN: ${ADMIN_PIN:-1234}
      PORT: ${BACKEND_PORT:-3001}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: breakfast-frontend
    environment:
      VITE_API_URL: http://localhost:3001
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

## 3. Frontend Setup (Vite + React + HeroUI + Tailwind v4)

### package.json (frontend)
```json
{
  "name": "breakfast-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@heroui/button": "^2.2.0",
    "@heroui/card": "^2.2.0",
    "@heroui/checkbox": "^2.3.0",
    "@heroui/date-picker": "^2.3.0",
    "@heroui/input": "^2.4.0",
    "@heroui/kbd": "^2.1.0",
    "@heroui/modal": "^2.2.0",
    "@heroui/select": "^2.4.0",
    "@heroui/snippet": "^2.2.0",
    "@heroui/spinner": "^2.2.0",
    "@heroui/table": "^2.2.0",
    "@heroui/tabs": "^2.2.0",
    "@heroui/use-infinite-scroll": "^2.2.0",
    "@heroui/use-image": "^2.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "@tanstack/react-query": "^5.60.0",
    "axios": "^1.7.7",
    "dayjs": "^1.11.13"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "tailwindcss": "^3.4.15",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47"
  }
}
```

### Vite Config
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
```

### Tailwind Config
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [
    require("@heroui/theme")
  ],
}
```

### CSS Setup
```css
@import "tailwindcss";

@layer utilities {
  .print-only {
    @media print {
      display: block !important;
    }
    @media screen {
      display: none !important;
    }
  }
  
  .screen-only {
    @media print {
      display: none !important;
    }
  }
}
```

### Providers
```typescript
import { HeroUIProvider } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1
      }
    }
  })

  return (
    <HeroUIProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </HeroUIProvider>
  )
}
```

## 4. Backend Setup (Fastify + Prisma)

### package.json (backend)
```json
{
  "name": "breakfast-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.1",
    "@fastify/jwt": "^8.0.1",
    "@fastify/multipart": "^8.3.0",
    "@fastify/static": "^7.0.4",
    "@prisma/client": "^5.22.0",
    "fastify": "^4.28.1",
    "node:crypto": "^1.0.0",
    "dayjs": "^1.11.13",
    "pino": "^9.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "prisma": "^5.22.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3"
  }
}
```

### Prisma Schema
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Class {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now())
  users     User[]
  orders    Order[]
}

model User {
  id        String   @id @default(cuid())
  name      String
  dobHash   String
  classId   String
  class     Class    @relation(fields: [classId], references: [id])
  orders    Order[]
  createdAt DateTime @default(now())

  @@unique([name, dobHash])
}

model OrderCycle {
  id          String   @id @default(cuid())
  name        String?
  identifier  String   @unique // e.g., "2026-W06"
  deadlineAt  DateTime
  isLocked    Boolean  @default(false)
  createdAt   DateTime @default(now())
  orders      Order[]
}

model Category {
  id        String      @id @default(cuid())
  name      String
  level     Int
  minSelect Int         @default(0)
  maxSelect Int         @default(1)
  isActive  Boolean     @default(true)
  ingredients Ingredient[]
}

model Ingredient {
  id              String       @id @default(cuid())
  categoryId      String
  category        Category     @relation(fields: [categoryId], references: [id])
  name            String
  imagePath       String?
  portionAmount   Float
  portionUnit     PortionUnit
  portionLabel    String?      // e.g., "½ Banane"
  purchaseUnitSize Float?
  purchaseUnit    PurchaseUnit?
  purchaseUnitName String?    // e.g., "Becher"
  wasteFactor     Float       @default(0.0)
  isActive        Boolean     @default(true)
  orderItems      OrderItem[]
}

model Order {
  id          String      @id @default(cuid())
  cycleId     String
  cycle       OrderCycle  @relation(fields: [cycleId], references: [id])
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  note        String?
  updatedAt   DateTime    @updatedAt
  items       OrderItem[]

  @@unique([cycleId, userId])
}

model OrderItem {
  id              String     @id @default(cuid())
  orderId         String
  order           Order      @relation(fields: [orderId], references: [id], onDelete: Cascade)
  ingredientId    String
  ingredient      Ingredient @relation(fields: [ingredientId], references: [id])
  quantityMultiplier Float   @default(1.0)

  @@unique([orderId, ingredientId])
}

enum PortionUnit {
  g
  ml
  piece
}

enum PurchaseUnit {
  g
  ml
  piece
}
```

## 5. API Endpoints

### Public API (Student)
```
GET  /api/public/menu?cycle=YYYY-WW
POST /api/public/auth
GET  /api/public/order?cycle=YYYY-WW
PUT  /api/public/order?cycle=YYYY-WW
```

### Admin API
```
POST /api/admin/auth
GET  /api/admin/orders?cycle=...&classId=...
GET  /api/admin/stats?cycle=...
GET  /api/admin/shopping?cycle=...
GET  /api/admin/instructions?cycle=...
POST /api/admin/categories
PUT  /api/admin/categories/:id
DELETE /api/admin/categories/:id
POST /api/admin/ingredients
PUT  /api/admin/ingredients/:id
DELETE /api/admin/ingredients/:id
POST /api/admin/cycles
PUT  /api/admin/cycles/:id
DELETE /api/admin/cycles/:id
GET  /api/admin/classes
POST /api/admin/classes
DELETE /api/admin/classes/:id
```

## 6. Authentication Logic

### Student Auth
```typescript
// POST /api/public/auth
interface StudentAuthRequest {
  name: string
  dob: string // YYYY-MM-DD
  classId: string
}

const dobHash = sha256(salt + dob)
const user = await prisma.user.findFirst({
  where: { name, dobHash, classId }
})

if (!user) {
  // Create new user
  user = await prisma.user.create({ data: { name, dobHash, classId } })
}

// Return JWT
const token = jwt.sign({ userId: user.id, role: 'student' })
```

### Admin Auth
```typescript
// POST /api/admin/auth
interface AdminAuthRequest {
  pin: string
}

if (pin !== process.env.ADMIN_PIN) {
  throw new Unauthorized('Invalid PIN')
}

const token = jwt.sign({ role: 'admin' })
```

## 7. Frontend Pages

### Order Page (/order)
```
State Machine:
1. AUTH_REQUIRED → Show AuthForm
2. LOADING → Show Spinner
3. CONFIGURING → Show OrderConfigurator
4. LOCKED → Show locked banner + read-only view
5. SUMMARY → Show OrderSummary
```

### Admin Dashboard (/admin)
```
Tabs:
- Overview (Stats cards)
- Orders (Table with filters)
- Menu (Categories & Ingredients CRUD)
- Cycles (Create/Edit order cycles)
- Print (Print views)
```

## 8. Print Views

### CSS Print Styles
```css
@media print {
  @page {
    size: A4;
    margin: 1cm;
  }
  
  .no-print {
    display: none !important;
  }
  
  .print-page {
    break-after: always;
  }
  
  .print-card {
    break-inside: avoid;
    border: 1px solid #000;
    margin-bottom: 10px;
    padding: 10px;
  }
  
  .ingredient-image {
    width: 50px;
    height: 50px;
    object-fit: cover;
  }
}
```

## 9. Shopping List Calculation

```typescript
interface IngredientSummary {
  ingredient: Ingredient
  totalPortionAmount: number
  totalWithWaste: number
  purchaseUnits: number
}

function calculateShoppingList(orders: Order[], wasteFactor: number = 0.1): IngredientSummary[] {
  const ingredientTotals = new Map<string, number>()
  
  for (const order of orders) {
    for (const item of order.items) {
      const current = ingredientTotals.get(item.ingredientId) || 0
      ingredientTotals.set(
        item.ingredientId,
        current + (item.ingredient.portionAmount * item.quantityMultiplier)
      )
    }
  }
  
  return Array.from(ingredientTotals.entries()).map(([id, total]) => {
    const ingredient = await prisma.ingredient.findUnique({ where: { id } })
    const totalWithWaste = total * (1 + wasteFactor)
    const purchaseUnits = ingredient.purchaseUnitSize
      ? Math.ceil(totalWithWaste / ingredient.purchaseUnitSize)
      : 0
    
    return {
      ingredient,
      totalPortionAmount: total,
      totalWithWaste,
      purchaseUnits
    }
  })
}
```

## 10. Implementation Order

1. **Phase 1: Foundation**
   - Create project directories
   - Set up Docker Compose
   - Initialize frontend (Vite + HeroUI)
   - Initialize backend (Fastify + Prisma)
   - Run initial migrations

2. **Phase 2: Backend Core**
   - Implement Prisma schema
   - Create auth middleware
   - Build public API endpoints
   - Build admin API endpoints

3. **Phase 3: Frontend Core**
   - Set up routing
   - Create API client
   - Build Order page
   - Build Admin pages

4. **Phase 4: Features**
   - Print views
   - Image upload
   - Stats dashboard
   - CSV export

5. **Phase 5: Polish**
   - Error handling
   - Loading states
   - Documentation
   - Seed data

## 11. Seed Data

```typescript
// Classes
await prisma.class.createMany({
  data: [
    { name: 'M3' },
    { name: 'O2' },
    { name: 'Q2' },
    { name: 'EF' },
    { name: 'Q1' }
  ]
})

// Categories
await prisma.category.createMany({
  data: [
    { name: 'Basis', level: 1, minSelect: 1, maxSelect: 1 },
    { name: 'Marmelade', level: 2, minSelect: 0, maxSelect: 1 },
    { name: 'Obst', level: 3, minSelect: 0, maxSelect: 3 },
    { name: 'Chiasamen', level: 4, minSelect: 0, maxSelect: 1 },
    { name: 'Extras', level: 5, minSelect: 0, maxSelect: 2 }
  ]
})

// Ingredients
await prisma.ingredient.createMany({
  data: [
    {
      categoryId: 'basis-id',
      name: 'Skyr',
      portionAmount: 150,
      portionUnit: 'g',
      purchaseUnitSize: 500,
      purchaseUnit: 'g',
      purchaseUnitName: 'Becher',
      wasteFactor: 0.05
    },
    {
      categoryId: 'basis-id',
      name: 'Joghurt',
      portionAmount: 150,
      portionUnit: 'g',
      purchaseUnitSize: 500,
      purchaseUnit: 'g',
      purchaseUnitName: 'Becher'
    },
    {
      categoryId: 'obst-id',
      name: 'Banane',
      portionAmount: 0.5,
      portionUnit: 'piece',
      portionLabel: '½ Banane',
      purchaseUnitSize: 6,
      purchaseUnit: 'piece'
    },
    {
      categoryId: 'obst-id',
      name: 'Erdbeeren',
      portionAmount: 50,
      portionUnit: 'g',
      purchaseUnitSize: 500,
      purchaseUnit: 'g',
      purchaseUnitName: 'Packung'
    }
  ]
})
```

## 12. Environment Variables

### .env.example
```env
# Database
DB_USER=breakfast
DB_PASSWORD=your-secure-password
DB_NAME=breakfast

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Admin
ADMIN_PIN=1234

# Backend
PORT=3001
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3001
```

## 13. Development Commands

```bash
# Start all services
docker-compose up -d

# Frontend dev (with hot reload)
cd frontend && bun run dev

# Backend dev (with hot reload)
cd backend && bun run dev

# Database
cd backend && bun run db:migrate
cd backend && bun run db:seed

# Build for production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
```
