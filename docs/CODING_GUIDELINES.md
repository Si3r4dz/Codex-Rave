# Coding Guidelines

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Frontend Guidelines](#2-frontend-guidelines)
3. [Backend Guidelines](#3-backend-guidelines)
4. [Code Quality Principles](#4-code-quality-principles)
5. [Examples & Patterns](#5-examples--patterns)

---

## 1. Architecture Overview

### Clean Architecture Layers

```
Codex-Rave/
├── app/                    # Next.js routes & pages (presentation layer)
│   ├── api/               # API routes (thin HTTP handlers)
│   │   ├── stats/         # Dashboard statistics endpoint
│   │   ├── project-rates/ # Project rates CRUD
│   │   ├── settings/      # Application settings
│   │   └── holidays/      # Polish holidays data
│   └── page.tsx           # Main dashboard page
│
├── components/            # React components (UI layer)
│   ├── ui/               # Atomic reusable components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── Skeleton.tsx
│   ├── StatCard.tsx      # Composed components
│   ├── ProjectTable.tsx
│   ├── Charts.tsx
│   └── ProjectDetailsModal.tsx
│
├── lib/                   # Business logic & infrastructure
│   ├── services/         # Business logic (service layer)
│   │   ├── dashboard-stats.service.ts
│   │   ├── project-details.service.ts
│   │   └── holidays.service.ts
│   ├── utils/            # Pure helper functions
│   │   ├── formatters.ts
│   │   ├── date.ts
│   │   ├── everhour-utils.ts
│   │   ├── rates.ts
│   │   └── api-error.ts
│   ├── schemas/          # Zod validation schemas
│   │   ├── settings.ts
│   │   └── project-rates.ts
│   ├── db.ts             # Database operations (SQLite)
│   └── everhour.ts       # Everhour API client
│
└── types/                 # TypeScript type definitions
    └── index.ts
```

### Separation of Concerns

Each layer has a specific responsibility:

| Layer | Responsibility | What it does | What it doesn't do |
|-------|---------------|--------------|-------------------|
| **API Routes** | HTTP handling | Parse requests, call services, return responses | Business logic, calculations |
| **Services** | Business logic | Calculations, data aggregation, orchestration | HTTP handling, database queries |
| **Utils** | Helper functions | Formatting, parsing, pure functions | State management, API calls |
| **Components** | UI rendering | Display data, handle user interaction | Data fetching, calculations |
| **Database** | Data persistence | CRUD operations, queries | Business logic |

**Example Flow:**
```
User clicks button
  → Component calls API (fetch('/api/stats'))
    → API Route validates request
      → Service fetches data
        → Utils format data
          → Database queries data
      ← Service returns formatted data
    ← API Route returns JSON
  ← Component displays data
```

---

## 2. Frontend Guidelines

### Atomic Component Design

Break components into the smallest reusable pieces. Think of components like LEGO blocks.

#### ✅ Good Example

```typescript
// components/ui/Button.tsx (atomic component)
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
}

export function Button({ children, variant = 'primary', onClick }: ButtonProps) {
  const baseClasses = "px-4 py-2 rounded-md transition-colors";
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900",
    ghost: "hover:bg-gray-100 text-gray-700"
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

```typescript
// components/StatCard.tsx (composed component using Button)
import { Button } from './ui/Button';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  onDetailsClick?: () => void;
}

export function StatCard({ title, value, icon, onDetailsClick }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">
          {title}
        </h3>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
        {value}
      </p>
      {onDetailsClick && (
        <Button variant="ghost" onClick={onDetailsClick}>
          View Details
        </Button>
      )}
    </div>
  );
}
```

#### ❌ Bad Example

```typescript
// components/StatCard.tsx (everything inline, not reusable)
export function StatCard({ title, value, icon, onDetailsClick }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3>{title}</h3>
      </div>
      <p>{value}</p>
      {/* ❌ Inline button - should be a reusable Button component */}
      <button 
        className="px-4 py-2 rounded-md hover:bg-gray-100 text-gray-700"
        onClick={onDetailsClick}
      >
        View Details
      </button>
    </div>
  );
}
```

### Component Structure

Follow this consistent structure in every component:

```typescript
'use client'; // Only if using hooks or browser APIs

import { useState, useEffect } from 'react';
import { SomeType } from '@/types';
import { Button } from './ui/Button';

// 1. Props interface (always named ComponentNameProps)
interface MyComponentProps {
  data: SomeType;
  onAction: (id: string) => void;
  isLoading?: boolean;
}

// 2. Component definition
export default function MyComponent({ 
  data, 
  onAction, 
  isLoading = false 
}: MyComponentProps) {
  // 3. State hooks
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  // 4. Effect hooks
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, [dependency]);
  
  // 5. Event handlers and helper functions
  const handleClick = (id: string) => {
    setSelectedItem(id);
    onAction(id);
  };
  
  const formatValue = (value: number) => {
    return value.toFixed(2);
  };
  
  // 6. Early returns for loading/error states
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (!data) {
    return <EmptyState />;
  }
  
  // 7. Main render
  return (
    <div className="container">
      <h2>{data.title}</h2>
      <Button onClick={() => handleClick(data.id)}>
        Action
      </Button>
    </div>
  );
}
```

### Single Responsibility Principle

Each component should do **ONE** thing well.

#### ✅ Good - Multiple focused components

```typescript
// ProjectTable.tsx - Only displays table
export default function ProjectTable({ projects }: Props) {
  return <table>...</table>;
}

