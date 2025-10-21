## Commercial Invoice — Label and Data Expectations (v1)

### Scope

- Language: English
- Inputs: scanned or digital PDFs
- Table: single detailed items table; no summary tables
- Currency handling: add header field `invoice_currency` with default "USD". If header text indicates Euros (e.g., "Currency: Euros") or amounts clearly indicate EUR, set to "EUR"; user can override in Overlay 2. Amount columns remain numeric only (no symbols).

### Canonical Fields

#### Header (top section)

- invoice_no

  - Variants: Invoice No., Invoice NO., INVOICE NO., Invoice Number, INVOICE NO:
  - Structure: string
  - Location: top-left
  - Notes: May be near the page title; keep punctuation as-is

- invoice_date

  - Variants: Date, Invoice Date (may be combined with invoice number)
  - Structure: DATE (PostgreSQL date column)
  - Location: top-left
  - Notes: If ambiguous (e.g., 03/04/2025), prompt the user in Overlay 2 to choose DD‑MM vs MM‑DD while seeing the file preview; store the chosen parsed date as a DATE. When displaying in UI, render as “Month DD, YYYY”.

- incoterms
  - Variants: Terms, Terms of Delivery, Delivery Terms, Incoterms
  - Structure: string
  - Location: top-right or header panel
  - Notes: Examples include FOB, CIF, CFR; may be absent

#### Line items (single table)

- product_description

  - Variants: Description
  - Structure: string (single-line)
  - Location: table-left
  - Notes: Item description text

- product_quantity

  - Variants: Quantity, Qty, Quantity Carton, Quantity Case, Quantity BOX, Quantity PCS, etc.
  - Structure: integer (no decimals). If a decimal is detected, treat as misread column and prompt correction.
  - Location: quantity column (table-middle)
  - Notes:
    - Prefer packaging-specific quantity column when multiple exist; choose Carton/Case > Box > generic Qty/Quantity.
    - Store numeric value only (strip packaging text).

- unit_price

  - Variants: Unit Price
  - Structure: decimal number
  - Location: unit price column (right side)
  - Notes: Ignore currency symbols when present; store numeric value

- product_amount
  - Variants: Total, Amount, Invoice Value
  - Structure: decimal number
  - Location: amount/total column (right side)
  - Notes: Line total per item; ignore currency symbols when present

#### Totals (below items)

- total_quantity

  - Variants: Bottom-of-column total for Quantity/Qty (often unlabeled); sometimes expressed as Total Cases
  - Structure: integer
  - Location: directly below the quantity column
  - Notes: If multiple quantity columns exist, total corresponds to the selected quantity column

- total_amount
  - Variants: Bottom-of-column total for Amount/Total/Invoice Value (often unlabeled); sometimes appears as Total US Amount or Total Amount Due USD outside the table
  - Structure: decimal number
  - Location: directly below the amount/total column (or nearby summary area)
  - Notes: Treat “Total Amount Due USD” as the same overall total for this doc

### Extraction Guidance

- Header extraction uses label synonyms with case/whitespace/punctuation-insensitive matching and proximity to field values.
- Invoice date: parse when unambiguous; if ambiguous, require user choice DD‑MM vs MM‑DD in Overlay 2; persist as a DATE in the DB; display as “Month DD, YYYY”.
- For quantities with packaging in the column header, choose the packaging-specific column when present.
  - If both “Quantity Carton” and “Quantity Case/Box” appear, choose “Quantity Carton”.
  - If no packaging-specific quantity exists, use the generic “Quantity/Qty”.
- Strip currency symbols and text (e.g., $, USD, EUR) from unitPrice and productAmount; store as numbers. Record `invoice_currency` separately (default USD).
- Totals may be unlabeled; detect values directly beneath their respective columns. If a total appears outside the grid (e.g., right-side summary), use the nearest obvious grand total for totalAmount.

### Open Items / Future Notes

- Parties (seller/buyer) intentionally skipped for now; consider adding nullable fields later for cross-document checks.
- Taxes/discounts/freight ignored in v1.
