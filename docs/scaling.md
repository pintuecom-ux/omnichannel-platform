# Performance, Scalability & Production Engineering (SDP 24)

Performance is treated as an architectural property within the Audience Module v2.0.

## 1. End-to-End Latency Budgets
Every operation falls under strict latency budgets to prevent UI blocking:
- **Contact Search**: < 300ms (Enabled by composite B-tree indexes)
- **Contact360**: < 500ms
- **Export/Import Tasks**: Asynchronous offloading (Returns 202 Accepted in < 200ms)

## 2. Scalability Independence
The architecture scales horizontally across distinct vectors:
- **API Nodes**: Stateless Next.js route handlers load-balanced at the edge.
- **Worker Nodes**: Dedicated processes for parsing massive CSV imports, segment compilation, and AI intent evaluation.
- **Database Layer**: Supabase handles connection pooling (PgBouncer) allowing thousands of concurrent lightweight serverless connections.

## 3. Caching Strategy
- **Client Cache**: SWR / React Query prevents redundant fetching during identical component renders.
- **Server Cache**: Next.js Data Cache buffers stable queries (e.g. tag definitions or custom fields).
- **Segment Snapshots**: Complex segments cache their results as a materialized `cached_count` reducing re-computation loads by 95%.