// ProjectDetailsModal.tsx - Only shows modal with details
export default function ProjectDetailsModal({ projectId }: Props) {
  return <Modal>...</Modal>;
}

// ProjectRateForm.tsx - Only handles rate editing
export default function ProjectRateForm({ project }: Props) {
  return <form>...</form>;
}
```

#### ❌ Bad - One component doing everything

```typescript
// ProjectManager.tsx - Does too many things!
export default function ProjectManager() {
  // ❌ Table logic
  // ❌ Modal logic
  // ❌ Form logic
  // ❌ Data fetching
  // ❌ Validation
  // Result: 500+ line component that's hard to maintain
}
```

---

## 3. Backend Guidelines

### API Route Structure (Thin Handlers)

API routes should ONLY handle HTTP concerns. All business logic goes in services.

#### ✅ Good - Thin handler

```typescript
// app/api/stats/route.ts
import { NextResponse } from 'next/server';
import { DashboardStatsService } from '@/lib/services/dashboard-stats.service';
import { handleApiError } from '@/lib/utils/api-error';

const statsService = new DashboardStatsService();

export async function GET() {
  try {
    const stats = await statsService.calculateStats();
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch statistics');
  }
}

export const dynamic = 'force-dynamic';
```

**Why this is good:**
- Only 15 lines
- Clear responsibility: HTTP handling
- Business logic delegated to service
- Consistent error handling
- Easy to test

#### ❌ Bad - Fat handler with inline logic

```typescript
// app/api/stats/route.ts
export async function GET() {
  try {
    // ❌ 200 lines of business logic inline
    const client = getEverhourClient();
    const user = await client.getCurrentUser();
    const entries = await client.getTimeEntries(start, end, user.id);
    
    const projectsMap = new Map();
    entries.forEach((entry) => {
      const projectId = entry.task.projects?.[0];
      // ... 50 more lines of data processing
    });
    
    const dailyMap = new Map();
    entries.forEach((entry) => {
      // ... 50 more lines of aggregation
    });
    
    const totalHours = /* ... calculation ... */;
    const totalIncome = /* ... calculation ... */;
    
    return NextResponse.json({
      total_hours: totalHours,
      total_income: totalIncome,
      // ... more fields
    });
  } catch (error) {
    // ❌ Inconsistent error handling
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**Why this is bad:**
- 200+ lines in one function
- Mixes HTTP handling with business logic
- Hard to test
- Hard to reuse logic
- Inconsistent error handling
- Difficult to maintain

### Service Layer Pattern

Services contain business logic and are organized into classes with clear methods.

#### Structure

```typescript
// lib/services/dashboard-stats.service.ts
import { DashboardStats, ProjectStats, DailyStats } from '@/types';
import { getCurrentMonthRange } from '../utils/date';
import { fetchCurrentUserTimeEntries } from '../utils/everhour-utils';
import { getRatesMap, getDefaultRate } from '../utils/rates';
import { roundToTwoDecimals, secondsToHours } from '../utils/formatters';

export class DashboardStatsService {
  // Public method - main entry point
  async calculateStats(): Promise<DashboardStats> {
    const { startFormatted, endFormatted } = getCurrentMonthRange();
    
    const { entries } = await fetchCurrentUserTimeEntries(startFormatted, endFormatted);
    const projects = this.aggregateByProject(entries);
    const daily = this.aggregateByDay(entries);
    
    return {
      total_hours: this.calculateTotalHours(projects),
      total_income: this.calculateTotalIncome(projects),
      projects,
      daily_breakdown: daily,
    };
  }
  
  // Private methods - single responsibility helpers
  private aggregateByProject(entries: Entry[]): ProjectStats[] {
    // Only project aggregation logic
    // ...
  }
  
  private aggregateByDay(entries: Entry[]): DailyStats[] {
    // Only daily aggregation logic
    // ...
  }
  
  private calculateTotalHours(projects: ProjectStats[]): number {
    return projects.reduce((sum, p) => sum + p.hours, 0);
  }
  
  private calculateTotalIncome(projects: ProjectStats[]): number {
    return projects.reduce((sum, p) => sum + (p.income || 0), 0);
  }
}
```

**Key principles:**
- One public method per main operation
- Private methods for sub-operations
- Each method has single responsibility
- Uses utility functions for common operations
- Proper TypeScript typing

### Utility Functions

Create utilities for reusable, pure functions.

#### When to create a utility:

✅ **Create utility if:**
- Function is used in 2+ places
- Function is pure (no side effects)
- Function is general-purpose

❌ **Don't create utility if:**
- Only used once
- Component-specific logic
- Has side effects (API calls, state changes)

#### Example: formatters.ts

```typescript
// lib/utils/formatters.ts

export function formatHours(hours: number): string {
  return `${hours.toFixed(2)}h`;
}

export function formatCurrency(
  amount: number | null,
  currency: string = 'PLN'
): string {
  if (amount === null) return 'N/A';

  const currencyMap: Record<string, string> = {
    PLN: 'pl-PL',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
  };

  const locale = currencyMap[currency] || 'pl-PL';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}
```

**Why this is good:**
- Pure functions (predictable output)
- Well-named (self-documenting)
- Single responsibility per function
- Reusable across the application
- Easy to test

### Centralized Schemas

Keep Zod validation schemas in dedicated files, not inline in API routes.

#### ✅ Good - Centralized schema

```typescript
// lib/schemas/settings.ts
import { z } from 'zod';

export const SettingsSchema = z.object({
  default_hourly_rate: z.string().transform(val => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      throw new Error('Invalid hourly rate');
    }
    return val;
  }).optional(),
  currency: z.enum(['PLN', 'USD', 'EUR', 'GBP']).optional(),
  daily_hours_target: z.string().transform(val => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0 || num > 24) {
      throw new Error('Daily hours must be between 0 and 24');
    }
    return val;
  }).optional(),
});

export type SettingsInput = z.infer<typeof SettingsSchema>;
```

```typescript
// app/api/settings/route.ts (using the schema)
import { SettingsSchema } from '@/lib/schemas/settings';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SettingsSchema.parse(body); // ✅ Reusable schema
    // ... rest of logic
  } catch (error) {
    return handleApiError(error, 'Failed to update settings');
  }
}
```

#### ❌ Bad - Inline schema

```typescript
// app/api/settings/route.ts
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ❌ Inline schema - not reusable
    const schema = z.object({
      default_hourly_rate: z.string().transform(val => {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) {
          throw new Error('Invalid hourly rate');
        }
        return val;
      }).optional(),
      // ...
    });
    
    const validatedData = schema.parse(body);
    // ...
  } catch (error) {
    // ...
  }
}
```

---

## 4. Code Quality Principles

### DRY (Don't Repeat Yourself)

If you write the same code twice, extract it into a utility, service method, or component.

#### ❌ Before - Duplication

```typescript
// app/api/stats/route.ts
export async function GET() {
  const now = new Date();
  const start = format(startOfMonth(now), 'yyyy-MM-dd');
  const end = format(endOfMonth(now), 'yyyy-MM-dd');
  // ... use start and end
}

// app/api/project-details/[projectId]/route.ts
export async function GET() {
  const now = new Date();
  const start = format(startOfMonth(now), 'yyyy-MM-dd');
  const end = format(endOfMonth(now), 'yyyy-MM-dd');
  // ... use start and end
}

// ❌ Duplicated 4 lines of code!
```

#### ✅ After - Extracted utility

```typescript
// lib/utils/date.ts
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function getCurrentMonthRange() {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
    startFormatted: format(startOfMonth(now), 'yyyy-MM-dd'),
    endFormatted: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}
```

```typescript
// app/api/stats/route.ts
import { getCurrentMonthRange } from '@/lib/utils/date';

export async function GET() {
  const { startFormatted, endFormatted } = getCurrentMonthRange();
  // ✅ Reused utility - no duplication
}

// app/api/project-details/[projectId]/route.ts
import { getCurrentMonthRange } from '@/lib/utils/date';

export async function GET() {
  const { startFormatted, endFormatted } = getCurrentMonthRange();
  // ✅ Reused utility - no duplication
}
```

### Extract Common Patterns

Identify patterns that repeat across files and extract them.

#### Example: Error Handling

```typescript
// lib/utils/api-error.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

export function handleApiError(
  error: unknown, 
  defaultMessage: string, 
  status: number = 500
) {
  console.error('API Error:', error);

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation error', details: error.issues },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: defaultMessage, message: error.message },
      { status: status }
    );
  }

  return NextResponse.json(
    { error: defaultMessage, message: 'An unknown error occurred' },
    { status: status }
  );
}
```

**Used consistently everywhere:**

```typescript
// Every API route uses the same error handler
export async function GET() {
  try {
    // ...
  } catch (error) {
    return handleApiError(error, 'Failed to fetch data');
  }
}
```

### Type Safety

Always use strong TypeScript types.

#### ✅ Good typing

```typescript
// types/index.ts
export interface ProjectStats {
  project_id: string;
  project_name: string;
  hours: number;
  hourly_rate: number | null;
  income: number | null;
  percentage: number;
}

// Component with proper types
interface ProjectTableProps {
  projects: ProjectStats[];
  currency: string;
  onProjectClick: (projectId: string) => void;
}

export default function ProjectTable({ 
  projects, 
  currency, 
  onProjectClick 
}: ProjectTableProps) {
  // TypeScript catches errors at compile time
  return projects.map(project => (
    <tr key={project.project_id}>
      <td>{project.project_name}</td>
      <td>{project.hours}</td>
    </tr>
  ));
}
```

#### ❌ Bad typing

```typescript
// ❌ Using 'any' defeats the purpose of TypeScript
function ProjectTable({ projects, currency }: any) {
  // No type safety - runtime errors possible
  return projects.map((project: any) => (
    <tr key={project.id}> {/* Might not exist! */}
      <td>{project.name}</td> {/* Wrong property name */}
    </tr>
  ));
}
```

---

## 5. Examples & Patterns

### Pattern 1: Service + Utils + API Route

This is the most common pattern for backend features.

```typescript
// 1. Utils (lib/utils/formatters.ts) - Pure functions
export function formatHours(hours: number): string {
  return `${hours.toFixed(2)}h`;
}

export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}
```

```typescript
// 2. Service (lib/services/stats.service.ts) - Business logic
import { formatHours, secondsToHours } from '../utils/formatters';

export class StatsService {
  calculateProjectStats(entries: Entry[]): ProjectStats[] {
    const totalSeconds = this.sumSeconds(entries);
    const hours = secondsToHours(totalSeconds);
    
    return [{
      project_id: '123',
      hours: hours,
      formatted_hours: formatHours(hours), // Uses utility
    }];
  }
  
  private sumSeconds(entries: Entry[]): number {
    return entries.reduce((sum, e) => sum + e.time, 0);
  }
}
```

```typescript
// 3. API Route (app/api/stats/route.ts) - Thin handler
import { StatsService } from '@/lib/services/stats.service';
import { handleApiError } from '@/lib/utils/api-error';

const service = new StatsService();

export async function GET() {
  try {
    const stats = await service.calculateProjectStats();
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error, 'Failed to calculate stats');
  }
}

export const dynamic = 'force-dynamic';
```

### Pattern 2: Atomic UI Components

Build complex UIs from small, reusable pieces.

```typescript
// 1. Base atomic component (components/ui/Card.tsx)
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border bg-white dark:bg-slate-800 p-6 ${className}`}>
      {children}
    </div>
  );
}
```

```typescript
// 2. Composed component (components/StatCard.tsx)
import { Card } from './ui/Card';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number;
}

