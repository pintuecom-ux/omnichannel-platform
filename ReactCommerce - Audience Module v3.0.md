# Cover Page

**Document Title**: ReactCommerce Audience Module Implementation Specification  
**Module Name**: Audience Module  
**Version**: 3.0.0  
**Status**: DRAFT  
**Document Owner**: Lead Product Architect & Principal Engineering Team  
**Last Updated**: 2026-07-30  
**Confidentiality**: CONFIDENTIAL - INTERNAL USE ONLY  
**Purpose**: To provide the definitive, single source of truth for the implementation of the ReactCommerce Audience Module. This document outlines the exact rules, standards, behavior, and technical requirements needed to construct a highly scalable, enterprise-grade identity and audience platform.  
**Intended Audience**: Product Managers, UX Designers, Frontend Engineers, Backend Engineers, QA Engineers, DevOps Engineers, and AI Coding Agents (Cursor, Claude Code, Gemini CLI, OpenHands, Windsurf, Codex, etc.).  
**Document Classification**: RESTRICTED IMPLEMENTATION SPECIFICATION  

---

# Version History

| Version | Date       | Author                | Changes Description                                                                                                    | Status |
| :------ | :--------- | :-------------------- | :--------------------------------------------------------------------------------------------------------------------- | :----- |
| 3.0.0   | 2026-07-30 | Principal Architecture | Initial generation of v3.0 Specification outlining foundational rules, standards, and global philosophies.              | DRAFT  |

---

# Table of Contents

1. Cover Page
2. Version History
3. Table of Contents
4. How To Read This Document
5. Document Standards
6. Global Design Philosophy
7. Audience Module Vision
8. Global Business Rules
9. Global Technical Rules
10. Global UX Principles
11. Global UI Standards
12. Global Validation Philosophy
13. Global Acceptance Criteria
14. SECTION 2 — Contacts Module
15. SECTION 3 — Enterprise Data Grid Framework
16. SECTION 4 — Contacts Page Implementation
17. SECTION 5 — Contact Details Implementation
18. SECTION 6 — Contact Lifecycle Engine
19. SECTION 7 — Platform Metadata & Custom Fields Engine
20. [Placeholder] Lists Module
21. [Placeholder] Segments Module
22. [Placeholder] API Contracts
23. [Placeholder] Database Schema

---

# How To Read This Document

**Purpose**  
This document MUST serve as the strict, unambiguous implementation manual for the Audience Module. It is NOT a user guide. If a system behavior is defined here, it MUST be implemented exactly as described. Any deviation REQUIRES an official specification update.

**Audience**  
This document is written for technical implementers and autonomous coding agents. It assumes comprehensive knowledge of React, modern distributed backend systems, and enterprise architecture.

**Conventions**  
- File references MUST use absolute paths or exact module imports.
- Data structures MUST be defined with explicit types.
- UI rules MUST be defined via behavior, state, and interaction instead of arbitrary CSS pixel values, unless strict spacing is mandated.

**Requirement Keywords**  
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted exactly as described in RFC-2119.

**Diagrams**  
Any future diagrams MUST be specified in Mermaid.js format to ensure they are machine-readable and renderable across standard enterprise tooling.

**Notes**  
Notes provide additional context but DO NOT constitute strict implementation rules. They serve as guidance for ambiguous edge cases.

**Warnings**  
Warnings highlight areas where deviations or incorrect implementation will cause systemic failure, security vulnerabilities, or severe performance degradation.

**Implementation Notes**  
Provide direct guidance on algorithms, library choices, or data structures that MUST or SHOULD be utilized.

**Acceptance Criteria**  
Strict, binary conditions that determine whether a feature is complete. If the Acceptance Criteria are not met, the feature SHALL NOT be merged.

**Future Extension Notes**  
Architectural foresight detailing how a component or schema will evolve. Implementers MUST ensure current code does not actively block these future extensions.

---

# Document Standards

**Writing Standards**  
All descriptions MUST be declarative, imperative, and unambiguous. Passive voice SHOULD NOT be used when assigning responsibility (e.g., "The API MUST validate the payload", not "The payload must be validated").

**Formatting Standards**  
- Emphasis MUST use bold `**text**`.
- Inline code, variable names, and database columns MUST use backticks `` `code` ``.

**Heading Rules**  
Headings MUST follow standard Markdown hierarchy. H1 (`#`) for major document sections, H2 (`##`) for major feature areas, H3 (`###`) for sub-features, H4 (`####`) for specific functions or behaviors.

**Requirement Rules**  
Every requirement MUST be independently testable. Do not combine multiple unrelated assertions into a single sentence.

**Table Rules**  
Tables MUST be used for enumerated values, state transition matrices, and attribute definitions. All tables MUST align correctly and include a header row.

**Diagram Rules**  
Diagrams SHALL be embedded as Mermaid blocks. Complex workflows MUST include state diagrams. Database relationships MUST use ER diagrams.

**Naming Rules**  
Naming MUST be exact. If this specification dictates `workspace_id`, the implementation MUST NOT use `workspaceId` in the database, nor `organization_id`.

**Terminology Rules**  
- **Contact**: A unique human or entity representation.
- **Workspace**: The tenant boundary.
- **List**: A static collection of Contacts.
- **Segment**: A dynamic, rule-based collection of Contacts.

**Versioning Rules**  
API routes MUST be versioned at the URI level (e.g., `/api/v3/contacts`). Database schemas MUST utilize migration scripts with sequential timestamps.

**Cross Referencing Rules**  
When referencing another section of this document, use standard markdown anchor links.

**Code Block Rules**  
Code blocks MUST specify the language (e.g., ````typescript ````). Snippets MUST be valid and syntactically correct.

**UI Reference Rules**  
UI components MUST reference the global design system component name (e.g., `<DataTable />`, `<Drawer />`).

**Database Naming Rules**  
- Tables: `snake_case`, plural (e.g., `contacts`, `custom_fields`).
- Columns: `snake_case`, singular (e.g., `first_name`, `created_at`).
- Join Tables: `table1_table2` in alphabetical order (e.g., `contact_tags`).

