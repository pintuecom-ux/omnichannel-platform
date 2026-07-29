# Audience Module v2.0 - Final Architecture (SDP 21 - 23)

## 1. Database Schema & Data Architecture (SDP 21)
The data layer has been completely transformed into a highly normalized, polymorphic, and tenant-isolated structure.

- **Identity Layer**: `contacts`, `contact_identities` (Multi-channel identity resolution)
- **Extensibility Layer**: `custom_field_definitions`, `custom_field_values` (EAV Pattern)
- **Container Layer**: `lists`, `list_memberships`, `tags`, `entity_tags` (Polymorphic tagging & static grouping)
- **Segmentation Layer**: `segments` (Storing AST filter trees in JSONB `condition_set`)
- **Governance Layer**: `contact_consents`, `import_jobs`, `export_jobs`, `contact_merges` (Async Jobs & Audit logs)
- **Event Layer**: `platform_events` (Unified timeline)
- **Enterprise Security**: `roles`, `role_permissions`, `workspace_members`, `audience_metrics_snapshots`

Every table strictly enforces Multi-Tenancy via `workspace_id` cascading from `auth.users` through Supabase Row Level Security (RLS).

## 2. Backend Architecture & Service Design (SDP 22)
The backend enforces an API-First strategy where Next.js Route Handlers act purely as a Gateway, delegating all domain logic to statically-typed TypeScript Services.

- **IdentityService.ts**: Handles deduplication and cross-channel identity mapping.
- **FieldRegistryService.ts**: Validates dynamic custom fields against type and regex boundaries.
- **SegmentService.ts**: Compiles the JSON Abstract Syntax Tree into PostgREST logic at runtime.
- **EventStoreService.ts**: Prevents "history fragmentation" by aggregating all module activities into a single timeline.
- **MergeService.ts**: Ensures reversible, non-destructive identity resolution.

## 3. Frontend Architecture & Design System (SDP 23)
The UI was built adhering to React Server Components (RSC) and Client Components boundaries.

- **Contact360 (SDP 05)**: A highly dense layout designed for Support & Sales to view the entire customer footprint at a glance. It integrates custom fields directly into the canvas.
- **ContactsGrid (SDP 06)**: An enterprise-grade table supporting infinite scrolling, dynamic field injection, and bulk actions.
- **State Management**: Zustand and React Context are utilized minimally, favoring Server Actions for mutations and Next.js caching for reads.
- **Design Language**: TailwindCSS paired with `shadcn/ui`, utilizing a highly polished grayscale palette with vibrant accents to ensure maximum readability for heavy operational use.

---
_Generated automatically upon completion of Phase 6._