export function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm text-gray-600 dark:text-slate-400">{title}</h3>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {trend && (
        <p className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
          {trend > 0 ? '+' : ''}{trend}%
        </p>
      )}
    </Card>
  );
}
```

```typescript
// 3. Page uses composed components (app/page.tsx)
import { StatCard } from '@/components/StatCard';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard 
        title="Total Hours" 
        value="120h" 
        icon={<ClockIcon />}
        trend={5}
      />
      <StatCard 
        title="Total Income" 
        value="6,000 PLN" 
        icon={<DollarIcon />}
        trend={-2}
      />
    </div>
  );
}
```

### Pattern 3: Modal with Data Fetching

```typescript
// components/ProjectDetailsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { ProjectDetails } from '@/types';
import { toast } from 'sonner';

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function ProjectDetailsModal({ 
  isOpen, 
  onClose, 
  projectId 
}: ProjectDetailsModalProps) {
  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchDetails();
    }
    
    // ESC key handler
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, projectId, onClose]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/project-details/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Project Details</h2>
          <button onClick={onClose}>×</button>
        </div>
        
        {loading ? (
          <LoadingSkeleton />
        ) : details ? (
          <div>
            <p>Total Hours: {details.total_hours}</p>
            {/* More details */}
          </div>
        ) : (
          <p>No data available</p>
        )}
      </div>
    </div>
  );
}
```

---

## Quick Reference

### When to Create a Utility Function
- ✅ Used in 2+ places
- ✅ Pure function (no side effects)
- ✅ General-purpose helper
- ❌ Component-specific logic (keep in component)
- ❌ Single-use code

### When to Create a Service
- ✅ Complex business logic
- ✅ Data aggregation/calculation
- ✅ Orchestrating multiple operations
- ✅ Transforming API responses
- ❌ Simple CRUD (use db.ts directly)
- ❌ Single database query

### When to Create a Component
- ✅ Reusable UI element
- ✅ Complex piece of UI (50+ lines)
- ✅ Separates concerns
- ✅ Used in multiple places
- ❌ Single-use inline markup (<10 lines)

### File Organization Reference

```
app/api/[route]/route.ts     → HTTP handlers only (10-30 lines)
lib/services/                 → Business logic classes
  ├── *.service.ts           → Service classes with public + private methods
