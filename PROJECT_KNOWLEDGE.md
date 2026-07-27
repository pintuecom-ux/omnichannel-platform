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

### [2026-07-27] Unified Social Media Comments Workspace & 50/50 Split Right Panel Architecture
- **Changes:** Updated `src/stores/useInboxStore.ts`, `ConversationPanel.tsx`, `ConversationItem.tsx`, `ChatWindow.tsx`, `InfoPanel.tsx`, `src/lib/instagram/helpers.ts`, built `src/components/inbox/CommentsWindow.tsx`, `PostCommenterPanel.tsx`, and `/api/comments/action/route.ts`.
- **Details:**
  1. **Post-Centric Parent Thread Architecture:** Configured Instagram and Facebook comment threads to be grouped strictly by Post ID as the parent conversation, sorted by Recent Activity (`last_message_at`).
  2. **Left Panel Upgrades:** Removed "Instagram Comments" label and "Groups" tab on Comments view, showing platform filters (`All`, `IG`, `FB`). Rendered post media thumbnails and post titles in thread preview items.
  3. **Center Comments Workspace (`CommentsWindow.tsx` & `/api/comments/action`):** Built interactive threaded comments feed featuring live Meta Graph API `v25.0` moderation actions: liking/unliking comments, replying to user comments, brand self-commenting directly on posts, hiding/unhiding abusive comments (`is_hidden`), and deleting comments.
  4. **Right Panel 50/50 Split (`PostCommenterPanel.tsx`):** Designed a vertical 50/50 split layout. The top half renders a high-fidelity native Instagram / Facebook Page Post Card preview with Brand DP, media, highlighted hashtags, and engagement counts. The bottom half dynamically displays interactive commenter profile inspection, handle copy tools, and full comment history under the post whenever any comment card is clicked.

### [2026-07-25] Standardized All Meta Graph API Endpoints to v25.0
- **Changes:** Updated `src/lib/platforms/meta.ts`, `src/lib/platforms/facebook.ts`, `src/lib/instagram/service.ts`, `src/app/api/media/route.ts`, `src/app/api/planner/posts/route.ts`, `src/app/api/test/pages-read-user-content/route.ts`, and `src/app/api/debug/facebook-profile/route.ts`.
- **Details:** 
  1. Standardized all Graph API endpoints across Instagram, Facebook Pages, Messenger, WhatsApp, Media Library, Content Planner, and OAuth dialogs to version `v25.0`.

### [2026-07-25] Media Library, Content Planner & Dual-Platform Simultaneous Publishing
- **Changes:** Updated `src/components/sidebar/Sidebar.tsx`, `src/app/(dashboard)/pages/page.tsx`, `src/app/(dashboard)/planner/page.tsx`, `src/components/planner/CalendarView.tsx`, `CreatePostModal.tsx`, `src/app/api/media/route.ts`, `src/app/api/planner/posts/route.ts`, and `src/lib/instagram/service.ts`.
- **Details:**
  1. Renamed Pages & Posts to **Media Library** across sidebar and dashboard. Built `/api/media` to fetch all social media posts and chat messaging attachments (WhatsApp, Messenger, IG DMs) with Images, Videos, and Docs & PDFs filter tabs.
  2. Enhanced **Content Planner** with `/api/planner/posts` to sync published social posts (Instagram & Facebook Page) and scheduled publications directly onto their respective calendar date cells.
  3. Added Meta container status polling (`waitForContainerReady`) to wait for image container processing (`status_code === 'FINISHED'`) before publishing to Instagram.
  4. Implemented simultaneous dual-platform publishing to both **Instagram** (`publishMediaContainer`) and **Facebook Pages** (`POST /{page_id}/photos`) when selected in `CreatePostModal`.

### [2026-07-25] Meta App Review Test Endpoints & Frontend Avatar Rendering Upgrades
- **Changes:** Created `src/app/api/test/pages-read-user-content/route.ts`, `src/app/api/debug/facebook-profile/route.ts`, and updated `src/components/inbox/ConversationItem.tsx`, `ChatWindow.tsx`, and `InfoPanel.tsx`.
- **Details:** 
  1. Built `/api/test/pages-read-user-content` to execute required Graph API queries (`/feed`, `/published_posts`, `/tagged`, `/ratings`) using the Page Access Token to satisfy Meta's "0 of 1 API call(s) required" App Review requirement.
  2. Created `/api/debug/facebook-profile` to perform comprehensive Meta Graph API diagnostic tests for PSIDs and tokens.
  3. Updated inbox components to render `contact.avatar_url` images, added `.replace(/&amp;/g, '&')` sanitization for HTML-escaped URLs, and implemented stateful `onError` handlers that fall back to initial avatar badges when Meta Dev Mode restricts PSID picture endpoints.

### [2026-07-25] Upgraded Facebook Contact Picture Endpoint & Avatar Fallback
- **Changes:** Modified `src/lib/platforms/facebook.ts`.
- **Details:** 
  1. Enhanced `FacebookClient.getUserProfile` to query Meta's dedicated `/{psid}/picture` endpoint (`type=large`, `redirect=false`) if the `profile_pic` field is missing from standard field responses.
  2. Implemented direct Meta Graph CDN avatar URL fallbacks (`/{psid}/picture?type=large&access_token=...`) so user display pictures (DP) are reliably retrieved even if text name fields are restricted during Development Mode.

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
