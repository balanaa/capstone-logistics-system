# PRO Number (Universal Shipment ID)

## Definition

- The PRO Number is the universal identifier for a shipment/transaction across all departments (Shipment, Trucking, Finance, Verifier).
- All department records referring to the same shipment must share the same PRO Number.

## Format

- Pattern: `YYYYNNN`
  - `YYYY`: 4-digit year (e.g., 2025)
  - `NNN`: zero-padded sequence within the year (e.g., 001, 042, 421)
- Examples: `2025001`, `2025042`, `2025421`

## Constraints

- Uniqueness: PRO Number is globally unique across the entire system (all departments). A single PRO refers to one shipment shared by Shipment, Trucking, and Finance.
- Stability: PRO Number should not change after creation; updates are exceptional and require admin-level action.

## Usage

- Stored once as the canonical key with a unique index (table name can be `shipments` or `pro`): `PRIMARY KEY (pro_number)`.
- All `documents` rows link via `pro_number` (FK to the canonical table). No `shipment_id` is used.
- Used in routing: `/shipment/pro-number/:proNo`, `/trucking/pro-number/:proNo`, `/finance/pro-number/:proNo`.

## UI/Validation Notes

- Input validation: enforce `^\d{7}$` and check the first 4 digits are a plausible year (e.g., 2000–2099).
- Display: keep as plain numeric string (no separators).