**API Naming Rules**  
RESTful APIs MUST use noun-based URIs, pluralized, with standard HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`).

**Component Naming Rules**  
React components MUST use `PascalCase`. Hooks MUST use `camelCase` prefixed with `use`. Utility functions MUST use `camelCase`.

---

# Global Design Philosophy

**Single Source of Truth**  
Identity data MUST NEVER be duplicated. All modules (Marketing, Sales, Support) MUST reference the unified Contact entity. Denormalization is ONLY permitted for performance caching and MUST be eventually consistent.

**Configuration over Custom Code**  
The platform MUST empower end-users to customize their experience without engineering intervention. Custom Fields, Dynamic Segments, and UI Layouts MUST be data-driven and stored in the database.

**Enterprise First**  
Every feature MUST assume it will be used by an organization with 1,000+ internal users and 10,000,000+ contacts. Workflows MUST handle massive concurrency, rate limits, and complex permission hierarchies from day one.

**Performance First**  
Sub-100ms response times for reads. Sub-300ms for writes. The frontend MUST utilize optimistic updates. The backend MUST utilize indexed views and Redis caching for aggregate queries.

**Accessibility First**  
The entire platform MUST conform to WCAG 2.1 AA standards. Keyboard navigation, ARIA labels, and screen reader support are NOT optional. They are critical acceptance criteria.

**Security First**  
Multi-tenant isolation is paramount. Every API request MUST validate the Workspace boundary. RLS (Row Level Security) MUST be enabled on all Postgres tables. No PII (Personally Identifiable Information) SHALL be transmitted unencrypted.

**Scalability First**  
The system MUST be horizontally scalable. Compute layers MUST be stateless. Background jobs MUST be handled via distributed queues.

**Predictability**  
System behavior MUST be deterministic. The same input MUST yield the same output. Error structures MUST be uniform globally.

**Consistency**  
UI patterns MUST be identical across the platform. A filter component in the Contacts view MUST behave exactly the same as a filter component in the Campaigns view.

**AI Native**  
The architecture MUST be designed to expose its state and capabilities to LLMs and autonomous agents. API schemas MUST be fully typed and exported as OpenAPI 3.1 specs to facilitate AI integrations.

**Low Cognitive Load**  
The interface MUST NOT overwhelm the user. Complexity MUST be managed via Progressive Disclosure.

**Minimal Click Philosophy**  
Common tasks MUST be achievable with the absolute minimum number of interactions. Bulk actions and powerful keyboard shortcuts MUST be standard.

**Progressive Disclosure**  
Advanced features SHALL be hidden until required. Primary interfaces MUST remain clean, with deep configuration options nested logically within secondary menus or configuration dialogs.

---

# Audience Module Vision

The Audience Module is the foundational bedrock of ReactCommerce. It exists because without a unified, universally accepted definition of a Customer (Contact), true omnichannel orchestration is impossible.

Every other module—whether it is Campaigns, Conversations, Orders, or Analytics—depends entirely on the Audience Module.

Customer identity SHALL NEVER be duplicated across silos. When an agent updates a Contact's phone number in the Inbox, that change MUST instantly reflect in the Marketing Segment evaluating that phone number.

- **Contacts** are the immutable atomic units of identity.
- **Lists** are intentional, static groupings of these units (e.g., "Event Attendees 2026").
- **Segments** are dynamic lenses filtering the total audience in real-time based on live rules (e.g., "Contacts who purchased X in the last 30 days").
- **Tags** are lightweight, rapidly assignable contextual labels.
- **Custom Fields** ensure the schema is infinitely extensible for any vertical industry.
- **Campaigns** (external to this module) execute actions based on the state of the Audience Module.

---

# Global Business Rules

- A Contact MUST belong to exactly one Workspace. Cross-workspace sharing of Contact data is STRICTLY PROHIBITED.
- Every Contact MUST have exactly one immutable primary identifier (UUID `id`).
- A Contact MUST have at least one valid external identifier (e.g., Email, Phone Number, or External CRM ID) upon creation to prevent ghost records.
- System Fields (e.g., `first_name`, `email`, `phone`) MUST NOT be deleted, renamed, or have their primitive data types altered.
- Deleting a Contact MUST be a soft-delete initially. Archived records MUST remain queryable for auditing but MUST be excluded from standard application views and segment evaluation.
- Hard deletion of Contacts MUST occur automatically after a 30-day retention period for GDPR compliance, stripping all PII but leaving an anonymous tombstone for relational integrity.
- Custom Fields belong solely to the Workspace. Workspace A CANNOT query or view Custom Fields from Workspace B.
- Segments ARE dynamic. Their membership MUST be evaluated at runtime or via highly responsive materialized views/event-driven triggers. They DO NOT store an array of contact IDs.
- Lists ARE static. They represent a specific snapshot in time or a manually curated group. They DO store associations to Contact IDs via a join table.
- Tags are simple label metadata. They SHALL NOT be used for complex access control.
- Workspace limits (e.g., max custom fields, max segments) MUST be enforced at the API layer based on the tenant's subscription tier.

---

# Global Technical Rules

**Performance Expectations**  
- Page loads MUST achieve a Time To Interactive (TTI) of < 1.5 seconds.
- Database queries for list views MUST execute in < 50ms.
- Complex Segment evaluation on < 1,000,000 contacts MUST resolve in < 2 seconds.

**Caching Philosophy**  
- Stale-while-revalidate MUST be the default UI caching strategy.
- Backend API responses for static resources MUST utilize Edge caching.
- Dynamic data (like Contact profiles) MUST rely on Redis for aggressive caching with targeted invalidation on write.

**Pagination Philosophy**  
- Offset-based pagination SHALL NOT be used for large datasets due to performance degradation at depth.
- Cursor-based pagination (keyset pagination) MUST be the global standard for all list views and API endpoints returning lists of entities.

**Virtual Scrolling Philosophy**  
- Any UI container displaying more than 100 rows or items MUST utilize virtual scrolling (windowing) to maintain DOM efficiency.

**Optimistic UI Philosophy**  
- Standard CRUD mutations MUST update the client-side cache immediately, assuming success.
- If the server request fails, the UI MUST transparently roll back to the previous state and present a non-blocking toast error to the user.

**Autosave Philosophy**  
- Complex forms (e.g., Segment Builders, Custom Field creation) MUST implement debounced autosaving to prevent data loss. Draft states MUST be supported.

**Search Philosophy**  
- Search MUST be global, fuzzy, and typo-tolerant.
- Dedicated search infrastructure (e.g., Elasticsearch, Typesense, or Postgres GIN indexes on `tsvector` columns) MUST be utilized. Wildcard `ILIKE '%query%'` is STRICTLY PROHIBITED for primary search endpoints.

**Filtering Philosophy**  
- Filtering MUST be composable (AND / OR logic).
- Filters MUST be serializable to the URL query string to ensure deep-linking and state sharing.

**Audit Philosophy**  
- Every state mutation (Create, Update, Delete) MUST log an audit trail containing: `timestamp`, `actor_id` (User or API Key), `action`, `entity_type`, `entity_id`, and a JSON diff of the `previous_state` and `new_state`.

**Permission Philosophy**  
- Role-Based Access Control (RBAC) MUST govern all endpoints.
- UI elements that the user lacks permission to interact with MUST be hidden or disabled with a clear explanation, depending on the UX context.

**Logging Philosophy**  
- Structured JSON logging MUST be used across the backend. Log levels (DEBUG, INFO, WARN, ERROR, FATAL) MUST be strictly adhered to.

**API Philosophy**  
- APIs MUST strictly adhere to REST principles or GraphQL specifications as defined by the underlying architecture. Payloads MUST be validated using schemas (e.g., Zod).

**Security Philosophy**  
- All endpoints MUST require authentication (JWT or Session).
- Input sanitization MUST occur on both client and server to prevent XSS and SQL Injection.
- Rate limiting MUST be enforced globally by IP and by Workspace.

**Error Handling Philosophy**  
- The backend MUST NEVER leak stack traces to the client.
- Standardized error envelopes MUST be returned: `{ "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [...] } }`.

**Localization Philosophy**  
- Hardcoded strings are STRICTLY PROHIBITED. All user-facing text MUST be routed through an i18n localization dictionary.

**Timezone Philosophy**  
- All dates and times MUST be stored in the database in UTC.
- Dates and times MUST be converted to the user's localized timezone explicitly in the presentation layer.

**Date Formatting Philosophy**  
- API payloads MUST use ISO 8601 strings (e.g., `2026-07-30T14:35:37Z`).
- UI presentation MUST respect the user's locale preferences (e.g., MM/DD/YYYY vs DD/MM/YYYY).

**Accessibility Philosophy**  
- ARIA roles MUST be explicitly defined for custom interactive components.
- Color contrast MUST meet AA standards (ratio of 4.5:1 for normal text).

---

# Global UX Principles

**Consistency**  
Interactions MUST be highly predictable. A primary call-to-action button MUST ALWAYS be located in the same relative position across all detail views.

**Discoverability**  
Advanced features MUST NOT interfere with the primary workflow, but their existence MUST be logically discoverable without relying on external documentation.

**Feedback**  
Every user action MUST result in immediate visual feedback. Button presses MUST show an active state. Asynchronous operations MUST show an intermediate loading state.

**Undo**  
Destructive actions SHOULD offer a short-window "Undo" toast (e.g., 5 seconds) rather than aggressively blocking the user with confirmation modals for low-stakes actions.

**Confirmation**  
High-stakes destructive actions (e.g., Bulk deleting a Segment, wiping Custom Fields) MUST require explicit user confirmation, often requiring them to type a confirmation phrase.

**Loading**  
Initial page loads MUST utilize Skeleton loaders matching the structure of the incoming data. Spinners SHALL ONLY be used for small, localized inline operations.

**Empty States**  
Empty states MUST NEVER be blank screens. They MUST contain an illustration, a clear explanation of what should be here, and a primary call-to-action to create the first entity.

**Error States**  
Errors MUST be actionable. Instead of "An error occurred", the UI MUST say "Could not save Contact because the email is invalid. [Correct Email]".

**Keyboard Navigation**  
The entire platform MUST be navigable via the `Tab` key. Focus rings MUST be visible. `Escape` MUST close any overlay, modal, or dropdown. `Enter` MUST submit the focused form.

**Context Menus**  
Right-click (context) menus MAY be implemented for power-user views (like Data Tables) but MUST NOT be the only way to access an action.

**Hover Behaviour**  
Hover states MUST provide a subtle visual elevation or color shift to indicate interactivity. Tooltips MUST appear on hover for any icon-only button.

**Responsive Behaviour**  
The Audience Module MUST be fully responsive down to 320px widths. Tables MUST convert to card lists or utilize horizontal scrolling on small viewports.

**Animations**  
Animations MUST be purposeful (e.g., guiding the eye to a new element) and fast (< 200ms). UI MUST respect `prefers-reduced-motion` OS settings.

**Transitions**  
Navigating between master lists and detail views SHOULD feel seamless, utilizing shared element transitions where architecturally feasible.

**Focus Management**  
When a modal opens, focus MUST be trapped within the modal. When it closes, focus MUST return to the element that triggered it.

**Touch Behaviour**  
Tap targets MUST be at least 44x44 CSS pixels. Swipe gestures MAY be implemented for mobile lists (e.g., swipe left to archive).

**Large Dataset Behaviour**  
The UI MUST NOT freeze when rendering large arrays. Virtualization is MANDATORY.

**Power User Behaviour**  
The system MUST support a global command palette (e.g., `Cmd+K`) allowing users to instantly jump to specific Contacts or run Audience actions without navigating menus.

---

# Global UI Standards

**Buttons**  
- MUST have explicitly defined Primary, Secondary, Outline, Ghost, and Danger variants.
- MUST support `isLoading` state which replaces the icon/text with a spinner and disables the button.

**Dropdowns**  
- MUST utilize Portals to escape DOM overflow constraints.
- MUST reposition themselves automatically (flip/shift) if they collide with the viewport edge.

**Tables**  
- MUST support resizable columns, reorderable columns, and pinnable columns.
- MUST display sticky headers during vertical scrolling.
- MUST support multi-select via checkboxes for bulk actions.

**Cards**  
- MUST have consistent padding, border radius (e.g., 8px), and subtle border or shadow styling to denote grouping.

**Panels**  
- Side panels MUST slide in from the right edge. They MUST contain a header with a close button, a scrollable body, and a sticky footer for actions.

**Dialogs**  
- Centered modals MUST be reserved for blocking workflows (Confirmations, focused data entry).
- MUST contain a semi-transparent backdrop blur.

**Drawers**  
- Used interchangeably with Panels for mobile form factors, sliding up from the bottom edge.

**Forms**  
- Labels MUST be placed directly above their respective inputs.
- Required fields MUST be denoted clearly.
- Validation errors MUST appear inline directly below the offending input.

**Inputs**  
- MUST have consistent height (e.g., 40px for standard size).
- MUST support clear icons (`x`) to instantly wipe the value.

**Filters**  
- Complex filters MUST utilize a Query Builder interface allowing nested AND/OR groups.

**Search**  
- Search inputs MUST be debounced by at least 300ms before firing API queries.

**Icons**  
- MUST utilize a unified SVG icon library (e.g., Lucide or Phosphor).
- Icon strokes MUST be consistent (e.g., 1.5px or 2px).

**Typography**  
- MUST use a highly legible, variable font (e.g., Inter, Roboto).
- Heading hierarchy MUST adhere to a strict modular scale.

**Spacing**  
- All padding and margins MUST be multiples of a base unit (e.g., 4px).
- Ad-hoc pixel values (e.g., `margin-top: 13px`) are STRICTLY PROHIBITED.

**Shadows**  
- Shadows MUST be utilized solely to convey elevation and z-index hierarchy, never for purely decorative flair.

**Borders**  
- Border colors MUST use subtle, low-contrast utility tokens to separate content gently.

**Radius**  
- Corner radii MUST be consistent. Form elements and buttons MUST share the same radius (e.g., 6px).

**Density**  
- The application MUST support at least two density modes: "Comfortable" (default) and "Compact" (for power users processing large lists).

**Loading Indicators**  
- Indeterminate linear progress bars SHOULD be placed at the top of the viewport for global navigation routing.

**Skeletons**  
- Skeletons MUST pulse subtly and match the exact dimensions of the delayed content to prevent Layout Shift.

**Pagination**  
- MUST indicate the current page, total pages, and total items (if known and inexpensive to compute).

**Badges**  
- MUST be used to indicate numerical counts or lightweight categorization.

**Tags**  
- MUST be dismissible (include an `x` icon) when used in filtering contexts.
- MUST support distinct color coding.

**Status Indicators**  
- MUST use universally recognized color semantics: Green (Success/Active), Yellow/Orange (Warning/Draft), Red (Danger/Error), Gray (Inactive/Archived).

---

# Global Validation Philosophy

**Client Side**  
The frontend MUST catch all syntax, formatting, and required-field errors BEFORE making a network request. This ensures a rapid feedback loop and reduces server load.

**Server Side**  
The backend MUST NOT trust the client. The backend MUST independently re-validate all incoming payloads. If server-side validation fails when client-side validation passed, it is considered a critical implementation bug.

**Optimistic Validation**  
Certain complex constraints (e.g., "Is this email already in use?") SHOULD be evaluated optimistically on the client if a cached ledger is available, but MUST be strictly enforced on the server.

**Blocking Validation**  
Errors that compromise data integrity (e.g., missing primary keys, invalid JSON schema in a custom field) MUST strictly block the save operation.

**Warnings**  
Non-critical issues (e.g., "This Contact is missing a phone number, which may affect Campaign delivery") SHOULD present a warning but MUST NOT block the save operation.

**Error Messages**  
Messages MUST be human-readable. "Value violates regex ^[A-Z]+$" is unacceptable. "First name must only contain uppercase letters" is REQUIRED.

**Duplicate Detection**  
The system MUST proactively detect duplicates during creation based on Email or Phone Number and prompt the user to merge or update the existing record rather than failing opaquely.

**Recovery**  
If validation fails after a long form submission, the user's data MUST NOT be lost. The form MUST remain populated with their input.

**Retry**  
Network failures during submission MUST trigger automated, exponential backoff retries for idempotent operations (e.g., PUT/PATCH). POST operations SHOULD be carefully retried with idempotency keys to prevent duplicate creation.

**Conflict Resolution**  
If a resource is modified by another actor while the current user is editing it (optimistic concurrency failure), the system MUST present a conflict resolution dialog showing the diff, rather than blindly overwriting data. (e.g., via `etag` or `version` matching).

---

# Global Acceptance Criteria

The Audience Module implementation SHALL ONLY be considered complete and ready for production deployment when ALL of the following conditions are met:

1. **Test Coverage**: The module possesses > 85% unit test coverage for backend business logic, and > 75% coverage for frontend components.
2. **E2E Testing**: Critical user journeys (Create Contact, Build Segment, Export List) are covered by automated end-to-end tests (e.g., Playwright or Cypress).
3. **Performance Target**: API read endpoints for lists resolve in < 100ms at the 95th percentile under simulated load of 1,000 requests per second.
4. **Security Audit**: Automated vulnerability scans report zero high or critical CVEs in dependencies. RLS policies have been manually verified to prevent cross-tenant data leakage.
5. **Accessibility Score**: Automated accessibility audits (e.g., Lighthouse or axe) report a score of 100 on all primary views.
6. **Documentation**: All API endpoints are fully documented via Swagger/OpenAPI, and all complex components are documented in Storybook.
7. **Resilience**: The system gracefully handles the failure of the caching layer (Redis) by falling back to direct database reads without crashing, albeit with degraded performance.
8. **Scale Target**: The database schema and indexing strategy have been successfully tested against a dummy dataset of 50,000,000 Contacts within a single Workspace without query timeouts.

---

# SECTION 2 — CONTACTS MODULE

## 2.1 Module Purpose

The Contacts module is the central repository of identity within ReactCommerce. It exists to provide a unified, 360-degree view of every individual that interacts with the platform.

**Business Objectives**  
- Eradicate data silos by ensuring all platform features reference a single identity ledger.
- Enable highly personalized marketing and sales motions based on complete interaction histories.
- Maintain strict compliance with global privacy regulations (GDPR, CCPA) through centralized consent and data management.

**User Objectives**  
- Allow agents, marketers, and administrators to quickly locate, view, and mutate customer records.
- Provide immediate context during real-time interactions (e.g., viewing an order history while on a support chat).

**Relationship with Campaigns**  
Campaigns MUST target Audience Segments or Lists, which are derived from the Contacts module. The Contacts module provides the email addresses, phone numbers, and personalization tokens (Custom Fields) required for Campaign execution.

**Relationship with Inbox**  
When an inbound message arrives in the Inbox, the system MUST resolve the sender's identifier (e.g., WhatsApp number) to a Contact in this module. Agents operating in the Inbox MUST view the Contact's profile alongside the conversation thread.

**Relationship with Orders**  
Order records MUST hold a foreign key to a Contact. A Contact's profile MUST aggregate their Lifetime Value (LTV) and Order History dynamically.

**Relationship with Workflows**  
Contacts are the primary entity passing through automated Workflows. Property changes on a Contact (e.g., `lead_score` > 50) MUST be capable of triggering Workflow execution.

**Relationship with Analytics**  
Analytics dashboards MUST derive cohort data, growth metrics, and demographic breakdowns from the Contacts module.

**Relationship with AI**  
AI agents embedded in the platform MUST have read access to the Contact's interaction history to provide highly contextual automated responses or next-best-action recommendations to human agents.

**Relationship with Lists and Segments**  
Contacts are the atomic units evaluated by Segments and curated into Lists. A Contact record MUST be capable of displaying all Lists and Segments it currently belongs to.

## 2.2 Navigation Hierarchy

The global navigation for the Audience Module MUST follow this exact hierarchy:

Audience
├── Dashboard
├── Contacts
├── Lists
├── Segments
├── Tags
├── Custom Fields
├── Imports
├── Exports
└── Settings

**Navigation Behaviour**  
Navigation MUST utilize client-side routing (e.g., Next.js `<Link>`) to prevent full page reloads.

**Active Navigation**  
The active route MUST be visually highlighted in the sidebar navigation using the primary brand color and a heavy font weight.

**Breadcrumbs**  
Breadcrumbs MUST be displayed at the top of detail views (e.g., `Audience > Contacts > John Doe`). Clicking a breadcrumb MUST navigate the user back to the respective list view while preserving the previous filter state.

**Deep Linking**  
Every specific view, including applied filters and pagination cursors, MUST be reflected in the URL. A user MUST be able to copy the URL of a highly filtered list and share it with a colleague, who will see the exact same view.

**Browser History Behaviour**  
Applying a filter or changing a page MUST push a new entry to the browser history (`history.pushState`). The user MUST be able to use the browser's Back button to undo a filter application.

**URL Behaviour**  
Query parameters MUST be used for state (e.g., `/contacts?page=2&status=active&sort=created_at:desc`).

**Refresh Behaviour**  
Refreshing the browser MUST perfectly reconstruct the UI state based on the URL query parameters.

**Direct URL Access**  
If a user lands directly on `/contacts/12345` without prior navigation, the application MUST fetch the necessary data and render the page correctly without relying on prior global state.

**Unauthorized Navigation**  
If a user attempts to navigate to a module they lack permission for, the system MUST intercept the routing and redirect them to a generic `403 Forbidden` page with a clear explanation.

**404 Handling**  
If a user navigates to `/contacts/invalid-id`, the system MUST render a `404 Not Found` state within the application layout, offering a button to return to the Contacts list.

**Deleted Resource Handling**  
If a user clicks a deep link to a Contact that has been soft-deleted, they MUST see a specific "This Contact has been archived" state, along with a "Restore" button if they possess the requisite permissions.

## 2.3 Contacts Landing Page

The Contacts Landing Page is the primary entry point. It MUST contain the following structural elements, ordered from top to bottom:

**Global Header**  
The standard application header containing Workspace selection, Global Search, and User Profile. It MUST remain persistent.

**Page Header**  
Contains the module title ("Contacts"), the total record count, and primary creation/import actions.

**Toolbar**  
A sticky sub-header containing Search, Saved Views, Filters, Column Selector, Density toggles, and Bulk Actions.

**Quick Actions**  
Contextual actions that appear conditionally when specific criteria are met (e.g., "Resume interrupted import").

**Search**  
A dedicated text input for fuzzy searching across indexed Contact fields.

**Filters**  
A complex query builder interface to narrow the dataset based on any standard or custom field.

**Saved Views**  
Tabs or a dropdown allowing users to quickly switch between frequently used filter combinations (e.g., "My Active Leads", "Recent Signups").

**Bulk Actions**  
A contextual bar that replaces the standard Toolbar when one or more rows are selected in the Primary Content Area.

**Primary Content Area**  
The main data grid (table) displaying the Contact records. This is the largest element on the page.

**Status Area**  
A small footer or toast region indicating sync status, background job progress (e.g., exports), or network connectivity.

**Pagination Area**  
Located directly below the Primary Content Area, controlling keyset pagination cursors and items-per-page selection.

**Floating Actions**  
On mobile viewports only, a Floating Action Button (FAB) for "Create Contact" MUST be positioned in the bottom right corner.

**Notifications**  
Global toast notifications MUST appear in the top-right or bottom-right corner, overlaying the content.

**Loading Indicators**  
A linear progress bar MUST appear at the top of the Page Header during background data fetching. The Primary Content Area MUST use Skeleton rows during initial load.

**Visibility & Permissions**  
The entire page MUST only be visible if the user has `audience:read` permissions. If they lack `audience:write`, all creation and mutation actions MUST be disabled.

**Responsive Behaviour**  
The Page Header and Toolbar MUST collapse into mobile-friendly patterns (e.g., hiding secondary buttons behind an Overflow Menu) on viewports < 768px.

## 2.4 Page Header

**Title**  
MUST read exactly "Contacts".

**Subtitle**  
(Optional) MAY display contextual information about the current view.

**Record Count**  
MUST display the total number of records matching the current filters (e.g., "1,234 Contacts"). If the count is expensive to compute, it MAY display "1,000+ Contacts" until explicitly requested.

**Refresh Action**  
An icon button (circular arrow) that forces a cache invalidation and re-fetches the current list.

**Create Contact Button**  
A primary prominent button. MUST trigger a slide-out Panel for rapid Contact creation.

**Import Button**  
A secondary button triggering the CSV/API import workflow.

**Export Button**  
A secondary button triggering a background job to export the current filtered view to CSV.

**Settings Shortcut**  
An icon button linking directly to Audience Settings.

**Overflow Menu**  
On small screens, the Import, Export, and Settings buttons MUST be consolidated into an overflow menu (vertical ellipsis icon).

**Permissions**  
- "Create Contact" requires `contact:create`.
- "Import" requires `contact:import`.
- "Export" requires `contact:export`.
Buttons for actions the user lacks permission for MUST be visible but visually disabled (grayed out).

**Loading State**  
During initial load, the Record Count MUST display a skeleton block.

**Disabled State**  
If the system is in offline mode, all mutation buttons MUST be disabled.

**Error State**  
If the list fails to load, the Record Count MUST display an error icon.

**Responsive Behaviour**  
On mobile, the "Create Contact" button MUST either shrink to an icon-only button or move to a FAB.

**Accessibility Behaviour**  
The header MUST be wrapped in a `<header>` tag. All buttons MUST have descriptive `aria-label`s.

**Keyboard Navigation**  
Focus MUST naturally flow from Title -> Refresh -> Export -> Import -> Create.

**Hover Behaviour**  
Secondary buttons MUST gain a subtle background highlight on hover.

**Tooltips**  
Icon-only buttons MUST display a tooltip on hover containing the exact action name (e.g., "Refresh list").

**Acceptance Criteria**  
- Header renders correctly on desktop and mobile.
- Record count accurately reflects the current filter state.
- Buttons enforce RBAC permissions correctly.

## 2.5 Toolbar

**Position**  
MUST be located immediately below the Page Header and immediately above the Primary Content Area.

**Priority**  
Search and Filters are highest priority and MUST remain visible on desktop.

**Visibility**  
The standard toolbar MUST be visible unless rows are selected, at which point it is completely replaced by the Bulk Actions toolbar.

**Saved Views**  
MUST allow the user to select predefined filters.

**Filters**  
MUST trigger a complex popover or panel to construct AND/OR rules.

**Column Selector**  
MUST allow the user to toggle visibility and reorder columns in the grid.

**Density**  
MUST allow toggling between Compact, Standard, and Comfortable padding inside the grid.

**More Actions**  
Secondary actions that do not fit in the main layout.

**Collapse Behaviour**  
When horizontal space is constrained, elements MUST collapse from right to left into a "More" dropdown, prioritizing Search and Filters as the last items to remain visible.

**Desktop Behaviour**  
All elements SHOULD be visible as individual buttons or inputs.

**Tablet Behaviour**  
Text labels MAY be removed from secondary buttons, leaving only icons.

**Mobile Behaviour**  
The entire toolbar MUST collapse into a single "Search & Filter" button that opens a full-screen mobile modal.

**Touch Behaviour**  
All interactive elements MUST have a minimum hit area of 44x44px.

**Keyboard Behaviour**  
The user MUST be able to tab through every toolbar element.

**Loading Behaviour**  
Toolbar inputs SHOULD remain active during background fetches, but rapid successive changes MUST be debounced.

**Disabled Behaviour**  
If the data grid fails to load, filtering and sorting actions MUST be disabled.

**Permission Rules**  
Users lacking `contact:export` MUST NOT see the export option in the More Actions menu.

**Acceptance Criteria**  
- Bulk Actions toolbar appears instantly when a row is selected.
- Toolbar layout adapts cleanly across breakpoints without layout shift.
- Column selections are persisted to user preferences.

## 2.6 Search Experience

**Search Scope**  
Search MUST execute against `first_name`, `last_name`, `email`, `phone`, and `company` fields simultaneously.

**Default Behaviour**  
Search MUST be a partial, case-insensitive match (fuzzy).

**Placeholder**  
MUST read "Search contacts by name, email, or phone...".

**Search Delay**  
The system MUST NOT block typing.

**Instant Search**  
If the dataset is fully cached client-side, search MUST resolve instantly.

**Debouncing**  
Network-bound searches MUST be debounced by exactly 300ms.

**Search History**  
Clicking the empty search input SHOULD display the last 5 executed searches.

**Recent Searches**  
Users MUST be able to click a recent search to re-execute it instantly.

**Search Suggestions**  
As the user types, the UI MAY offer suggestions (e.g., "Search for exact email: x@y.com").

**Highlighting**  
The data grid MUST NOT attempt to inject HTML highlighting tags into the results, to prevent XSS. Highlighting is restricted to typeahead dropdowns if implemented.

**Keyboard Navigation**  
Pressing `/` anywhere on the page MUST focus the search input.

**Escape Behaviour**  
Pressing `Escape` while focused MUST clear the input and blur focus.

**Clear Button**  
An `x` icon MUST appear when the input has length > 0. Clicking it MUST clear the input and trigger a reset fetch.

**Empty Results**  
Searching for a non-existent value MUST yield a specific "No results found for [query]" empty state.

**Search Errors**  
If the search API times out, a toast error MUST appear.

**Search Performance Expectations**  
Search queries MUST resolve in < 150ms on the backend.

**Accessibility**  
The input MUST have `role="searchbox"` and an appropriate `aria-label`.

**Acceptance Criteria**  
- `Cmd+K` or `/` focuses the search input.
- Typing rapidly fires only one API request after 300ms of inactivity.
- Clearing the search restores the previous filter state.

## 2.7 Page Actions

**Create Contact**  
- **Visibility**: Always visible in Page Header.
- **Permissions**: Requires `contact:create`.
- **Confirmation**: N/A. Opens a Panel.
- **Audit Logging**: MUST log `contact.created`.

**Import Contacts**  
- **Visibility**: Always visible in Page Header.
- **Permissions**: Requires `contact:import`.
- **Background Processing**: MUST run asynchronously via a worker queue.
- **Notifications**: MUST dispatch an in-app notification upon completion.

**Export Contacts**  
- **Visibility**: Always visible in Page Header.
- **Permissions**: Requires `contact:export`.
- **Background Processing**: Exports > 1,000 rows MUST run asynchronously and email a secure download link.

**Bulk Edit**  
- **Visibility**: Only visible in Bulk Actions Toolbar when rows are selected.
- **Permissions**: Requires `contact:update`.
- **Partial Failures**: If bulk editing 50 contacts fails on 2, the system MUST commit the 48 successes and present a detailed error report for the 2 failures.

**Bulk Delete**  
- **Visibility**: Only visible in Bulk Actions Toolbar when rows are selected.
- **Permissions**: Requires `contact:delete`.
- **Confirmation**: MUST require the user to type "DELETE [N] CONTACTS" in a strict confirmation modal.
- **Audit Logging**: MUST log `contact.deleted` for every affected ID.

**Add Tags**  
- **Visibility**: Only visible in Bulk Actions Toolbar.
- **Undo**: MUST offer a 5-second "Undo" toast.

**Merge Contacts**  
- **Visibility**: Only visible when exactly TWO contacts are selected.
- **Permissions**: Requires `contact:update` and `contact:delete`.
- **Confirmation**: MUST open a complex modal allowing the user to select which fields survive the merge (Master Record Selection).

**Acceptance Criteria**  
- All page actions respect RBAC strictly.
- Destructive actions enforce explicit confirmation.
- Long-running actions (Imports/Exports) do not block the UI thread.

## 2.8 Page States

**Initial Load**  
- **UI Behaviour**: Page layout renders instantly. Primary Content Area displays 10 Skeleton rows.

**Loading**  
- **UI Behaviour**: When changing filters, the existing grid data MUST fade slightly (opacity: 0.7), and a top linear progress bar MUST activate.

**Refreshing**  
- **UI Behaviour**: The manual refresh button MUST spin until the network request completes.

**No Contacts**  
- **UI Behaviour**: Occurs when the Workspace is entirely empty. Displays an illustration and a prominent "Create your first Contact" CTA.

**No Search Results**  
- **UI Behaviour**: Occurs when a query yields zero rows. Displays a "No matches found" message with a button to "Clear all filters and search".

**No Permission**  
- **UI Behaviour**: User navigated here but lacks `audience:read`. Displays a lock illustration and "You do not have access to view Contacts."

**Offline**  
- **UI Behaviour**: Display a warning toast: "You are currently offline. Changes will be saved locally and synced when connection is restored."
- **User Actions**: Read actions allowed (from cache). Mutations queued locally.

**Server Error**  
- **UI Behaviour**: API returns 500. Display a critical error state replacing the grid: "Unable to load contacts. Our team has been notified."
- **Recovery**: Provide a "Retry" button.

**Large Dataset**  
- **UI Behaviour**: Scrolling rapidly through 50,000 rows MUST NOT stutter. The grid MUST virtualize DOM nodes.

**Acceptance Criteria**  
- All states are visually distinct.
- Error states provide actionable recovery paths.
- Skeletons prevent layout shift.

## 2.9 Responsive Behaviour

**Desktop ( > 1024px)**  
- Sidebar navigation is pinned.
- All Toolbar elements are visible.
- Data grid displays maximum configured columns.

**Tablet ( 768px - 1024px)**  
- Sidebar navigation MAY collapse to icons.
- Toolbar collapses text labels for secondary buttons.

**Mobile ( < 768px)**  
- Data Grid MUST convert to a stacked Card layout. Horizontal scrolling of a massive table on mobile is UNACCEPTABLE.
- Page Header actions collapse into an Overflow Menu.
- Create Contact becomes a FAB.

**Ultra-wide Displays ( > 1440px)**  
- The application container MUST expand to fill available space, exposing more columns rather than creating vast empty margins.

**Performance Expectations**  
Responsive layout shifts MUST be handled via CSS Media Queries to ensure 0ms JS layout calculation overhead.

## 2.10 Accessibility Requirements

**Keyboard Navigation**  
- Every interactive element (button, input, row, cell) MUST be reachable via the `Tab` key.
- The `Enter` or `Space` key MUST activate the focused element.

**Focus Behaviour**  
- A highly visible focus ring (e.g., 2px solid primary color with 2px offset) MUST be present when navigating via keyboard. It MAY be hidden for mouse interactions via `:focus-visible`.

**Screen Readers**  
- The data grid MUST define `role="grid"`, `role="row"`, and `role="gridcell"`.
- Action buttons MUST have `aria-label`s.

**Contrast**  
- All text MUST meet WCAG 2.1 AA contrast ratios (4.5:1 against backgrounds).

**Acceptance Criteria**  
- No accessibility violations reported by automated tools (axe-core).
- Application is fully operable without a mouse.

## 2.11 Performance Expectations

**First Load**  
- The HTML shell MUST render in < 500ms.
- Initial data hydration MUST complete in < 1.5s (95th percentile).

**Subsequent Loads**  
- Navigating away from Contacts and back MUST render instantly (< 100ms) using cached data, triggering a background revalidation.

**Search Response**  
- API response for search MUST be < 150ms.

**Render Performance**  
- The UI MUST maintain 60 FPS while scrolling a virtualized list of 10,000 items.

**Memory Usage**  
- The Contacts view MUST NOT exceed 100MB of heap allocation in the browser to prevent crashes on low-end devices.

## 2.12 Design Decisions

**Why Virtualization?**  
Enterprise customers frequently maintain hundreds of thousands of contacts. Traditional DOM rendering of even 1,000 rows causes severe main-thread blocking, leading to unresponsive interfaces. Virtualization ensures only the visible ~30 nodes exist in the DOM.

**Why Keyset Pagination over Offset Pagination?**  
Offset pagination (`LIMIT 50 OFFSET 10000`) becomes exponentially slower as the offset grows, requiring the database to scan and discard rows. Keyset pagination (`WHERE id > last_seen_id LIMIT 50`) leverages indexes directly, providing constant O(1) performance regardless of depth.

**Why Debounce Search at 300ms?**  
Immediate dispatch on every keystroke overwhelms the backend and causes race conditions where an earlier request resolves after a later one. 300ms is the optimal threshold that feels "instant" to a human while reliably capturing the end of a rapid typing burst.

**Why Card Layout on Mobile?**  
Horizontal scrolling on touch devices requires complex two-finger gestures or awkward thumb reaching. Converting a row into a stacked vertical card ensures all data is accessible via natural vertical scrolling.

**Why Optimistic Updates?**  
Enterprise users expect desktop-class responsiveness. Waiting 300ms for a network round-trip to mark a checkbox is unacceptable. Assuming success and managing rollbacks internally provides a frictionless experience.

---

# SECTION 3 — ENTERPRISE DATA GRID FRAMEWORK

## 3.1 Purpose

**Why a unified enterprise data grid exists**  
ReactCommerce requires a single, universally implemented Enterprise Data Grid Framework. Rather than building distinct tables for Contacts, Orders, Campaigns, and Tickets, a unified grid guarantees predictable behavior and consolidates performance optimizations into a single codebase.

**Business Goals**  
- Reduce time-to-market for new modules by reusing advanced table infrastructure.
- Deliver a world-class, seamless user experience that feels identical across the entire platform.

**User Goals**  
- Ensure muscle memory transfers across modules: a user who knows how to filter Contacts immediately knows how to filter Orders.
- Provide power-user capabilities (e.g., bulk actions, complex filtering, multi-sort) out-of-the-box everywhere.

**Engineering Goals**  
- Maintain a single source of truth for grid rendering, virtualization, and accessibility logic.
- Eradicate duplicated component states.

**Scalability Goals**  
- The grid MUST effortlessly handle rendering datasets ranging from 10 records to 10,000,000+ records via keyset pagination and DOM virtualization without main-thread blocking.

**Performance Goals**  
- Scrolling MUST maintain 60 FPS.
- DOM node count MUST remain constant regardless of dataset size.

**Accessibility Goals**  
- A single grid component means keyboard navigation, ARIA labeling, and screen-reader support only needs to be perfected once.

**Consistency Goals**  
- Visual density, typography, and interaction patterns MUST be globally identical.

**Future Extensibility**  
- As AI features or real-time websocket updates are introduced, applying them to the core grid framework instantly upgrades all modules platform-wide.

## 3.2 Grid Layout

The Enterprise Data Grid MUST be structured with the following explicit components:

**Header Row**  
The top boundary of the grid. It MUST remain sticky during vertical scroll.

**Column Headers**  
Individual cells within the Header Row. They MUST display the column name and contain interactive elements for sorting and filtering.

**Rows**  
Individual records. They MUST alternate subtle background colors (zebra striping) if specified by the active theme, and MUST display a hover state.

**Cells**  
The atomic units of data. They MUST handle text truncation via ellipsis and offer tooltip expansion for overflowing content.

**Checkbox Column**  
Always the first column (unless hidden by permissions). It MUST contain a master checkbox in the header and individual checkboxes in the rows for selection.

**Avatar Column**  
(Optional) A standardized column used for visual identification (e.g., Contact Avatar or Product Image).

**Frozen Columns**  
Columns explicitly locked to the left or right edges of the viewport. They MUST NOT move during horizontal scrolling.

**Scrollable Columns**  
The primary data columns that scroll horizontally between frozen boundaries.

**Action Column**  
Usually pinned to the far right. Contains row-level quick actions and an overflow menu (`...`).

**Footer**  
The bottom boundary of the grid. Contains aggregation summaries (if applicable).

**Pagination**  
Located below the Footer or integrated into it. Contains cursor controls (Next/Previous) and row-count selectors.

**Horizontal Scroll**  
A persistent scrollbar (on desktop) allowing navigation across overflowing columns.

**Vertical Scroll**  
A persistent scrollbar allowing navigation across rows. The scrollbar MUST reflect the virtual height of the dataset if infinite scrolling is used.

**Sticky Header & Footer**  
The Header Row and Footer MUST remain visible in the viewport at all times while the grid is in view.

**Sticky First Column**  
By default, the Checkbox Column and primary identifier (e.g., Contact Name) MUST be frozen to the left.

**Empty Area**  
If the grid contains fewer rows than the viewport height, the remaining space MUST render as empty filler without drawing phantom row borders.

**Loading Overlay**  
A semi-transparent overlay with a spinner that appears over the grid body during blocking network requests.

**Selection Overlay**  
A state applied to the grid when rows are selected, typically changing the row background color (e.g., subtle blue).

## 3.3 Grid Behaviour

**Initial Rendering**  
The grid MUST render Skeleton rows matching the exact geometry of the configured columns to prevent Layout Shift.

**Loading**  
Background updates (e.g., applying a new filter) MUST fade the current grid opacity to 70% and display a linear indeterminate progress bar attached to the top of the grid.

**Refreshing**  
Manual refresh MUST trigger the Loading state but preserve scroll position.

**Virtual Rendering**  
The grid MUST implement DOM virtualization (windowing). It SHALL ONLY render the visible rows plus an overscan margin of 5 rows above and below the viewport.

**Horizontal Scrolling**  
MUST be buttery smooth. Frozen columns MUST cast a subtle drop shadow over scrolled columns to indicate depth.

**Vertical Scrolling**  
MUST maintain 60 FPS. If scrolling outpaces network requests (in infinite load scenarios), empty rows MUST render as Skeletons until data arrives.

**Lazy Rendering**  
Complex cell components (like rich interactive badges or inline charts) MUST lazy-load their execution until they enter the viewport.

**Cell Rendering**  
Cells MUST NOT mount heavy interactive components (like DatePickers) until explicitly focused or clicked. Default display MUST be plain text or lightweight HTML.

**Row Rendering**  
Rows MUST possess a deterministic height by default to facilitate virtualization math. Variable row heights MAY be supported but require a resize observer.

**Large Dataset Behaviour**  
Scrolling the thumb rapidly to the bottom of a 1,000,000 row list MUST NOT crash the browser. 

**Memory Optimisation**  
The grid MUST aggressively garbage collect detached DOM nodes.

**Row Recycling**  
Instead of destroying and recreating DOM nodes during scroll, the grid SHOULD recycle existing nodes by mutating their internal data attributes.

**Scroll Restoration**  
Navigating away from the grid and returning via the Back button MUST instantly restore the exact vertical and horizontal scroll positions.

**Refresh Behaviour**  
A hard browser refresh (`F5`) MUST reload the exact view by parsing URL state.

**Back/Forward Navigation**  
Browser history navigation MUST sequentially undo or redo filter, sort, and pagination state without forcing a full page reload.

**Deep Links**  
The entire state vector (Filters, Sort, Page Cursor, Selected Columns) MUST be encoded in the URL to allow sharing exact views.

## 3.4 Column Framework

**Column Types**  
The grid MUST support strongly-typed columns. 

**System Columns**  
Hardcoded entities (e.g., `id`, `created_at`). They MUST NOT be deleted.

**Custom Columns**  
User-defined attributes (e.g., `loyalty_tier`). They behave identically to System Columns but can be managed dynamically.

**Computed Columns**  
Columns derived at runtime (e.g., `Full Name` derived from `first_name` + `last_name`). They MAY NOT be sortable if they cannot be computed efficiently on the database level.

**Hidden Columns**  
Columns present in the schema but removed from the active view by the user.

**Frozen Columns**  
Locked to the horizontal edges. 

**Pinned Columns**  
Synonymous with Frozen Columns.

**Resizable Columns**  
Users MUST be able to click and drag column dividers to adjust width.

**Sortable Columns**  
Columns backed by database indexes SHOULD be sortable. Unindexed or computed columns MUST explicitly disable sorting.

**Filterable Columns**  
Columns that support query builder operations.

**Searchable Columns**  
Columns included in the global text search index.

**Exportable Columns**  
Columns that will be included when generating a CSV. By default, all visible columns are exportable.

**Importable Columns**  
Columns that can be mapped during a CSV import. Computed columns are explicitly NOT importable.

**Editable Columns**  
Columns supporting inline double-click editing.

**Read-only Columns**  
Columns that can never be edited (e.g., `created_at`, `id`).

**System Protected Columns**  
Critical columns that cannot be hidden by the user (e.g., the primary identifier checkbox).

**Lifecycle**  
Columns are registered via a configuration object. Their state (width, visibility, order) is continually synchronized with local storage or backend user preferences.

## 3.5 Column Visibility

The Column Selector is a popover interface triggered from the Toolbar.

**Opening behaviour**  
MUST open instantly without a network request.

**Closing behaviour**  
MUST close on outside click or `Escape`. MUST instantly apply changes.

**Search**  
The selector MUST contain a search input to quickly find columns in massive schemas.

**Grouping**  
Columns in the selector MUST be grouped logically (e.g., "Contact Information", "Custom Fields", "System").

**System Fields vs Custom Fields**  
Clearly demarcated in the UI.

**Checkboxes**  
Each column name is preceded by a checkbox to toggle visibility.

**Maximum visible columns**  
The grid MAY warn the user if they select > 50 columns, advising of potential performance degradation, but MUST NOT block them.

**Minimum visible columns**  
At least 1 data column (excluding the checkbox column) MUST be visible at all times.

**Hidden columns**  
Unchecked columns are immediately removed from the grid DOM.

**Permissions**  
If a user lacks read access to a specific field (e.g., `SSN`), it MUST NOT appear in the Column Selector.

**Archived custom fields**  
Archived fields MUST NOT appear in the selector unless an "Include Archived" toggle is activated.

**Field badges**  
New or specific data-type fields (e.g., `Formula`) MAY display a small badge next to their name.

**Required fields**  
Fields required for basic grid interaction (e.g., `Name`) MUST have their checkboxes disabled and locked to `checked`.

**Search within selector**  
Fuzzy search highlighting matching text.

**Sorting within selector**  
Columns in the selector list SHOULD default to alphabetical sort within their groups.

**Recently used**  
A dedicated group at the top MAY show the 5 most frequently toggled columns.

**Reset / Restore defaults**  
A button MUST exist to revert visibility and order to the System Default view.

**Persistence**  
Changes MUST automatically save to the user's active view preference.

**Saved Views integration**  
If a user modifies columns on a Saved View, they MUST be prompted to "Save Changes to View" or "Save as New View".

**Workspace defaults**  
Administrators MUST be able to define a default column layout for all new users.

**User defaults**  
Individual users' column preferences MUST override Workspace defaults.

**Accessibility**  
The list MUST be fully keyboard navigable (`Arrow Up/Down` to traverse, `Space` to toggle).

**Touch behaviour**  
Hit areas in the selector MUST be 44px minimum height.

**Edge cases**  
If a visible column is deleted by an admin while a user is viewing it, the grid MUST gracefully remove it on the next refresh without throwing a fatal error.

**Acceptance criteria**  
- Column toggles reflect instantly in the grid.
- Preferences persist across hard refreshes.

## 3.6 Column Reordering

**Drag & Drop**  
Users MUST be able to click and hold a column header to drag it horizontally. 

**Keyboard reordering**  
Users MUST be able to focus a header, press a modifier key (e.g., `Shift + Alt + Arrow Right`), and move the column.

**Pinned columns**  
Pinned columns CANNOT be dragged into the scrollable area, nor can scrollable columns be dragged into the pinned area via standard drag-and-drop; they require explicit pinning actions.

**Frozen columns**  
Same as Pinned.

**Restrictions**  
The Checkbox column MUST ALWAYS remain at index 0 and cannot be reordered.

**Animations**  
Reordering MUST utilize smooth CSS transforms (e.g., FLIP animation technique) to show columns shifting out of the way.

**Persistence**  
The new order MUST save automatically to the active view state.

**Undo**  
Not required for reordering, users can just drag it back.

**Reset**  
"Restore defaults" MUST reset column order.

**Permissions**  
Any user who can view the grid can reorder columns for their own view.

**Acceptance criteria**  
- Dragging a column works seamlessly across all modern browsers.
- Order persists in URL/Local State.

## 3.7 Column Width

**Minimum width**  
Every column MUST have a defined minimum width (e.g., `60px`) to prevent it from becoming unclickable.

**Maximum width**  
Columns MAY have a maximum width (e.g., `800px`) to prevent accidental massive resizing.

**Auto width**  
When the grid is less wide than the viewport, columns MAY use `flex-grow` to distribute empty space.

**Double-click resize**  
Double-clicking the resize handle (divider) MUST automatically adjust the column width to fit the longest visible content in that column.

**Content-based resize**  
Grid MAY automatically size columns based on initial payload data if no user preference exists.

**Manual resize**  
Clicking and dragging the divider MUST resize the column in real-time.

**Reset width**  
Available via Column Header context menu: "Reset Width".

**Persistence**  
Custom widths MUST be saved to the user's view preferences.

**Performance**  
Resizing MUST NOT trigger full React re-renders of all cells. It MUST manipulate CSS custom properties (variables) or colgroup dimensions directly.

**Edge cases**  
If resizing causes all columns to exceed viewport width, horizontal scrolling MUST activate seamlessly.

**Acceptance criteria**  
- Resizing is smooth and lag-free at 60FPS.
- Double-click correctly calculates max content width.

## 3.8 Column Freezing

**Freeze Left**  
Users MUST be able to pin a column to the left via the Header Context Menu. 

**Freeze Right**  
Users MUST be able to pin the Action column to the right.

**Unfreeze**  
Available via the Context Menu.

**Maximum frozen columns**  
The system MUST prevent freezing columns if the total frozen width exceeds 60% of the active viewport width, presenting a warning toast.

**Behaviour during scrolling**  
Frozen columns MUST remain completely static while horizontal scroll occurs. They MUST have a higher `z-index`.

**Interaction with hidden columns**  
Hiding a frozen column MUST retain its frozen status if unhidden later.

**Interaction with grouping & sorting**  
Freezing DOES NOT affect sorting or grouping logic.

**Persistence**  
Frozen state MUST persist to the view definition.

**Acceptance criteria**  
- Scrolling horizontally does not tear or lag frozen boundaries.
- Drop shadows dynamically appear when scroll offset > 0.

## 3.9 Sorting

**Single sort**  
Clicking a column header MUST sort the data by that column ascending. Clicking again MUST sort descending. Clicking a third time MUST remove the sort.

**Multi sort**  
Holding `Shift` while clicking headers MUST allow sorting by multiple columns sequentially (e.g., Sort by `Company` ASC, then `Last Name` ASC).

**Sort priority**  
Headers MUST display a numeric badge indicating sort priority (e.g., `1` next to Company, `2` next to Last Name) when multi-sorting.

**Ascending / Descending**  
Indicated by explicit up/down arrow icons in the header.

**Remove sort**  
Available via third click or Context Menu.

**Keyboard support**  
Focusing header and pressing `Enter` MUST toggle sort.

**Accessibility**  
Headers MUST have `aria-sort` attributes (`ascending`, `descending`, `none`).

**Persistence**  
Sort configuration MUST be serialized into the URL (e.g., `?sort=company:asc,last_name:desc`).

**Performance**  
Sorting MUST be delegated to the database backend. Client-side sorting is STRICTLY PROHIBITED for paginated views.

**Large datasets**  
Backend MUST utilize database indexes for sortable columns. Unindexed sorting on 10,000,000 rows will timeout and is a severe architectural failure.

**API behaviour**  
The grid MUST dispatch a new fetch request immediately upon sort change.

**Acceptance criteria**  
- Multi-sort resolves correctly on the backend.
- UI explicitly reflects active sort states.

## 3.10 Column Filters

Every column header MUST expose a hover action (filter icon).

**Hover delay**  
Filter icon MUST appear instantly on hover.

**Icon visibility**  
If a filter is actively applied to a column, the filter icon MUST remain persistently visible (active state), regardless of hover.

**Context menu vs Filter menu**  
Clicking the filter icon MUST open a Filter Popover. Clicking the column name MAY open a generic Context Menu.

**Quick filters**  
The popover MUST present quick options (e.g., "Is Empty", "Is Not Empty").

**Advanced filters**  
The popover MUST allow manual entry of constraints.

**Data type aware filters**  
The UI MUST change based on the column's underlying data type.

**Supported Operators**  

- **Text**: `Equals`, `Not Equals`, `Contains`, `Does Not Contain`, `Starts With`, `Ends With`, `Is Empty`, `Is Not Empty`.
- **Number / Currency / Percentage**: `Equals`, `Not Equals`, `Greater Than`, `Less Than`, `Greater Than or Equal`, `Less Than or Equal`, `Between`, `Is Empty`, `Is Not Empty`.
- **Boolean**: `Is True`, `Is False`, `Is Empty`.
- **Dropdown / Multi-select**: `Is Any Of` (In), `Is None Of` (Not In), `Is Empty`, `Is Not Empty`.
- **Date / DateTime / Time**: `Is Exactly`, `Is Before`, `Is After`, `Is Between`, `Is Empty`, `Is Not Empty`. 
  - **Relative Dates**: `Today`, `Yesterday`, `This Week`, `Last Week`, `This Month`, `Last Month`, `Past X Days`, `Next X Days`.
- **Email / Phone**: Same as Text, but with strict client-side syntax validation.
- **Location**: `Within X radius of [City/Zip]`.
- **User (Owner)**: Maps to Dropdown (List of active Workspace users).
- **Tags**: `Has All Of`, `Has Any Of`, `Has None Of`.
- **Lists / Segments**: `Is Member Of`, `Is Not Member Of`.
- **AI Score / Risk Score**: Maps to Number.

**Filter chips**  
When a filter is applied, a visual "Chip" MUST appear in the Toolbar (e.g., `[Status is Active (x)]`).

**Filter groups & Nested filters**  
The Advanced Query Builder in the Toolbar MUST support constructing complex trees (e.g., `(A AND B) OR C`).

**Saved filters**  
The current combination of all filters MUST be savable as a "Saved View".

**Clear / Remove / Disable filter**  
Users MUST be able to clear all filters with a single click, or remove individual chips.

**Archived field filters**  
If a view references an archived field in its filters, the view MUST still evaluate correctly, but display a warning: "This view uses archived fields."

**Performance & Caching**  
Complex filters MUST bypass cache and hit the database directly.

**Acceptance criteria**  
- Filter chips synchronize perfectly with header active states.
- Complex nested logic executes correctly via backend API.
- Relative dates evaluate against the user's localized current time.

## 3.11 Row Selection

**Single selection**  
Clicking a row (outside interactive cells) MAY select it, depending on grid configuration.

**Multiple selection**  
Clicking checkboxes MUST enable multi-select mode.

**Range selection**  
Holding `Shift` and clicking another checkbox MUST select all rows in between.

**Select visible**  
Clicking the master checkbox in the header MUST select all currently visible rows in the DOM/current page.

**Select page**  
Synonymous with Select visible.

**Select all filtered records**  
When the master checkbox is clicked, a banner MUST appear above the grid: "All 50 contacts on this page are selected. [Select all 1,234 contacts matching this filter]".

**Select entire dataset**  
Clicking the aforementioned link MUST set an internal flag `selectAll: true` along with the current filter criteria, rather than attempting to store 1,234 IDs in memory.

**Indeterminate state**  
If some, but not all, rows are selected, the master checkbox MUST display an indeterminate state (`-` icon).

**Keyboard selection**  
`Space` MUST toggle selection on a focused row. `Shift + Up/Down` MUST perform range selection.

**Touch selection**  
Long-press MAY initiate selection mode on mobile.

**Selection persistence**  
Navigating to page 2 MUST NOT wipe the selections made on page 1. The grid MUST maintain a `Set` of selected IDs.

**Large datasets**  
The `selectAll` flag architecture prevents browser crashes when performing bulk actions on millions of rows.

**Acceptance criteria**  
- Master checkbox handles indeterminate states accurately.
- Selection survives pagination changes.

## 3.12 Bulk Actions Bar

**Appearance**  
When selected count > 0, the standard Toolbar MUST be hidden, replaced instantly by the Bulk Actions Bar sliding down.

**Disappearance**  
When selected count == 0, the Bulk Actions Bar MUST disappear.

**Sticky behaviour**  
The bar MUST remain sticky at the top of the grid viewport.

**Selected count**  
MUST prominently display "[N] selected".

**Available actions**  
MUST include Edit, Delete, Export, and domain-specific actions (e.g., Add to Segment).

**Permissions**  
Actions the user lacks permission for MUST be disabled or hidden.

**Progress**  
If a bulk action is triggered, the bar MUST transition into a progress state (e.g., "Updating 1,234 records...").

**Background jobs**  
Large bulk operations MUST be handed off to a background worker. The user MUST be able to dismiss the progress bar and continue working.

**Undo**  
Bulk destructive actions MUST require confirmation. Undo is NOT supported for massive bulk operations.

**Notifications**  
Completion of a background bulk action MUST dispatch a system notification.

**Failures**  
Partial successes MUST generate a downloadable error report detailing exactly which IDs failed and why.

**Accessibility**  
The Bulk Bar MUST trap keyboard focus initially to ensure screen reader users are aware of the context shift.

**Acceptance criteria**  
- Bulk bar replaces toolbar flawlessly.
- `selectAll` logic passes filter criteria to the backend API, not a massive array of IDs.

## 3.13 Row Actions

**Hover actions**  
When hovering over a row, primary quick actions (e.g., Edit, Delete) MAY appear on the far right.

**Overflow menu**  
Every row MUST possess a vertical ellipsis (`...`) in the Action Column triggering a dropdown menu.

**Quick actions**  
Defined per module.

**Open contact**  
Clicking the primary identifier (e.g., Name) MUST navigate to the Contact Detail View.

**Edit, Archive, Delete, Merge**  
Standard CRUD actions accessed via the overflow menu.

**Permissions**  
If the user lacks `update` permissions, the Edit action MUST be disabled.

**Acceptance criteria**  
- Row actions do not interfere with row click/selection logic.
- Overflow menu escapes grid `overflow: hidden` constraints using Portals.

## 3.14 Cell Behaviour

**Display**  
Text MUST truncate with an ellipsis if it exceeds cell width. 

**Hover**  
Hovering a truncated cell MUST NOT shift layout. 

**Focus**  
Clicking a cell MUST give it a visual focus outline.

**Editing**  
If editable, double-clicking a cell MUST swap the text for an inline input component (Input, Dropdown, DatePicker).

**Read-only**  
If read-only, double-clicking MUST do nothing, or MAY trigger a copy-to-clipboard action.

**Overflow & Tooltips**  
Hovering a truncated cell MUST display a native-feeling tooltip containing the full text after a 500ms delay.

**Copy / Paste**  
Users MUST be able to press `Cmd+C` on a focused cell to copy its raw value.

**Links**  
URLs and Emails MUST render as clickable `<a>` tags.

**Long text**  
Text areas MUST render on a single line in the grid, relying on tooltips or expansion for full viewing.

**Images / Avatars**  
MUST render in a small circular or square format (e.g., 24x24px). MUST include fallbacks if the image fails to load.

**Badges & Status**  
Enum values (e.g., `Status: Active`) SHOULD render as colored badges for quick visual scanning.

**Icons**  
Boolean fields MAY render as Check/X icons instead of text.

**Accessibility**  
Cells MUST possess `role="gridcell"`. Editable cells MUST announce their editability to screen readers.

**Acceptance criteria**  
- Inline editing triggers optimistic backend updates.
- Truncation works perfectly across all column widths.

## 3.15 Grid Density

**Compact**  
Row height: 32px. Text size: 13px. Padding: minimal. Optimized for scanning maximum data.

**Default**  
Row height: 40px. Text size: 14px. Optimized for general readability.

**Comfortable**  
Row height: 48px. Text size: 14px. Optimized for touch interfaces.

**Persistence**  
Density toggle selection MUST persist to user preferences.

**Workspace defaults**  
Admins CANNOT enforce density; it is strictly a user-level preference.

**Performance**  
Changing density MUST instantly recalculate virtualization metrics to prevent scroll jumping.

**Acceptance criteria**  
- Toggling density updates row heights instantly without full page reloads.

## 3.16 Empty States

**No Contacts**  
Displays full-screen placeholder: "Your workspace is empty." Action: "Import Contacts".

**No Search Results**  
Displays: "We couldn't find anything matching '[Query]'." Action: "Clear search".

**No Filters**  
Displays: "No records match these filters." Action: "Clear filters".

**No Permission**  
Displays: "Access Denied." Action: "Request Access".

**Offline**  
Displays cached data if available, otherwise "You are offline."

**Server Error**  
Displays: "Data unavailable." Action: "Retry".

**Deleted View**  
If a user loads a Saved View that was deleted by another user, the grid MUST gracefully fallback to the default view and show a warning toast.

**Archived Field**  
Grid loads normally but omits the column.

**Large Import Running**  
If a workspace is brand new and an import is running, the empty state MUST display a live progress bar: "Importing your data... (45%)".

**Maintenance**  
Displays: "Grid is temporarily down for scheduled maintenance."

**Visual behaviour**  
Empty states MUST occupy the full height of the Primary Content Area.

**Acceptance criteria**  
- Empty states are centered, friendly, and actionable.

## 3.17 Loading States

**Skeletons**  
MUST be used for the initial page hydration. They MUST respect the active density and column width configurations.

**Progress bars**  
A 2px primary-colored bar attached to the top of the grid. Used for background refetches (sorting, filtering, pagination).

**Lazy loading**  
Scrolling down triggers a fetch for the next page of cursors. The bottom of the grid MUST display a spinner while waiting.

**Pagination loading**  
If using distinct pages, clicking 'Next' triggers the Progress bar.

**Infinite loading**  
Supported via Intersection Observers on the bottom-most virtualized node.

**Background refresh**  
Polled updates (e.g., every 60s) MUST occur silently without blocking user interaction or flashing Skeletons.

**Optimistic updates**  
Mutations update the grid instantly.

**Failure recovery**  
If lazy loading fails, the grid MUST append a "Failed to load more. Retry" button at the bottom.

**Acceptance criteria**  
- Skeletons prevent all Layout Shifts.
- Network latency does not freeze the scrollbar.

## 3.18 Performance Requirements

**Render speed**  
Initial mount of the grid component MUST occur in < 150ms.

**Scroll FPS**  
Vertical and horizontal scrolling MUST maintain a strict 60 Frames Per Second (FPS). Scroll handlers MUST be passive.

**Memory**  
The grid MUST NOT leak memory. Switching views 100 times MUST NOT cause browser memory to bloat beyond a 50MB baseline increase.

**API batching**  
If multiple cells are inline-edited rapidly, the grid MUST batch the network requests or debounce them to prevent flooding the backend.

**Caching**  
The grid MUST utilize an intelligent client-side cache (e.g., React Query, Apollo, SWR) to prevent redundant fetches when navigating back and forth between identical cursors.

**Debouncing / Throttling**  
Resize events and scroll events MUST be heavily throttled via `requestAnimationFrame`.

**Virtualisation**  
DOM Virtualization is MANDATORY for both Rows (Vertical) and Columns (Horizontal). An 80-column schema MUST NOT render 80 DOM nodes per row if only 8 fit on screen.

**Large datasets**  
Performance MUST be O(1) relative to total dataset size. The grid renders 10,000,000 rows exactly as fast as 10 rows.

**Acceptance criteria**  
- Lighthouse performance score > 90 for the grid component.
- Zero jank detected in Chrome DevTools performance trace during aggressive scrolling.

## 3.19 Accessibility

**Keyboard navigation**  
The grid MUST implement a roving tabindex. Users MUST be able to enter the grid, use arrow keys to navigate cell-by-cell, and press Enter to interact.

**Tab order**  
`Tab` MUST move focus completely out of the grid, skipping individual cells to prevent users from getting trapped in massive tables. Cell navigation is strictly arrow-key based once inside.

**Screen readers**  
Focusing a cell MUST read the Column Name followed by the Cell Value. (e.g., "Status, Active").

**ARIA**  
`aria-colindex`, `aria-rowindex`, `aria-sort`, `aria-selected` MUST be implemented and dynamically updated.

**High contrast / Reduced motion**  
Animations (FLIP reordering) MUST disable if `prefers-reduced-motion` is detected.

**Zoom**  
Grid MUST remain functional at 200% browser zoom.

**Touch**  
Scrollbars MUST be easily grabbable on touch interfaces.

**Acceptance criteria**  
- Passes W3C ARIA Grid specification requirements.

## 3.20 Engineering Decisions

**Why Virtualization over native tables?**  
*Problem:* Standard `<table>` tags force the browser to render every node. 1,000 rows x 20 columns = 20,000 DOM nodes, crashing the browser.  
*Decision:* Virtualization calculates scroll offsets to render only the visible ~500 nodes. Native `<table>` semantics are simulated via CSS grid and ARIA attributes for accessibility.

**Why Keyset Pagination instead of explicit Page Numbers?**  
*Problem:* `OFFSET 100000` is incredibly slow in Postgres.  
*Decision:* Cursors (`WHERE id > last_seen`) are O(1) indexed lookups. We sacrifice the ability to jump directly to "Page 5000" in exchange for infinitely scalable performance, which aligns with modern infinite-scroll UX paradigms.

**Why Roving Tabindex?**  
*Problem:* If every cell is focusable, a user pressing `Tab` to reach the footer would have to press `Tab` 1,000 times.  
*Decision:* The grid acts as a single tab stop. Arrow keys manage internal navigation. This is the official W3C recommendation for complex grids.

**Why the `selectAll` boolean flag?**  
*Problem:* Selecting 1,000,000 rows and passing an array of 1,000,000 UUIDs in a JSON payload will crash both the client memory and the backend API.  
*Decision:* Passing `{ "selectAll": true, "filters": {...} }` delegates the heavy lifting to the database, allowing background workers to execute bulk updates natively via SQL.

---

# SECTION 4 — CONTACTS PAGE IMPLEMENTATION

## 4.1 Page Purpose

**Why the Contacts page exists**  
The Contacts page is the operational center of the Audience module. It provides the definitive, macro-level view of all known identities within the Workspace. 

**How it fits into ReactCommerce**  
It serves as the master directory. All other CRM and marketing functions are downstream from this page.

**Relationship with Campaigns**  
Marketers use the Contacts page to dynamically build target lists by applying complex filters, saving them as Views, and piping those views directly into Campaign execution.

**Relationship with Inbox**  
Support agents use the Contacts page to locate individuals manually if automated matching fails, initiating outbound conversations directly from the row actions.

**Relationship with Orders**  
Revenue teams filter the Contacts page by aggregated order metrics (e.g., LTV > $1000) to identify VIP cohorts.

**Relationship with Analytics**  
The underlying query engine powering the Contacts page is identical to the one powering Audience Analytics.

**Relationship with Workflows**  
Users can select bulk cohorts on this page and manually enroll them into Workflows.

**Relationship with AI**  
The AI utilizes the search and filter schemas defined on this page to answer natural language queries (e.g., "Show me all contacts in London").

**Relationship with Reports**  
Any Saved View created on the Contacts page can be exported directly as a scheduled Report.

## 4.2 Page Layout

The Contacts Page strictly adheres to the Global UI layout constraints. It occupies the entire viewport below the global application header.

**Global Header**  
Height: 56px. Fixed at the top. Contains tenant switcher, global search, and user profile.

**Breadcrumbs**  
Height: 24px. Located immediately below the Global Header. Aligned left. E.g., `Audience / Contacts`.

**Page Header**  
Height: 64px. Contains the H1 Title (`Contacts`), Subtitle/Record Count (`1,234 Total`), and primary mutation actions (Create, Import, Export). Flex container with `justify-content: space-between`.

**Toolbar**  
Height: 56px. Sticky. Sits below the Page Header. Contains Search (left aligned), and grouped right-aligned actions: Saved Views, Filters, Density, Column Selector.

**Filter Bar (Active Filters)**  
Height: 48px (when visible). Appears below the Toolbar ONLY if filters are active. Displays filter chips.

**Bulk Actions**  
Height: 56px. Replaces the Toolbar exactly when > 0 rows are selected.

**Contacts Grid**  
Occupies `flex-grow: 1`. Fills remaining vertical space down to the Footer. Utilizes the Enterprise Data Grid Framework. 

**Pagination**  
Height: 48px. Pinned to the bottom of the Contacts Grid.

**Footer**  
Not applicable for this module view (Pagination acts as the footer boundary).

**Notifications**  
Absolute positioned `bottom: 24px, right: 24px`. `z-index: 9999`.

**Loading Overlays**  
Absolute positioned over the Contacts Grid with a translucent white background (`rgba(255, 255, 255, 0.7)`).

**Side Panels**  
Slide in from the right edge. Width: `480px` on desktop, `100vw` on mobile. Overlays the grid with a backdrop blur. Used for Contact Creation.

**Context Menus**  
`z-index: 1000`. Triggered by ellipsis or right-click.

**Drawers**  
Mobile equivalent of Side Panels. Slide up from the bottom.

**Sticky Elements**  
Global Header, Page Header, Toolbar, Grid Header Row, and Pagination MUST remain sticky while scrolling the grid body.

**Responsive Behaviour**  

- **Desktop (>1024px)**: Full layout. Search input expanded. All toolbar icons have text labels.
- **Laptop (768px - 1024px)**: Toolbar text labels hidden; icons only. Side Panels cover 50% of the screen.
- **Tablet (480px - 768px)**: Toolbar elements collapse into an overflow menu except Search and Filters.
- **Mobile (<480px)**: Grid converts to Card layout. Toolbar collapses to a single "Search & Filter" button. Pagination converts to infinite scroll or a simple "Load More" button to save screen real estate.
- **Ultra-wide (>1440px)**: The grid spans the full width without arbitrary max-width constraints, maximizing visible columns.

## 4.3 Header

**Title**  
Text: `Contacts`. Font: H1 scale, bold.

**Subtitle / Live Contact Count**  
Text: `[N] Total` or `[N] matching filters`. Font: body-small, subdued color. Updates instantly when filters change.

**Refresh**  
Icon: Circular arrow. Clicking invalidates the `SWR`/`React Query` cache and fetches fresh data.

**Create Contact**  
Button: Primary. Text: `Create Contact`. Triggers the Creation Side Panel.

**Import**  
Button: Secondary. Text: `Import`. Triggers a modal workflow.

**Export**  
Button: Secondary. Text: `Export`. Triggers an export configuration modal.

**Settings**  
Icon: Cog. Navigates to Audience Settings.

**Overflow Menu**  
On viewports < 768px, Import, Export, and Settings are moved inside a vertical ellipsis menu to save horizontal space.

**Permissions & Disabled States**  
- If user lacks `contact:create`, the Create button is hidden.
- If user lacks `contact:import`, the Import button is disabled with tooltip "You do not have permission to import".
- If system is offline, Create/Import/Export are disabled.

**Hover States**  
Buttons lighten by 10% on hover.

**Keyboard Navigation**  
`Tab` sequence: Refresh -> Export -> Import -> Create.

**Loading**  
If the total count is fetching, the Subtitle displays a 60px wide Skeleton pulse.

## 4.4 Toolbar

**Search**  
Left-aligned. Minimum width 240px on desktop. Expands on focus. Contains a leading magnifier icon.

**Saved Views**  
Dropdown button. Displays the name of the active view (e.g., "All Contacts"). Clicking opens a popover to switch, save, or manage views.

**Filters**  
Button. Icon: Filter funnel. Text: `Filters`. If filters are active, displays a primary-colored dot indicator. Clicking opens the Advanced Filter Panel.

**Density**  
Icon button: Grid layout. Tooltip: `Density`. Cycles through Compact, Standard, Comfortable.

**Column Selector**  
Icon button: Columns. Tooltip: `Edit Columns`. Opens the column management popover.

**Bulk Actions**  
Only visible when rows are selected. Replaces the standard toolbar.

**Responsive Behaviour**  
When horizontal space is limited, Density and Column Selector move into a "More Actions" dropdown. Search input collapses to just an icon, expanding over the other buttons when clicked.

## 4.5 Search

**Search Behaviour**  
Global fuzzy search executing across `first_name`, `last_name`, `email`, `phone`, and `company`.

**Debounce**  
Must be strictly debounced by 300ms. Typing "john" rapidly MUST only fire one API request.

**Search Syntax**  
- **Partial matching**: `joh` matches `John`.
- **Exact matching**: Wrapping in quotes `"john.doe@email.com"` forces an exact match.
- **Phone numbers**: Strips formatting before searching. `+1 555-0100` matches `15550100`.

**Highlighting**  
The search results MUST NOT inject HTML tags into the grid cells for highlighting to prevent XSS.

**Recent Searches**  
Focusing the empty search input opens a dropdown showing the 5 most recent queries.

**Search Suggestions**  
As the user types, suggest explicit filters (e.g., "Filter by Email: john@doe.com").

**Search History**  
Persisted to `localStorage` per user.

**Keyboard Support**  
- `/` or `Cmd+K` focuses the input.
- `ArrowDown` navigates recent searches.
- `Enter` executes the selected recent search.
- `Escape` clears the input and blurs.

**Clear Search**  
An `X` icon appears when input has value. Clicking clears the input and restores the grid to its unfiltered state.

**Performance**  
Search requests MUST hit a dedicated search index (e.g., Postgres GIN, Elasticsearch) returning results in < 150ms.

## 4.6 Saved Views

**Personal Views**  
Views created by the user, visible only to the user.

**Workspace Views**  
Views created by admins, visible to everyone in the workspace.

**Default View**  
"All Contacts". Cannot be deleted or modified. Always available.

**Pinned Views**  
Users can pin up to 5 views. Pinned views appear as horizontal tabs above the Toolbar for 1-click access.

**Shared Views**  
Users can generate a unique URL for a specific view state to share with colleagues.

**Permissions**  
Users require `audience:manage_views` to create Workspace Views.

**Duplicate View**  
Users can clone any view (including Workspace views) to create a personal variation.

**Rename / Delete / Archive / Restore**  
Available via an overflow menu next to the view name in the dropdown.

**View Ordering**  
The dropdown lists Pinned Views first, then Workspace Views, then Personal Views (alphabetical).

**Persistence**  
The active view ID is stored in the URL `?view=123`. If no view is specified, it defaults to the user's last active view (stored in user preferences backend), fallback to "All Contacts".

**Versioning**  
If an admin modifies a Workspace view, it updates for all users seamlessly.

## 4.7 Enterprise Contacts Grid

The Contacts page utilizes the Enterprise Data Grid Framework (Section 3) with specific configurations.

**Grid Layout**  
Fills all available space between Toolbar and Pagination.

**Checkbox Column**  
Always pinned to index 0.

**Avatar Column**  
Pinned to index 1. Renders the contact's initials or uploaded image.

**Primary Column**  
`Name` (Computed `first_name` + `last_name`). Pinned to index 2. Clicking the Name navigates to the Contact Details page.

**Dynamic Columns**  
Email, Phone, Status, Created Date, Last Activity, and all Custom Fields.

**Row Height**  
Defaults to Standard (40px).

**Inline Badges**  
The `Status` column MUST render as a colored pill (e.g., Green for Active, Gray for Inactive).

**Overflow Handling**  
Cells truncate with ellipses. Hovering for 500ms shows a tooltip.

**Pagination**  
Uses Keyset Pagination. Displays "Previous" and "Next" buttons. Page size selector (25, 50, 100).

**Performance**  
Must virtualize DOM nodes. 100,000 contacts MUST NOT render more than ~50 DOM rows.

**Action Column**  
Pinned to the far right. Contains an overflow menu (`...`) for Edit, Archive, Delete.

## 4.8 Filters

Triggered via the Toolbar "Filters" button. Opens a sliding right-hand Panel.

**Operators by Datatype**  
- **Text**: `is`, `is not`, `contains`, `does not contain`, `is empty`, `is not empty`.
- **Number**: `=`, `!=`, `>`, `<`, `>=`, `<=`, `between`, `is empty`.
- **Date**: `is exactly`, `before`, `after`, `between`, `relative (today, past 7 days, etc)`.
- **Boolean**: `is true`, `is false`.
- **Enum/Select**: `is any of`, `is none of`.

**Nested Filters**  
The UI MUST support a tree structure. E.g., `(Status = Active AND Lead Score > 50) OR (Company = Acme)`.

**Filter Chips**  
Active filters appear as dismissible chips below the toolbar. E.g., `[Status is Active (x)]`.

**Performance**  
Filter application instantly updates the URL and triggers a debounced API request.

**Persistence**  
Filters are fully serialized into the URL query string.

## 4.9 Bulk Operations

Triggered when the master checkbox or individual row checkboxes are selected.

**Selection**  
User can click "Select all 5,000 matching contacts".

**Bulk Edit**  
Opens a modal. User selects a Field, then specifies the New Value.

**Bulk Delete / Bulk Archive**  
Requires typing "DELETE" in a confirmation modal.

**Bulk Assign**  
Updates the `owner_id` for selected contacts.

**Bulk Tags / Lists / Campaigns**  
Appends relationships without wiping existing ones.

**Background Processing**  
If > 1,000 records are selected, the API MUST return a `202 Accepted` and process via a background worker queue.

**Partial Failures**  
Generates a downloadable CSV error report for the rows that failed validation.

## 4.10 Page States

**Loading**  
Initial load renders exactly 15 Skeleton rows.

**Refreshing**  
Toolbar progress bar animates. Existing data dims to 70% opacity.

**Empty**  
Workspace has 0 contacts: Shows "Welcome to ReactCommerce Audience" illustration + "Create Contact" primary CTA.

**No Search Results**  
Shows empty illustration + "No contacts match your search." + "Clear Search" button.

**API Failure**  
Shows critical error illustration + "We couldn't load your contacts." + "Retry" button.

**Partial Data**  
If Redis fails, loads from Postgres directly. Shows a subtle toast: "Experiencing degraded performance."

**Offline**  
Shows red banner at the top: "You are offline. Reconnecting..." Mutations are disabled.

## 4.11 Keyboard Shortcuts

- `?`: Open keyboard shortcuts cheat sheet.
- `/` or `Cmd+K`: Focus global search.
- `Cmd+Shift+F`: Open filter panel.
- `Cmd+A`: Select all visible rows (when focus is in the grid).
- `Escape`: Close panels, modals, clear search, or deselect all rows.
- `R`: Refresh grid data (when focus is outside inputs).
- `C`: Open Create Contact panel.

## 4.12 Accessibility

**WCAG Compliance**  
Strict adherence to WCAG 2.1 AA.

**ARIA**  
The grid implements `role="grid"`. Checkboxes have `aria-label="Select row"`.

**Tab Order**  
Logical flow: Header -> Toolbar -> Grid Headers -> Grid Body -> Pagination.

**Keyboard-only Operation**  
Every action MUST be achievable without a mouse.

## 4.13 Performance Requirements

**First Paint**  
Application shell renders in < 500ms.

**Interactive**  
Grid is fully interactive and hydrated in < 1.5s.

**Scroll FPS**  
Grid maintains 60 FPS during rapid vertical scrolling.

**Search Latency**  
API returns search results in < 150ms.

**Memory**  
The page MUST NOT exceed 150MB of RAM usage regardless of dataset size.

## 4.14 Design Decisions

**Why a Right-Hand Panel for Filters?**  
*Alternative:* Inline dropdowns.  
*Reasoning:* Complex nested AND/OR logic requires significant horizontal space. A side panel prevents obscuring the grid data while the user builds the query, allowing them to see live updates.

**Why "Select All Matching" instead of loading IDs?**  
*Problem:* Selecting 100,000 rows and sending an array of 100,000 UUIDs crashes browsers.  
*Reasoning:* The client sends `{ selectAll: true, query: { status: 'active' } }`. The backend executes the bulk action using the identical SQL WHERE clause, completely bypassing memory limits.

## 4.15 Acceptance Criteria

- [ ] Page renders correctly on Desktop, Tablet, and Mobile.
- [ ] Grid virtualizes rows correctly (check DOM node count).
- [ ] Search is debounced at exactly 300ms.
- [ ] Keyboard shortcuts execute correctly.
- [ ] Bulk actions on > 1,000 rows delegate to background workers and do not block the UI.
- [ ] URL perfectly serializes the active View, Filters, Sort, and Page.
- [ ] Refreshing the browser preserves the exact state via the URL.
- [ ] Empty states render correctly for 0 total contacts vs 0 search results.
- [ ] Accessibility audit (Axe) reports zero violations.

---

# SECTION 5 — CONTACT DETAILS IMPLEMENTATION

## 5.1 Contact Details Philosophy

**Why every customer deserves a complete 360° profile**  
In an enterprise CRM, context is everything. When an agent opens a Contact, they must instantly understand the entire relationship history. Fragmentation (having to check a different page for orders, another for support tickets, and another for marketing emails) destroys operational efficiency and leads to poor customer experiences.

**Consolidation Strategy**  
All information—Sales, Marketing, Support, and Operational—must be consolidated into a single unified view, organized logically by relevance and recency.

**Minimizing Page Switches**  
The interface must allow agents to perform all necessary actions (e.g., sending an email, logging a note, updating a custom field, pausing a campaign) directly from this view without ever navigating away. 

**Progressive Disclosure**  
A customer profile can contain thousands of data points. To prevent cognitive overload, the UI must surface the most critical identifiers and recent activities immediately, while hiding historical data, complex settings, and raw logs behind tabs or collapsible sections.

**Operational Efficiency**  
The design must prioritize speed. Frequently used actions (e.g., "Start WhatsApp Chat") must be 1-click accessible via sticky headers or floating actions.

## 5.2 Contact Header

The Contact Header is the persistent identifier region at the top of the details view.

**Avatar**  
- **Generation**: If no image exists, generate a circular avatar using the contact's initials (e.g., `JD` for John Doe) on a deterministic, pastel background color based on their UUID.
- **Upload**: Hovering over the avatar reveals an "Upload Image" overlay.
- **Sync**: If configured, the system periodically attempts to fetch public avatars via Clearbit or social APIs using the primary email.
- **Presence Indicator**: A small green dot on the bottom-right of the avatar indicating if the user is currently online/active on a tracked web property.

**Core Identifiers**  
- **Full Name**: Rendered in H2. If null, display the primary email or phone number as a fallback.
- **Unique Contact ID**: Displayed below the name in a subdued, monospaced font with a quick-copy icon.

**Primary Attributes**  
- **Lifecycle Stage**: E.g., `Lead`, `MQL`, `Customer`. Rendered as an editable dropdown pill.
- **Lifecycle Status**: E.g., `New`, `In Progress`, `Unqualified`. Rendered as an editable dropdown pill.
- **Owner**: The assigned agent. Displays the agent's micro-avatar and name. Editable inline.
- **Primary Phone**: Formatted via E.164. Clicking triggers the default telephony handler (`tel:`).
- **Primary Email**: Clicking triggers the default email handler (`mailto:`).
- **Preferred Channel**: An icon indicating the user's preferred communication method (e.g., WhatsApp icon).

**Quick Actions**  
Primary buttons located on the right side of the header:
- `Message` (Primary) -> Opens the Omnichannel composer focused on the preferred channel.
- `Log Note` (Secondary) -> Focuses the Note composer.
- `Create Task` (Secondary) -> Opens the task creation popover.

**Overflow Menu**  
Vertical ellipsis containing: `Merge Contact`, `Export Data`, `Archive`, `Delete`.

**Pinned Information & Badges**  
- **Tags**: A horizontal scrolling list of active tags.
- **AI Score / Churn Risk**: A gauge or badge indicating customer health (e.g., "🔥 High Intent" or "⚠️ 85% Churn Risk").
- **Metadata**: Subdued text displaying `Created: [Date]`, `Last Activity: [Relative Time]`.

**Responsive Behaviour**  
- **Desktop**: Layout is horizontal. Avatar on left, details in middle, actions on right.
- **Mobile**: Stacks vertically. Avatar centered. Actions collapse into a sticky bottom action bar.

**Loading & Accessibility**  
- Shows skeleton loaders matching the exact dimensions.
- `<header role="banner">`. All interactive elements must have `aria-label`.

**Acceptance Criteria**  
- Header remains sticky during vertical scrolling.
- Copying the Contact ID works and triggers a success toast.
- All primary actions enforce RBAC (e.g., cannot click 'Delete' without permission).

## 5.3 Contact Layout

**Split Panel Architecture (Desktop)**  
- **Left Column (30%)**: Sticky. Contains the Overview (System Fields, Custom Fields, Company, Address, Social).
- **Right Column (70%)**: Scrollable. Contains the unified Timeline, Activity Feed, Notes, and related objects.

**Section Navigation**  
A horizontal, sticky tab bar located below the Header on the Right Column (e.g., `Activity | Notes | Emails | Tickets | Orders`).

**Cards & Collapsible Sections**  
Information in the Left Column must be grouped into visually distinct Cards (e.g., "About", "Address"). Each card header must include a chevron to collapse the section. User collapse preferences must be saved to `localStorage`.

**Responsive Layout**  
- **Tablet (768px - 1024px)**: Left column becomes 35%, Right column 65%.
- **Mobile (< 768px)**: The split panel collapses into a single column. The Left Column (Overview) becomes a tab (`About`) alongside `Activity`.
- **Ultra-wide (> 1440px)**: The layout max-width is constrained to `1600px` to maintain readability, centered on the screen.

**Sticky Actions**  
The global `Save` or `Cancel` bar appears fixed at the bottom ONLY when inline edits are pending.

**Design Decisions**  
*Why Split Panel?*  
It allows the user to scroll through a long timeline of events on the right while constantly maintaining context of the user's core attributes (Phone, Email, Tags) on the left.

## 5.4 Contact Overview

**System Fields**  
Standard fields (`first_name`, `last_name`, `email`, `phone`, `timezone`, `language`).

**Presentation & Read-Only Behaviour**  
Fields render as simple `Label: Value` pairs. Hovering over a value reveals a pencil icon. Clicking converts the text into an input field for inline editing.

**Hidden & Sensitive Fields**  
Fields marked as sensitive (e.g., SSN, DOB) must render as `••••••••` until the user clicks an "eye" icon to reveal them, logging an audit event.

**Field Formatting**  
- **Phone**: Formatted according to the Contact's country code automatically (e.g., `+1 (555) 123-4567`).
- **Email**: Rendered as a clickable link.
- **Address**: Formatted over multiple lines according to the country's postal standard.

**Tooltips & Long Values**  
If a text field exceeds its container width, it truncates with ellipses. Hovering displays the full text in a tooltip.

**Permissions**  
If the user lacks `contact:edit`, the hover pencil icon is hidden, and clicking does nothing.

**Accessibility**  
Inline edit inputs must trap focus until saved or canceled.

## 5.5 Timeline

The Timeline is the heart of the Contact Details view. It is a strictly chronological, vertically scrolling feed of every interaction.

**Chronological Ordering**  
Newest events at the top (descending).

**Supported Events**  
- **Communications**: WhatsApp Messages, Emails (Sent/Opened/Clicked), SMS, Messenger.
- **System Events**: Contact Created, Field Updated (e.g., "Owner changed from X to Y"), Tag Added.
- **Marketing Events**: Segment Entered/Exited, Campaign Received, Form Submitted, Webinar Attended.
- **Sales/Support**: Order Placed, Payment Failed, Ticket Opened/Closed.
- **Manual Events**: Notes logged, Calls logged, Tasks completed.
- **AI Events**: "AI summarized conversation", "AI predicted churn".

**Grouping**  
Events occurring on the same day are grouped under a sticky date header (e.g., "Today", "Yesterday", "July 24, 2026").

**Expand / Collapse**  
Complex events (like a long email thread or a detailed order receipt) render a summary card. Clicking the card expands it inline to show the full payload.

**Filters & Search**  
A sticky toolbar above the timeline allows users to filter by event type (e.g., "Show only Emails") or search for specific text within the timeline (e.g., "invoice").

**Lazy Loading & Performance**  
The timeline MUST virtualize DOM rendering. It fetches the first 50 events. Scrolling to the bottom triggers a cursor-based fetch for the next 50. An infinite scroll threshold of `80%` is recommended.

**Acceptance Criteria**  
- Timeline renders mixed event types correctly.
- Infinite scroll handles > 10,000 events without crashing the browser.
- Changing a filter resets the cursor and fetches the correct subset.

## 5.6 Communication Summary

A dedicated visual card at the top of the right column (above the timeline) summarizing engagement health.

**Metrics**  
- **Last Message**: Timestamp and channel.
- **Last Outbound / Inbound**: Timestamps indicating who spoke last.
- **Response Time**: The average time the contact takes to reply to agent messages.
- **Email Engagement**: Open Rate % and Click Rate %.

**Subscriptions & Opt-in**  
Clear visual indicators showing subscription status for Marketing Emails, SMS, and WhatsApp.
- If `Unsubscribed` or `Bounced`, the indicator is Red and blocks outbound marketing automation.

**Permissions**  
Only users with `admin` permissions can manually override a Hard Bounce or Unsubscribe status, and doing so requires explicit audit logging.

## 5.7 Company Information

A dedicated card in the Left Column detailing B2B context.

**Fields**  
`Company Name`, `Department`, `Job Title`, `Annual Revenue`, `Employee Count`, `Website`.

**Relationships**  
If the Company exists as an independent entity in the CRM, the Company Name renders as a hyperlinked badge navigating to the Company Profile.

**Validation**  
Website URLs must be validated (`^https?://`).

## 5.8 Address Information

**Fields**  
`Country`, `State/Province`, `City`, `Area/District`, `Street Address`, `Landmark`, `PIN/Zip Code`.

**Maps Integration**  
If `Latitude` and `Longitude` are available (via geocoding the address), a small static map thumbnail is displayed. Clicking it opens Google Maps/Apple Maps in a new tab.

**Formatting**  
Dynamic based on the selected `Country`. State dropdowns must populate contextually based on the Country selection.

## 5.9 Social Profiles

**Supported Platforms**  
LinkedIn, X (Twitter), Facebook, Instagram, GitHub.

**Presentation**  
Renders as a grid of platform icons. If linked, the icon is colored and clickable. If unlinked, it is grayed out.

**Synchronization**  
A "Sync Data" button attempts to enrich the profile via external API providers (e.g., Clearbit) using the social handles.

**Error Handling**  
If a social link is broken (404), an automated background job flags it, and the UI displays a warning icon next to the link.

## 5.10 Notes

**Creation**  
Users can log free-text notes. The composer supports Rich Text (Bold, Italic, Lists, Code blocks).

**Mentions**  
Typing `@` opens a typeahead dropdown to tag other agents. Tagged agents receive an in-app notification.

**Pinning**  
Important notes can be "Pinned". Pinned notes bypass chronological sorting and appear permanently at the top of the Timeline.

**History & Versioning**  
If a note is edited, an "Edited" badge appears. Clicking it shows a diff history to prevent malicious altering of historical records.

**Autosave**  
The composer autosaves drafts to `localStorage` every 5 seconds.

## 5.11 Files

**Upload & Storage**  
Users can attach documents directly to the Contact or within Notes. Supports drag-and-drop.

**Preview**  
Images (JPG, PNG), PDFs, and basic text files preview inline in a lightbox modal.

**Security & Virus Scan**  
All uploaded files MUST pass through an async virus-scanning lambda before being marked `available`. Until scanned, the file displays a "Scanning..." state.

**Supported File Types**  
PDF, DOCX, XLSX, CSV, JPG, PNG, MP4. (Executables like .exe or .sh are strictly prohibited).

## 5.12 Related Information

**Navigation Tabs**  
The UI must allow jumping to dedicated relational views for:
- **Orders**: A data grid of all e-commerce transactions linked to the contact.
- **Tickets**: A grid of all Zendesk/Intercom style support tickets.
- **Segments**: A list of all dynamic segments this contact currently qualifies for.
- **Workflows**: A list of active automated journeys the contact is enrolled in.

**Permissions**  
If the user lacks `orders:read`, the Orders tab is completely hidden.

## 5.13 AI Insights

**AI Summary**  
A dynamically generated paragraph at the top of the profile: E.g., *"John is a high-value customer who recently experienced a shipping delay. He is frustrated but highly engaged with marketing emails."*

**AI Score / Churn Risk**  
Calculated via background ML models. Displays a confidence score (e.g., `85% Confidence`).

**Explainability**  
Clicking the AI Score opens a popover detailing *why* the score was given (e.g., "+20: Opened 3 emails this week", "-50: Submitted a negative CSAT score").

**Refresh Behaviour**  
AI insights are cached for 24 hours. A "Regenerate" button forces a fresh LLM evaluation, rate-limited to once per hour per contact.

## 5.14 Activity Feed (Detailed)

This is an expansion of the Timeline focusing on raw telemetry.

**Filtering & Grouping**  
Allows deep dive: E.g., "Show me every webpage this user clicked between Jan 1 and Jan 15".

**Export**  
Users with `contact:export` can export the raw JSON/CSV of the activity feed for compliance or external analysis.

## 5.15 Responsive Behaviour

**Mobile & Touch**  
- The 2-column layout collapses.
- Hover actions (like the inline edit pencil) are replaced by explicit "Edit" buttons or tap-to-edit behavior.
- Swiping left on a timeline event reveals secondary actions (e.g., Delete Note).
- The sticky "Message" button remains fixed at the bottom edge of the screen, ensuring the primary CTA is always accessible via thumb.

## 5.16 Accessibility

- **Focus**: Modal dialogs (like File Previews) must trap focus.
- **ARIA**: The timeline must use `aria-live="polite"` when lazy-loading new events.
- **Contrast**: Badges and pills must pass 4.5:1 contrast ratios.
- **Reduced Motion**: If OS prefers reduced motion, the slide-in side panels must revert to instant display.

## 5.17 Performance

**Large Contacts**  
A contact with 10,000 timeline events (e.g., an API-heavy integration) MUST NOT crash the browser.

**Memory Optimization**  
Virtualization ensures only the visible DOM nodes exist. Unmounted components must cleanly sever their event listeners to prevent memory leaks.

**Caching**  
The Contact payload is cached in React Query. Subsequent visits to the same contact during a session load instantly from cache while revalidating in the background.

## 5.18 Design Decisions

**Why Inline Editing instead of an "Edit Mode"?**  
*Alternative:* An explicit "Edit Profile" button that turns the whole page into a form.  
*Reasoning:* Agents usually need to update one specific field (e.g., fixing a phone number) while on a call. Forcing the entire page into edit mode is disruptive and slow. Inline editing is the modern enterprise standard (e.g., Notion, Linear).

**Why separate the Left Column (Attributes) from the Right Column (Timeline)?**  
*Reasoning:* The Left column represents the *current state* of the user. The Right column represents the *historical journey*. Keeping them separated conceptually aids rapid cognitive parsing.

## 5.19 Acceptance Criteria

- [ ] Split panel layout renders correctly on Desktop and gracefully degrades to tabs on Mobile.
- [ ] Timeline correctly interweaves at least 5 different types of events chronologically.
- [ ] Timeline virtualizes rendering; no more than 50 DOM nodes exist for events regardless of total count.
- [ ] Inline editing correctly sends PATCH requests, optimistic updates UI, and reverts on server error.
- [ ] Sensitive fields (if configured) are masked by default.
- [ ] `@` mentions in Notes successfully trigger search dropdowns.
- [ ] File uploads correctly show progress, display "Scanning...", and eventually preview.
- [ ] AI Summary generates and caches correctly.
- [ ] Unsubscribe indicators correctly block the composition of outbound marketing messages.
- [ ] Tab ordering is fully logical and covers all interactive elements in the left and right columns.

---

# SECTION 6 — CONTACT LIFECYCLE ENGINE

## 6.1 Contact Lifecycle Philosophy

**Why contact quality is critical**  
A CRM is only as valuable as the integrity of its data. Poor contact quality (duplicates, invalid emails, phantom records) destroys the efficacy of marketing campaigns, inflates billing metrics, and frustrates sales teams.

**Why duplicate prevention matters**  
If a single human exists as two separate Contact records, their communication history is split. An agent might send a welcome email to Record A, unaware that Record B just filed an angry support ticket. The system MUST proactively prevent this fragmentation at the point of entry.

**Why every contact change must be traceable**  
In an enterprise environment, multiple agents and automated workflows mutate data concurrently. When a Contact's lifecycle stage unexpectedly changes to "Churned," administrators must be able to instantly identify whether it was caused by a human error or a rogue API script.

**Why auditability is essential**  
Strict compliance (GDPR, CCPA, HIPAA) requires an immutable ledger of exactly who viewed, edited, or deleted PII (Personally Identifiable Information), and when.

**Why identity should persist across channels**  
ReactCommerce is an omnichannel platform. A customer interacting via WhatsApp, Email, and Instagram must map to a single unified Contact ID.

**Lifecycle Stages**  
1. **Creation**: Manual entry, API import, or automated generation from inbound messages.
2. **Active**: Standard engagement phase.
3. **Inactive**: No engagement for a defined period (e.g., 6 months).
4. **Archived (Soft Delete)**: Removed from active views and segments, but retained for historical auditing.
5. **Permanently Deleted**: Purged entirely from the system to satisfy legal compliance (e.g., "Right to be Forgotten").

## 6.2 Create Contact Experience

**Entry Points**  
- "Create Contact" button on the Contacts List page.
- Keyboard shortcut `C` from anywhere within the Audience Module.
- "Create Contact" from the Omnichannel Inbox when an unknown number messages.

**Modal vs Full Page**  
Manual creation MUST utilize a Slide-out Side Panel (480px width) to allow users to maintain context of the underlying list. A full-page redirect is PROHIBITED.

**Default Values**  
- `Owner`: Defaults to the current logged-in user creating the contact.
- `Timezone`: Defaults to the Workspace's default timezone.
- `Lifecycle Stage`: Defaults to `Lead` (configurable by admins).

**Required Fields**  
At minimum, the user MUST provide either an `Email`, a `Phone Number`, or a `Last Name`. Completely anonymous phantom records are PROHIBITED.

**Optional Fields**  
First Name, Company, Job Title, and any standard Custom Fields pinned by the Workspace admin.

**System-generated Fields**  
`id` (UUID), `created_at` (UTC timestamp), `updated_at` (UTC timestamp), `created_by` (User ID). These are invisible during creation.

**Real-time Validation**  
Fields MUST validate `onBlur`. Invalid emails or improperly formatted phone numbers immediately render red helper text below the input.

**Duplicate Detection While Typing**  
As the user types into the `Email` or `Phone` fields, a debounced (500ms) background query checks for exact matches. If a match is found, an inline alert appears: *"A contact with this email already exists. [View Contact]"* and the `Save` button is disabled.

**Country-aware Formatting**  
Phone numbers MUST require a country code. The UI MUST provide a searchable country flag dropdown.

**Save & Create Another**  
Alongside the primary `Save` button, a secondary `Save & Create Another` button MUST exist for rapid data entry.

**Cancel**  
If fields contain data, clicking `Cancel` triggers a confirmation dialog: *"Discard unsaved changes?"*

**Loading & Failures**  
During submission, the Save button enters a loading state. If the API fails (e.g., a race condition caused a duplicate), the form remains open with a top-level error banner.

**Offline Behavior**  
If `navigator.onLine` is false, the `Save` button is disabled with a tooltip indicating no connection.

**Permissions**  
Requires `contact:create`. If lacking, the entry points are hidden.

**Acceptance Criteria**  
- Form prevents submission if neither Email, Phone, nor Last Name are provided.
- Duplicate detection triggers reliably before submission.
- Focus flows logically from top to bottom via the `Tab` key.

## 6.3 Contact Validation Framework

**Validation Philosophy**  
Validation MUST be strict on structure but forgiving on formatting. The frontend guides the user to the correct format, and the backend rigidly enforces it.

**Unique Identifiers**  
`Email` and `Phone` MUST be strictly unique across the Workspace. The database MUST enforce this via a `UNIQUE` index constraint.

**Email Rules**  
Must pass standard regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`.

**Phone Rules**  
Must be normalized and validated against the E.164 standard (e.g., via `libphonenumber`).

**Whitespace Handling**  
The backend MUST automatically trim leading and trailing whitespace from all string fields before saving.

**Case Sensitivity**  
Emails MUST be coerced to lowercase before saving to ensure consistent duplicate detection. Names SHOULD maintain the user's inputted casing.

**Length Limits**  
- First/Last Name: Max 255 chars.
- Email: Max 320 chars.
- Custom Text Fields: Max 10,000 chars unless specified otherwise.

**Unicode Handling**  
All fields MUST support full UTF-8 (including emojis and non-Latin scripts) to support global businesses.

**Blocking vs Warning Validations**  
- **Blocking**: Invalid email, duplicate phone. (Save prevented).
- **Warning**: "This phone number looks like a landline, SMS may not deliver." (Save permitted).

**Recovery Flow**  
Errors returned by the API MUST map directly back to the specific form field that caused them, highlighting the field in red.

## 6.4 Edit Contact

**Opening Edit Mode**  
There is no dedicated "Edit Mode" page. All editing occurs inline on the Contact Details page.

**Inline Editing**  
Hovering over a field in the Contact Overview reveals a pencil icon. Clicking converts it to an input.

**Field Locking**  
Fields synced from an external immutable source (e.g., an ERP integration) MUST be locked. They display a "Padlock" icon and a tooltip: *"Managed by [Integration Name]"*.

**Concurrent Editing & Conflict Detection**  
ReactCommerce MUST implement Optimistic Concurrency Control using an `updated_at` timestamp or `version` integer. 
- *Scenario*: User A opens contact. User B opens contact. User A changes Phone. User B tries to change Phone.
- *Resolution*: User B's save fails with a `409 Conflict`. The UI displays: *"This contact was modified by another user. Review changes."*

**Autosave vs Manual Save**  
Inline fields save instantly `onBlur` or upon pressing `Enter`. There is no global "Save Profile" button.

**Unsaved Change Warnings**  
If the user is actively typing in an inline field and attempts to navigate away (e.g., clicking a link in the sidebar), a browser `beforeunload` warning MUST trigger.

**Audit Logging Expectations**  
Every successful inline edit MUST append a record to the Audit History: `[Field] changed from [Old] to [New] by [Actor]`.

## 6.5 Contact Status Management

**Allowed Statuses**  
- `Active`: Default state.
- `Archived`: Soft deleted.
- `Blocked`: The contact is explicitly blocked from inbound communication (e.g., spammer).

**Lifecycle Stage**  
Independent from Status. Maps to the funnel (e.g., `Subscriber`, `Lead`, `Opportunity`, `Customer`, `Evangelist`).

**Allowed Transitions**  
- Active -> Archived
- Active -> Blocked
- Archived -> Active
- Blocked -> Active

**Restricted Transitions**  
A Contact cannot be both Blocked and Archived simultaneously.

**Bulk Status Changes**  
Users can select multiple rows in the Data Grid and change Lifecycle Stage or Status in bulk via the Toolbar.

## 6.6 Archive & Restore

**Archive Confirmation**  
Clicking "Archive" from the overflow menu triggers a confirmation modal: *"Are you sure? This will remove the contact from all active segments."*

**Soft Delete (Archive)**  
The database record is NOT dropped. A `deleted_at` timestamp is populated.

**Visibility After Archive**  
Archived contacts DO NOT appear in standard Data Grid views, Global Search, or Segment evaluations. They can ONLY be found if the user explicitly switches the Grid View to "Archived Contacts".

**Restore Workflow**  
Viewing an archived contact displays a prominent yellow banner at the top: *"This contact is archived."* alongside a `Restore` button. Restoring clears the `deleted_at` timestamp.

**Permissions**  
Requires `contact:archive` and `contact:restore`.

## 6.7 Permanent Delete

**Deletion Dependencies**  
ReactCommerce acts as a system of record. Deleting a contact cascades deeply.

**Risk Warnings**  
The UI MUST heavily emphasize the irreversible nature of this action.

**Multi-step Confirmation**  
To permanently delete, the user MUST type the word "DELETE" into a confirmation modal.

**Irreversible Actions (Hard Delete)**  
When triggered, a background job scrubs all PII (`first_name`, `email`, `phone` replaced with hashes/nulls). A tombstone record with the original UUID remains to preserve foreign key constraints for historical Orders and Tickets, but the human identity is destroyed.

**Bulk Deletion**  
Allowed via the Data Grid, processed asynchronously.

**Permissions**  
Requires strictly scoped `contact:delete_permanent` (usually restricted to Workspace Admins).

## 6.8 Duplicate Detection

**Detection Timing**  
- Real-time: During manual creation.
- Bulk: During CSV imports or API syncs.
- Background: A nightly cron job scans the entire workspace for fuzzy duplicates.

**Matching Fields**  
- Exact match on `Email`.
- Exact match on normalized `Phone`.
- Fuzzy match on `First Name` + `Last Name` + `Company`.

**Phone Normalization**  
`+1 555 123 4567` and `1-555-123-4567` MUST be treated as identical by stripping non-numeric characters before comparison.

**Automatic Suggestions**  
If the nightly background job detects a >90% similarity score, the UI surfaces a "Duplicate Review" card on the Contacts Landing Page: *"We found 15 potential duplicates. [Review]"*

**User Review**  
The Review UI shows the two contacts side-by-side, highlighting the differences, and offers a 1-click `Merge` or `Dismiss` action.

**False Positives**  
Dismissing a suggested duplicate explicitly flags the pair so the background job ignores them in the future.

## 6.9 Merge Contacts

**Merge Entry Points**  
- From the "Duplicate Review" dashboard.
- From the Contact Details overflow menu ("Merge with another contact").

**Merge Wizard**  
A dedicated modal interface presenting Contact A and Contact B side-by-side.

**Primary Contact Selection**  
The user MUST select which Contact acts as the "Master" (Primary). The Master's UUID survives. The Secondary's UUID is destroyed.

**Field Conflict Resolution**  
For every field where A and B differ (e.g., differing Job Titles), the UI highlights the row and forces the user to choose which value survives via radio buttons.

**Data Aggregation (Timeline Merge)**  
The history is completely merged. All Emails, Tickets, Orders, and Notes from the Secondary contact are re-parented to the Primary contact's UUID.

**Lists & Segments**  
The Primary contact inherits all static List memberships of the Secondary. Dynamic Segments re-evaluate automatically.

**Rollback Policy**  
Merges are strictly **IRREVERSIBLE**. The UI MUST communicate this clearly before final execution.

**Performance**  
Because merging involves migrating thousands of foreign keys (Timeline events), it executes as an asynchronous background job. The UI shows a "Merging..." status toast.

## 6.10 Contact Ownership

**Assign Owner**  
By default, contacts are owned by their creator. The Owner is a lookup to the `Users` table.

**Change Owner**  
Achieved via inline edit on the Contact Details page.

**Bulk Assignment**  
The Data Grid supports selecting N contacts and assigning them to a specific agent (e.g., distributing leads to a sales team).

**Ownership History**  
Logged in the Timeline: *"Ownership transferred from Alice to Bob."*

**Notifications**  
When Bob is assigned a new contact manually, he receives an in-app notification.

## 6.11 Audit History

**Philosophy**  
Every mutation MUST leave a footprint.

**Tracked Events**  
Create, Edit (Field-level diffs), Archive, Restore, Merge, Owner Reassignment.

**Timestamp Precision**  
Recorded in UTC, down to the millisecond.

**Actor & Source**  
The log MUST record *who* did it (User ID) and *how* they did it (UI, API Key, System Cron).

**Filtering**  
Accessible via the Contact Details Timeline by filtering for "System Events".

**Retention**  
Audit logs are retained indefinitely while the workspace is active, complying with SOC2 requirements.

## 6.12 Notifications & User Feedback

**Success Messages**  
Brief, auto-dismissing green toasts (e.g., *"Contact saved"*).

**Warnings**  
Yellow toasts requiring manual dismissal if action is needed.

**Background Job Notifications**  
Long-running tasks (Bulk Delete, Merge) yield a persistent status toast with a progress spinner. Upon completion, it turns green and says *"Merge complete"*.

## 6.13 Security & Permissions

**Role-Based Access Control (RBAC)**  
Actions are guarded by specific scopes:
- `contact:read`: View the grid and details.
- `contact:create`: Open the creation panel.
- `contact:edit`: Perform inline edits.
- `contact:delete_soft`: Archive contacts.
- `contact:delete_permanent`: Hard delete (Admin only).
- `contact:merge`: Execute merges.

**Sensitive Field Editing**  
Certain Custom Fields can be marked "Restricted" by admins, requiring a specific elevated role to edit, regardless of general `contact:edit` permissions.

## 6.14 Accessibility

**Keyboard-only Workflows**  
The entire Merge Wizard and Create panel MUST be navigable via Tab, Space, and Enter.

**Focus Management**  
When a modal opens, focus is trapped inside. When closed, focus returns to the triggering button.

**Error Announcements**  
Form validation errors MUST use `aria-live="assertive"` so screen readers announce them immediately.

## 6.15 Performance Requirements

- **Create Latency**: A single contact creation via the UI MUST resolve in < 300ms.
- **Edit Save Latency**: Inline edits MUST resolve in < 200ms.
- **Merge Processing**: Merging two contacts with 5,000 timeline events MUST complete in the background in < 5 seconds.
- **Duplicate Detection**: The `onBlur` typeahead check MUST resolve in < 150ms.

## 6.16 Design Decisions

**Why is Merging irreversible?**  
*Alternative:* Allow a "Split" action later.  
*Reasoning:* Splitting heavily interleaved timeline data (e.g., determining which person actually sent an email after a merge) is logically impossible to do perfectly. Implementing an irreversible merge forces users to be careful and drastically simplifies database architecture.

**Why are emails forced to lowercase?**  
*Reasoning:* `John@Doe.com` and `john@doe.com` are technically identical in SMTP routing. Failing to normalize case is the #1 cause of duplicate database records in legacy CRMs.

## 6.17 Acceptance Criteria

- [ ] Create Contact form requires at least one primary identifier (Email, Phone, Last Name).
- [ ] Duplicate detection visually warns the user before form submission.
- [ ] Inline editing triggers an optimistic update and reverts gracefully on failure.
- [ ] Concurrent edits correctly throw a Conflict warning instead of overwriting data silently.
- [ ] Archiving a contact removes it from standard views and segment counts instantly.
- [ ] Permanent delete scrubs PII and leaves a tombstone.
- [ ] The Merge Wizard forces conflict resolution for every mismatched field.
- [ ] Background merges successfully re-parent all foreign key relationships (notes, orders, etc.).
- [ ] Field-level changes correctly append to the Audit Log.

---

# SECTION 7 — PLATFORM METADATA & CUSTOM FIELDS ENGINE

## 7.1 Metadata Philosophy

**Why Enterprise SaaS Requires Metadata**  
Hardcoded database columns (e.g., `alter table contacts add column favorite_color varchar`) fail at enterprise scale. They cause database bloat, require engineering time for every customer request, and create rigid schemas that cannot adapt to diverse industries. An E-commerce tenant needs `Lifetime Value`, while a Real Estate tenant needs `Preferred Neighborhood`. 

**Platform-wide Principles**  
ReactCommerce utilizes an Entity-Attribute-Value (EAV) or JSONB metadata architecture natively. The frontend and APIs treat Custom Fields exactly the same as System Fields. 

**Workspace-Level Customization**  
Every Workspace defines its own isolated schema. A Custom Field created in Workspace A does not exist in Workspace B. 

**Forward Compatibility & Upgrade Safety**  
By completely decoupling business logic from the underlying storage schema, the core platform can be upgraded seamlessly without breaking tenant-specific configurations.

**Separation of Business Data**  
System Fields (core identity, auth, timestamps) are hardcoded. Metadata (industry-specific data) lives in the engine. This separation ensures core platform APIs never fail due to a tenant's misconfigured custom field.

## 7.2 Metadata Architecture

**System Fields**  
Immutable fields hardcoded into the platform schema (e.g., `id`, `email`, `created_at`). Cannot be renamed, deleted, or altered by users.

**Workspace Fields (Custom Fields)**  
Defined by Workspace Admins. Fully mutable. Handled dynamically by the UI and API.

**Module Fields**  
Custom fields scoped to a specific module (e.g., a custom field on `Order` vs `Contact`).

**Computed Fields**  
Read-only fields whose values are derived dynamically (e.g., `Age` computed from `Date of Birth`).

**Formula Fields**  
Read-only fields evaluating a user-defined mathematical or logical expression across other fields.

**Relationship Fields**  
Fields that store foreign keys to other entities (e.g., `Assigned Account Manager` pointing to a User).

**Hidden Fields**  
Fields active in the API and automation engines but excluded from standard UI forms to prevent clutter.

**Protected / Sensitive Fields**  
Require elevated privileges to view or edit. Values are masked by default.

**Deprecated Fields**  
Fields marked for sunsetting. They remain readable and filterable but cannot be populated on new records.

**Archived Fields**  
Soft-deleted fields. Their historical data remains in the database but they are completely hidden from the UI and API.

**Future Reserved Fields**  
The system maintains a registry of reserved system keys (e.g., `type`, `metadata`) that users cannot use for Custom Field keys to prevent namespace collisions.

## 7.3 Field Types

Every field type enforces strict validation, storage, and rendering rules.

**Text Types**  
- **Single Line Text**: Max 255 chars. Used for names, small strings. Renders as `<input type="text">`.
- **Multi Line Text**: Max 10,000 chars. Renders as `<textarea>`.
- **Rich Text**: Max 100,000 chars. Stores HTML/Markdown. Renders via a WYSIWYG editor.

**Numeric Types**  
- **Number**: Supports Integers and Floats. Admins configure min/max/precision.
- **Currency**: Number + Currency Code (ISO 4217). Renders with currency symbol.
- **Percentage**: Number stored as a decimal (e.g., `0.15`), rendered as `15%`.

**Contact Types**  
- **Email**: Validates via Regex. Renders as `mailto:` link in read-mode.
- **Phone**: Validates via E.164. Renders with country flag selector in forms.
- **Website**: Validates via URL Regex. Renders as `_blank` anchor tag.

**Temporal Types**  
- **Date**: Stores `YYYY-MM-DD`. Renders via localized DatePicker.
- **Time**: Stores `HH:MM:SS`. Renders via TimePicker.
- **DateTime**: Stores ISO 8601 UTC. Renders localized.
- **Duration**: Stores seconds. Renders as `X hours Y mins`.

**Selection Types**  
- **Dropdown**: Single select from a pre-defined Enum list.
- **Multi Select**: Array of Enums. Renders as a tag-input or checkbox list.
- **Radio**: Mutually exclusive single select (best for < 5 options).
- **Checkbox Group**: Array of booleans.

**Location Types**  
- **Country**: Enum of ISO 3166-1 alpha-2 codes. Renders as flag dropdown.
- **State/City/Address**: Hierarchical cascading dropdowns.
- **Latitude/Longitude**: Float values. Renders as a mini-map in read-mode.

**Media & Specialized Types**  
- **File / Image**: Stores an array of CDN URLs. Renders as thumbnail previews.
- **Color**: Stores HEX. Renders as a color picker.
- **JSON**: Validates against a schema. Renders in a monospaced code editor (Admin only).

**Advanced Types**  
- **Formula**: User-defined calculation. Read-only.
- **Lookup**: Pulls a value from a related record (e.g., Contact's Company Name).
- **Relationship**: Links to another entity ID.
- **AI Generated**: Read-only field populated asynchronously by an LLM prompt executing on other fields.

**System Types**  
- **Auto Increment**: Read-only sequence (e.g., Ticket ID `TKT-1002`).
- **UUID**: Unique identifier.
- **Barcode / QR Code**: Renders the underlying string as a scannable image.

**Extensibility**  
The field type registry MUST be modular, allowing engineers to add a new type (e.g., `Signature`) by implementing a single interface defining `StorageSchema`, `UIComponent`, and `ValidationRule`.

## 7.4 Field Creation Wizard

Accessed via Settings > Data Management > Custom Fields.

**Wizard Flow**  
1. **Choose Type**: Visual grid of field types with descriptions.
2. **Configure Details**: Name, Description, Group, Validation.
3. **Review & Create**: Summary of the schema change.

**Templates**  
Offers predefined templates (e.g., "NPS Score", "UTM Parameters") to accelerate creation.

**System Name Generation**  
As the user types the human-readable `Field Name` (e.g., "Favorite Color"), the wizard auto-generates a snake_case `System Name` (e.g., `favorite_color`). This key is immutable after creation.

**Conflict Detection**  
The wizard validates the `System Name` against reserved keys and existing fields in real-time.

**Preview**  
A live preview panel shows exactly how the field will render in a form and on a details page.

**Permissions**  
Only `workspace:admin` can create fields.

## 7.5 Field Configuration

Every field supports granular property configuration:

- **Field Name**: Mutable. Human-readable (e.g., "Annual Revenue").
- **System Name**: Immutable. API key (e.g., `annual_revenue`).
- **Description / Help Text**: Renders as an info tooltip `(?)` next to the field label in forms.
- **Placeholder**: Grey ghost text inside empty inputs.
- **Default Value**: Auto-populates during record creation.
- **Validation Rules**: Min, Max, Length, Regex pattern.
- **Required**: Boolean. If true, records cannot be saved without it.
- **Unique**: Boolean. If true, the database enforces uniqueness across the workspace.
- **Searchable**: If true, included in the global fuzzy search index (impacts performance).
- **Filterable / Sortable**: If true, appears in the Data Grid column headers and query builder.
- **Visibility**: 
  - `Visible`: Standard.
  - `Hidden`: API only.
  - `Read-only`: UI cannot mutate.
- **Security**:
  - `Sensitive`: Masked by default.
  - `Encrypted`: Stored via AES-256 at rest (cannot be sorted/filtered).
  - `Audit Enabled`: Changes track in the Audit Log.
  - `Automation Enabled`: Usable in workflows.
  - `AI Enabled`: Sent to LLM context windows.
  - `Reporting Enabled`: Synced to the analytical data warehouse.

## 7.6 Field Lifecycle

**Update (Rename)**  
Renaming the human label instantly updates all UI views. API integrations using the `System Name` are unaffected.

**Archive**  
Soft deletion. The field vanishes from the UI, but the underlying data persists. Queries to the API requesting the field return `null`.

**Restore**  
Unhides the field. Data is instantly accessible again.

**Deprecate**  
Marks the field with a warning icon. It cannot be added to new forms or edited on new records, but existing data remains visible. Used for migrating schemas gracefully.

**Delete (Hard)**  
Irreversible. Drops the column/JSON key and permanently deletes all associated data across the workspace. Requires a multi-step "Type DELETE to confirm" modal.

**Convert**  
Certain types can be converted (e.g., Single Line Text -> Multi Line Text). Lossy conversions (Text -> Number) are PROHIBITED to prevent data corruption.

## 7.7 Formula Engine

**Overview**  
Allows admins to create Excel-like formulas to compute values dynamically.

**Supported Syntax**  
- **Operators**: `+`, `-`, `*`, `/`, `>`, `<`, `=`, `AND`, `OR`.
- **Functions**: `CONCAT()`, `UPPER()`, `DATEDIFF()`, `IF()`, `COALESCE()`.
- **References**: Fields are referenced via brackets: `[annual_revenue] * 0.1`.

**Cross-Field Formulas**  
Formulas can reference any other field on the entity.

**Error Handling & Circular Dependencies**  
The UI MUST evaluate the formula AST (Abstract Syntax Tree) upon saving. If a circular reference is detected (`A depends on B, B depends on A`), the save is blocked. Divide-by-zero errors resolve to `null` gracefully.

**Calculation Timing & Performance**  
Formulas MUST NOT evaluate on read (which kills list-view performance). They MUST evaluate on write. When Field A changes, a database trigger or background worker re-calculates Formula Field B and persists the result.

## 7.8 Relationships

**Concept**  
Relationships allow connecting entities (e.g., linking a `Contact` to a `Company`).

**Cardinality**  
- **One-to-One**: E.g., Contact <-> Passport Record.
- **One-to-Many**: E.g., Company -> Contacts.
- **Many-to-Many**: E.g., Contacts <-> Tags.

**Reference Integrity & Deletion Rules**  
When configuring a relationship, the admin must define cascading behavior:
- `RESTRICT`: Prevent deletion of the parent if children exist.
- `CASCADE`: Deleting the parent deletes all linked children.
- `SET NULL`: Deleting the parent leaves the child, but nullifies the relationship field.

## 7.9 Rendering Rules

**Grid**  
Fields render compactly. Objects/Arrays render as summarized pills (e.g., `[3 Tags]`).

**Forms**  
Fields stack vertically. Grouped fields render within Accordions or Cards.

**Search & Filters**  
Only fields marked `Searchable`/`Filterable` appear in the Query Builder. The UI dynamically loads the correct operator set based on the Field Type (e.g., Dates get "Before/After", Numbers get "Greater/Less").

## 7.10 Validation Framework

**Validation Timing**  
- **Client**: Evaluates instantly `onBlur` using HTML5 constraints and regex to provide rapid feedback.
- **Server**: Evaluates on payload submission. The ultimate source of truth.

**Cross-Field Dependency Validation**  
Admins can define rules like: *"If `Status` = 'Closed', then `Closed Reason` is Required."*

**Error Messaging**  
Messages must be user-friendly. Instead of *"Regex ^[0-9]+$ failed"*, display *"This field only accepts numbers."*

## 7.11 Permissions

Access to metadata configuration is strictly governed:
- `workspace:admin`: Complete control over Custom Fields.
- `module:admin`: Can manage fields scoped only to their module (e.g., Sales Manager can edit Order fields, but not Contact fields).
- **Field-Level Security (FLS)**: Specific custom fields can be restricted so only specific roles (e.g., `Finance`) can view or edit them.

## 7.12 Performance

**Metadata Caching**  
The schema definition (which fields exist, their types, their validation rules) changes rarely but is read constantly. It MUST be cached heavily in Redis and memoized in the React frontend via a global context provider.

**Large Workspaces**  
The engine MUST support up to 1,000 Custom Fields per entity without significant performance degradation.

**JSONB Indexing**  
If using Postgres `JSONB` for storage, `Searchable` fields MUST automatically receive GIN indexes.

## 7.13 Platform-wide Usage

**Inheritance**  
Every module (Orders, Tickets, Campaigns) utilizes this exact same React component library `<DynamicForm />`, `<DynamicGrid />` and the same backend validation engine.

**Extension Points**  
When a new module is created, it simply registers its Entity Name (`inventory_item`) with the Metadata Engine, and instantly gains support for Custom Fields, APIs, and UI generation without writing custom CRUD code.

## 7.14 Design Decisions

**Why JSONB over EAV tables?**  
*Alternative:* Entity-Attribute-Value (EAV) tables (`entity_id, attribute_id, value`).  
*Reasoning:* EAV requires massive, slow JOIN operations to reconstruct a single record. Modern Postgres `JSONB` columns allow storing the entire custom payload in a single row, drastically improving read performance and allowing native indexing.

**Why evaluate Formulas on Write?**  
*Alternative:* Compute dynamically on the frontend or via SQL Views on read.  
*Reasoning:* Computing on read destroys pagination and sorting performance. If a user sorts a grid of 1,000,000 records by a Formula Field, the DB must evaluate the formula 1,000,000 times before sorting. Storing the computed result on write ensures O(1) read performance.

## 7.15 Acceptance Criteria

- [ ] Creating a Custom Field instantly makes it available in the Module's API, UI Forms, and Data Grid.
- [ ] Attempting to save a record violating a Custom Field's Regex returns a 400 Bad Request.
- [ ] Formula fields successfully block circular reference creation.
- [ ] Deleting a field permanently scrubs the JSON key from all historical database rows asynchronously.
- [ ] Field-Level Security hides restricted fields entirely from unauthorized users' API payloads.
- [ ] Searching against a newly created Custom Field works in the UI Query Builder.

---

# SECTION 8 — PLATFORM NAVIGATION & LAYOUT ARCHITECTURE

This section defines the permanent navigation, layout, and information architecture standard for ReactCommerce.

## 8.1 Global Information Architecture

**Hierarchy Flow**
1. **Platform**: ReactCommerce itself.
2. **Organization**: The billing entity (e.g., "Acme Corp").
3. **Workspace**: The strict tenant boundary (e.g., "Production Workspace"). Data never bleeds across Workspaces.
4. **Modules**: Top-level functional areas (Audience, Campaigns, Inbox, Automations, Settings).
5. **Pages**: A specific view within a module (e.g., "Contacts List").
6. **Views**: Filtered states of a page (e.g., "My Active Contacts").
7. **Records**: A specific entity instance (e.g., "John Doe").
8. **Panels**: Logical groupings of fields on a record (e.g., "Contact Info").
9. **Components**: UI elements (e.g., "TextInput").
10. **Actions**: Mutations (e.g., "Save").

## 8.2 Layout System (Z-Index Matrix)

Every page MUST conform to the strict spatial matrix.

**Layout Regions**
1. **L0: Background**: The base canvas (`var(--bg-canvas)`).
2. **L1: Global Sidebar**: (`z-index: 40`).
3. **L2: Module Sidebar**: (`z-index: 30`).
4. **L3: Top Toolbar / Header**: (`z-index: 20`). Fixed to the top of the content area.
5. **L4: Content Area**: The scrollable `<main>` container.
6. **L5: Side Panel (Drawer)**: (`z-index: 50`). Slides over L4.
7. **L6: Modal / Dialog**: (`z-index: 100`). Requires a backdrop blur covering L1-L5.
8. **L7: Toasts & Popovers**: (`z-index: 200`).

## 8.3 Dual-Sidebar Navigation

ReactCommerce abandons the legacy "Expandable Monolithic Sidebar" in favor of an Enterprise Dual-Sidebar model to maximize horizontal data real estate.

**1. Global Navigation (GlobalSidebar)**
- **Placement**: Fixed to the extreme left edge. Width: `64px` strictly.
- **Content**: App Logo, Workspace Switcher, Primary Module Icons (Audience, Campaigns, Inbox), Global Search Trigger (`Cmd+K`), Notifications, User Avatar.
- **Behavior**: Remains pinned at 64px. It does not expand horizontally to reveal labels. Labels are shown via tooltips on hover.

**2. Contextual Sub-Navigation (ModuleSidebar)**
- **Placement**: Second column, directly right of the Global Nav. Width: `240px` strictly.
- **Content**: Contextual to the active module. If the user is in Audience, this sidebar shows: Contacts, Companies, Lists, Segments.
- **Visibility**: Can be toggled open/closed (`Cmd + \`) by the user to maximize grid space.

## 8.4 Context Preservation (Slide-out Drawers)

**Mandate**: The system MUST NEVER redirect a user to a full-page view for simple mutations. 
Clicking a row in a Data Grid opens an `L5: Side Panel (Drawer)` by default for quick edits. This allows the user to perform an action and instantly return to their filtered list of records without reloading the page context. 

## 8.5 Global Search Experience (`Cmd+K`)

ReactCommerce uses a keyboard-first Command Palette. Persistent search input boxes in headers are deprecated.
- **Scope**: Search Records, Navigate to settings, Trigger actions ("Create Contact").
- **Performance**: Must render UI in < 50ms and return server-side fuzzy results in < 150ms.

## 8.6 Acceptance Criteria
- [ ] The DOM is structured with a GlobalSidebar (`64px`) and a ModuleSidebar (`240px`).
- [ ] The CSS layout enforces the 8-tier Z-Index hierarchy.
- [ ] Navigating between primary modules correctly swaps the ModuleSidebar context.
- [ ] The Command Palette triggers seamlessly via `Cmd+K` from any screen.
