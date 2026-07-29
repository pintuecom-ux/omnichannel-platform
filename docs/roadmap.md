# Enterprise Features, Platform Evolution & Long-Term Roadmap (SDP 26)

With Audience v2.0 successfully architected and foundational APIs deployed, the path forward splits into three enterprise expansion horizons.

## Horizon 1: Workflow Orchestration & Journey Engines
- Integrating `platform_events` dynamically with a Node-based visual Journey Builder (e.g. if `contact.created` -> wait 2 hours -> send WhatsApp template).
- Event-driven webhook dispatch for out-of-band integrations (Salesforce, Hubspot sync).

## Horizon 2: Advanced Identity Graph & Multi-Tenant Big Data
- Transitioning `audience_metrics_snapshots` into a dedicated OLAP store (ClickHouse) for complex real-time reporting without adding index-strain on Supabase Postgres.
- Deploying machine learning models against `contact_merges` to surface "Suggested Merges" probabilistically before an admin manually requests them.

## Horizon 3: Multi-Agent Copilot
- Expanding `AIAudienceService.ts` from simple tag inference into a fully proactive Copilot.
- The Copilot will automatically structure natural language requests ("Find me VIPs who churned last month") into `ConditionSet` AST logic and directly render the Audience grid.