lib/utils/                    → Pure helper functions
  ├── formatters.ts          → Formatting functions
  ├── date.ts                → Date utilities
  ├── api-error.ts           → Error handling
lib/schemas/                  → Zod validation schemas
  ├── settings.ts            → Settings validation
  ├── project-rates.ts       → Project rates validation
components/ui/                → Atomic reusable components
  ├── Button.tsx
  ├── Card.tsx
  ├── Badge.tsx
components/                   → Feature-specific components
  ├── StatCard.tsx           → Uses ui/Card
  ├── ProjectTable.tsx
  ├── Charts.tsx
types/                        → TypeScript interfaces
  └── index.ts               → All type definitions
```

### Code Review Checklist

Before committing, ask yourself:

**Backend:**
- [ ] Is business logic in a service, not in the API route?
- [ ] Are utilities pure functions?
- [ ] Is error handling consistent (using `handleApiError`)?
- [ ] Are Zod schemas centralized?
- [ ] Is code DRY (no duplication)?

**Frontend:**
- [ ] Are components atomic and reusable?
- [ ] Does each component have a single responsibility?
- [ ] Are props properly typed?
- [ ] Is dark mode supported?
- [ ] Are helper functions extracted if used 2+ times?

**General:**
- [ ] Are all functions properly typed?
- [ ] Are variable names meaningful?
- [ ] Is the code self-documenting?
- [ ] Would this make sense to someone else reading it?

---

## Summary

Follow these principles for clean, maintainable code:

1. **Separate concerns** - API routes, services, utils, components each have their job
2. **Keep it DRY** - Extract duplicated code into utilities or methods
3. **Single responsibility** - Each function/class/component does ONE thing
4. **Atomic components** - Build complex UIs from small reusable pieces
5. **Type everything** - Use TypeScript and Zod for safety
6. **Consistent patterns** - Follow established patterns in the codebase

When in doubt, look at existing code:
- `DashboardStatsService` for service patterns
- `formatters.ts` for utility patterns
- `StatCard.tsx` for component patterns
- `app/api/stats/route.ts` for API route patterns

