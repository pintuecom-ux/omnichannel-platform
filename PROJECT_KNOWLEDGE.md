# Omnichannel Platform - Project Knowledge Base

This document serves as the central source of truth for the Omnichannel Platform project. It is designed to be read by AI agents and developers to quickly understand the project's architecture, tech stack, and current state.

**Project Path:** `D:\whatsapp-test\whatsapp\frontend\omnichannel-platform`

## 1. Tech Stack
- **Framework:** Next.js 16 (App Router)
- **UI & Styling:** React 19, Tailwind CSS v4, Lucide React
- **State Management:** Zustand
- **Database & Auth:** Supabase (PostgreSQL)
- **Forms & Validation:** React Hook Form, Zod

## 2. Core Architecture
The platform is a CRM/helpdesk application that aggregates messages from various channels into a unified inbox.
- **Database (Supabase):**
  - `profiles`: User information and workspace mapping.
  - `channels`: Connected integrations (WhatsApp, Facebook, Instagram, etc.) along with their Access Tokens and metadata.
  - `contacts`: Customers mapped across platforms via scoped IDs (e.g., `facebook_scoped_id`, `instagram_scoped_id`).
  - `conversations`: Threads linking a contact to a channel.
  - `messages`: Individual inbound/outbound messages and attachments.

## 3. Integrations Status

### WhatsApp
- **Status:** Fully Integrated. Webhooks are mapped to Vercel production (`/api/webhooks/whatsapp`).
- **Next Steps:** Needs App Review on Meta Developer Dashboard (screencast showing test message flow) to get `whatsapp_business_messaging` approved for production numbers.

### Facebook (Messenger & Comments)
- **Status:** Fully Integrated.
- **Backend:** 
  - OAuth flow built out at `/api/facebook/connect`, `/api/facebook/callback`, and `/api/facebook/channel`.
  - Webhook handler built at `/api/webhooks/facebook`. Supports Messenger DMs and Page feed comments.
- **Frontend:** UI built in `src/components/settings/FacebookChannelSettings.tsx` and linked to the channels dashboard.

### Instagram (DMs & Comments)
- **Status:** Fully Integrated.
- **Backend:** 
  - OAuth flow built at `/api/instagram/connect`, `/api/instagram/callback`, and `/api/instagram/channel`.
  - Webhook handler built at `/api/webhooks/instagram`. Supports Instagram DMs and Post comments.
- **Frontend:** UI built in `src/components/settings/InstagramChannelSettings.tsx` and linked to the channels dashboard.

## 4. Agent Directives & Maintenance
- **Webhooks:** The Meta webhooks point to a Vercel deployment. When testing locally, changes to webhook files (`route.ts`) must be deployed to Vercel, or a local tunnel (like `ngrok`) must be mapped to the Meta dashboard.
- **Authentication:** Supabase Service Role Keys are used in server-side webhook handlers (`admin` client) to bypass Row Level Security when receiving inbound payloads.

---
## Change Log & Notes

> **Note to AI Agents:** Upon any modification, feature addition, or significant update to the codebase, append the details below in reverse chronological order.

### [2026-07-25] Initial Knowledge Base Created
- **Changes:** Documented the tech stack, core architecture, and the newly implemented Facebook/Instagram integrations.
- **Details:** Built the Facebook OAuth flow (`/api/facebook/connect`, `callback`, `channel`) and the frontend connection UI (`FacebookChannelSettings`). The Meta App is currently verified and in development mode, ready for App Review submissions.
