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

### [2026-07-25] Fixed Facebook Messenger Profile Querying & Contact Auto-Upgrading
- **Changes:** Updated `src/lib/platforms/facebook.ts` and `src/app/api/webhooks/facebook/route.ts`.
- **Details:** 
  1. Updated `FacebookClient.getUserProfile` to request `first_name,last_name,profile_pic` (the official Meta Graph API v22.0 field schema for Messenger PSIDs), resolving field type errors when querying PSIDs.
  2. Updated `processFBDM` in `/api/webhooks/facebook/route.ts` to detect if an existing contact record was previously saved with a numerical PSID or missing avatar. Incoming webhook events now automatically fetch Meta profile details and enrich the existing contact in Supabase.

### [2026-07-25] Fixed Frontend 400 Mark-Read Errors & Added Meta Messenger Seen Read Receipts
- **Changes:** Updated `src/components/inbox/ChatWindow.tsx`, `src/lib/platforms/facebook.ts`, `src/lib/platforms/instagram.ts`, and `src/app/api/messages/mark-read/route.ts`.
- **Details:** 
  1. Fixed repeated `POST 400` errors when opening conversations in `ChatWindow.tsx` by including the mandatory `conversation_id` parameter in the JSON payload when sending unread message read receipts.
  2. Implemented `markSeen` methods across `FacebookClient` and `InstagramClient` via `sender_action: 'mark_seen'`. When administrators open an unread Messenger or IG thread, `/api/messages/mark-read` invokes Meta Graph API to show "Seen" receipts directly on customer devices.

### [2026-07-25] Platform-Aware Read Receipts & Meta Graph API Error Unwrapping
- **Changes:** Modified `src/app/api/messages/mark-read/route.ts`, `src/app/api/messages/send/route.ts`, and `src/lib/platforms/facebook.ts`.
- **Details:** 
  1. Fixed a bug in `/api/messages/mark-read` where all incoming messages were assumed to be on WhatsApp, causing failures when reading Facebook/Instagram threads. Read receipts now check `conv.platform` before invoking the WhatsApp Cloud API.
  2. Enhanced `FacebookClient` (`sendMessage`, `replyToComment`, `getUserProfile`) and `/api/messages/send` to capture and unwrap Meta Graph API error payloads (`err.response.data.error.message`). This exposes the precise reasons for Graph API rejections (e.g. Development Mode restrictions or App Role requirements) rather than masking them as generic 500 exceptions.

### [2026-07-25] Fixed Facebook Webhook Vercel Serverless Termination & Added Debug Logs
- **Changes:** Updated `src/app/api/webhooks/facebook/route.ts` to explicitly `await handleFBEvents(body)` instead of using a fire-and-forget pattern.
- **Details:** In Vercel serverless environments, returning an HTTP response immediately terminates cloud function CPU execution. By properly awaiting the event processor, Vercel allows the Supabase DB lookups and message insertion transactions to finish. Also added detailed console logs (`[FB DM] ✅ Message saved successfully`, etc.) for easier debugging in production logs.

### [2026-07-25] Initial Knowledge Base Created
- **Changes:** Documented the tech stack, core architecture, and the newly implemented Facebook/Instagram integrations.
- **Details:** Built the Facebook OAuth flow (`/api/facebook/connect`, `callback`, `channel`) and the frontend connection UI (`FacebookChannelSettings`). The Meta App is currently verified and in development mode, ready for App Review submissions.
