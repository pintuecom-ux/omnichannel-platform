# Testing Strategy & Quality Engineering (SDP 25)

The CRM demands strict QA given the catastrophic impact of accidental merges or data loss.

## 1. Unit Testing (Jest)
We enforce business-logic boundaries in pure TypeScript classes (`*Service.ts`). 
- `IdentityService.ts` must pass unit tests covering deduplication algorithms and provider fallbacks.
- `SegmentService.ts` must pass structural integrity checks to verify AST payload parsing.
- Data transformations do not hit the database in these tests.

## 2. Integration Testing
Tests covering Supabase policies and RLS rules.
- Ensuring a `workspace_id` cannot be hijacked.
- Validating the triggers and nested RLS policies across `contact_consents` and `workspace_members`.

## 3. End-to-End Testing (Playwright)
Validating the primary operational loops of the React Server Components:
- **Contact360**: Navigating a contact's profile, editing custom fields, and applying tags.
- **Audience Filter**: Building a 3-layer nested segment query and asserting the visual grid updates to match.
