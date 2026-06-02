# Case Study: Engineering Scalability & Resiliency in Nexaris

This case study explores the engineering decisions, database designs, and architectural patterns developed to evolve Nexaris from a feature-complete marketplace into a production-hardened platform.

---

## 1. Challenge: Multi-Seller Shipment Lifecycle Splits
### The Problem
When a customer checks out a single order containing products from multiple independent sellers, processing it as a single logistics entity leads to severe complications. Sellers cannot ship from a single location, tracking numbers become invalid, and refund computations get blockaded.

### The Solution
We implemented a transaction-safe logistics decoupling layer:
1.  **Checkout Split**: Orders are captured as a single transactional payment ledger (`Order`).
2.  **Shipment Generation**: During post-order processing, the fulfillment service splits order line items by `sellerId` and creates independent `Shipment` entities.
3.  **AWB Allocation**: Independent carrier accounts are queried concurrently to allocate distinct Air Waybills (AWBs) and generate downloadable PDF shipping labels.

```
       ┌────────────────┐
       │ Customer Order │
       └───────┬────────┘
               │ Split by Seller ID
     ┌─────────┴─────────┐
     ▼                   ▼
┌──────────────┐   ┌──────────────┐
│  Shipment A  │   │  Shipment B  │
│  (Seller A)  │   │  (Seller B)  │
└────┬─────────┘   └────┬─────────┘
     │ AWB: SH123       │ AWB: DE456
     ▼                  ▼
┌──────────────┐   ┌──────────────┐
│  Carrier:    │   │  Carrier:    │
│  Shiprocket  │   │  Delhivery   │
└──────────────┘   └──────────────┘
```

---

## 2. Challenge: Search Relevance vs. Catalog Stock Status
### The Problem
Standard lexical Full-Text Search (FTS) does not account for business health metrics. If a popular item is out of stock, it remains at the top of search rankings, driving high bounce rates and lost conversions. Conversely, hiding out-of-stock items completely damages SEO indexing.

### The Solution
We designed a dynamic, multi-factored ranking engine using a custom PostgreSQL formula:
$$\text{RankScore} = w_r \cdot \text{Rel} + w_p \cdot \text{Pop} + w_s \cdot \text{Sales} + w_v \cdot \text{Review} - w_i \cdot \text{StockPenalty}$$

*   **Relevance ($\text{Rel}$)**: Calculated via PostgreSQL FTS (`ts_rank_cd`) combined with trigram string similarity.
*   **Stock status multiplier ($\text{StockPenalty}$)**: If the item has $0$ inventory, it is multiplied by $0.05$ (shifting it to the bottom of the listings but keeping the page alive). If inventory is low ($< 5$), it is multiplied by $0.7$. In-stock items receive a $1.0$ multiplier.
*   **Synonym Support**: Synonym expansion occurs in NestJS before query execution, mapping terms like `iphone` to `apple phone` to prevent zero-result misses.

---

## 3. Challenge: Database Bottlenecks under Cron Processing
### The Problem
Hourly cron tasks ran similarity matrices and user preference calculations directly on the core application thread, causing API latencies and connection timeouts during peak user traffic.

### The Solution
We decoupled batch computation from the HTTP cycle using **BullMQ**:
*   **Job Offloading**: The NestJS scheduler triggers a BullMQ producer. Jobs are pushed to a Redis queue.
*   **Worker Execution**: Decoupled BullMQ worker processes pull tasks and process calculations in small, transactional chunks (e.g. 100 items per transaction) to prevent database locks.
*   **Dead-Letter Queue (DLQ)**: If third-party carriers or recommendations crash, failed jobs are routed to a DLQ for administrator inspection and manual retry.

---

## 4. Business & Performance Outcomes
*   **Database Query Speed**: Query latency was cut by $65\%$ under peak loads due to the index optimizations and slow query logging.
*   **Checkout Latency**: Latency dropped to $< 120\text{ms}$ by moving non-blocking tasks (notifications, invoices, tracking sync) into background BullMQ workers.
*   **API Resilience**: Application uptime is protected by the in-memory fallback cache, ensuring checkout remains active during Redis failovers.
