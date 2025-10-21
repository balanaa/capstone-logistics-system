## Packing List — Label and Data Expectations (v1)

### Scope

- Language: English
- Inputs: scanned or digital PDFs
- Focus: weights instead of prices
- Table: single detailed items table; totals always cited (either under columns or in a separate totals area)
- Units: KGS only; ignore LBS

### Canonical Fields

#### Line items (single table)

- product_description

  - Variants: Description, Commodity & Description, Description of Goods
  - Structure: string (single-line)
  - Location: table-left
  - Notes: Item description text

- product_quantity

  - Variants: Quantity, Qty (and packaging-specific headers like Quantity Carton, Quantity Case, Quantity BOX, Quantity PCS)
  - Structure: integer
  - Location: quantity column (table-middle)
  - Notes:
    - Choose packaging-specific quantity when available; prefer Carton/Case > Box > generic Qty/Quantity.
    - Store numeric value only (strip packaging text).

- product_net_weight

  - Variants: Net Weight, Netweight, NET
  - Structure: decimal (KGS)
  - Location: weight column (table-right)
  - Notes: When two adjacent weight columns are unlabeled (e.g., both "Weight(KG)"), the smaller value is Net.

- product_gross_weight
  - Variants: Gross Weight, Weight, Gross W., Grossweight, Gross
  - Structure: decimal (KGS)
  - Location: weight column (table-right)
  - Notes: When two adjacent weight columns are unlabeled (e.g., both "Weight(KG)"), the larger value is Gross.

#### Totals (below items)

- total_quantity

  - Variants: Bottom-of-column total for Quantity/Qty (often unlabeled)
  - Structure: integer
  - Location: directly below the quantity column
  - Notes: Use the cited total; do not recompute.

- total_net_weight

  - Variants: Total Net Weight (or unlabeled total beneath weight columns)
  - Structure: decimal (KGS)
  - Location: bottom of weight columns or separate totals area
  - Notes: If unlabeled totals appear for two adjacent weight columns, the smaller total is Net.

- total_gross_weight
  - Variants: Total Gross Weight (or unlabeled total beneath weight columns)
  - Structure: decimal (KGS)
  - Location: bottom of weight columns or separate totals area
  - Notes: If unlabeled totals appear for two adjacent weight columns, the larger total is Gross.

### Extraction Guidance

- Use label synonyms with case/whitespace/punctuation-insensitive matching and proximity to field values.
- For quantities with packaging in the column header, choose the packaging-specific quantity column when present. Preference order: Carton > Case/Box > generic Qty/Quantity.
- When encountering two adjacent "Weight(KG)" columns without explicit Net/Gross labels, assign smaller to productNetWeight and larger to productGrossWeight for each row.
- Totals are always cited; capture the cited totals either directly beneath the columns (unlabeled) or from a labeled totals area (e.g., "Total Net Weight", "Total Gross Weight").
