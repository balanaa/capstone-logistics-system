## Bill of Lading — Label and Data Expectations (v1)

### Scope

- Language: English
- Inputs: scanned or digital PDFs
- Table: columns typically in one row (not lined), but multiple container/seal pairs may appear
- Units: KGS only for weights

### Canonical Fields

#### Header (top section)

- bl_number

  - Variants: B/L No., Waybill No., B/L, B/L NO., B L. No, SEA WAYBILL NO., Bill Of Lading NO.
  - Structure: string
  - Location: top-right (commonly); occasionally bottom-left
  - Notes: Don't keep punctuation (e.g., OAK/MNA/02514 store as OAKMNA02514)

- shipper

  - Variants: Shipper, Shipper/Exporter, Shipper Name
  - Structure: multiline string (preserve line breaks)
  - Location: top-left-above
  - Notes: Full text including address; do not strip phone

- consignee

  - Variants: Consignee
  - Structure: multiline string (preserve line breaks)
  - Location: top-middle-left-under
  - Notes: Full text including address; do not strip phone

- shipping_line

  - Variants: carrier names/aliases as printed (e.g., YANG MING, MAERSK, ONE / OCEAN NETWORK EXPRESS, EVERGREEN, KMTC, RCL / REGIONAL CONTAINER LINES, TRAMAR, MSC, COSCO, HAPAG-LLOYD, OOCL, CMA CGM, APL)
  - Structure: string (normalized short name, e.g., ONE, MAERSK, YANG MING)
  - Location: page header area (upper-left or upper-right); may appear as styled text or near a logo
  - Notes: Not label-based; derive from header text/logo. Normalize via alias map (e.g., OCEAN NETWORK EXPRESS → ONE; RCL → REGIONAL CONTAINER LINES; YM → YANG MING).

- vessel_name

  - Variants: Vessel, Ocean Vessel, Exporting Carrier (Vessel)
  - Structure: string
  - Location: top-lower-middle (left or right)
  - Notes: May be combined with voyageNo on source; separators can be spaces, slashes, or variable spacing (e.g., "KMTC BANGKOK /2205S"). We store split fields.

- voyage_no

  - Variants: Voyage No., Voy No., Voyager No.
  - Structure: string
  - Location: top-lower-middle (left or right)
  - Notes: Often adjacent to vesselName; may be combined on source

- port_of_loading

  - Variants: Port of Loading
  - Structure: string
  - Location: upper section (often above Port of Discharge and Place of Delivery)

- port_of_discharge

  - Variants: Port of Discharge, SEA PORT OF DISCHARGE
  - Structure: string
  - Location: upper section (often adjacent to Port of Loading)

- place_of_delivery (derived; required)
  - Source: derived from consignee block (no dedicated label field)
  - Structure: string (one of: SUBIC, CLARK, MANILA)
  - Location: derived from consignee text (not a labeled field)
  - Derivation logic (case-insensitive on consignee block):
    - If includes "SUBIC" → "SUBIC"
    - Else if includes "CLARK" (covers CLARKFIELD/CLARK FIELD) → "CLARK"
    - Else → "MANILA"

#### Line items (single row across columns)

- container_specs

  - Variants: appears near Number of Packages/Marks and Numbers
  - Structure: string (raw)
  - Location: table-left-middle
  - Notes: Examples: 1x40 HC, 2x40'HQ, 40 HQ. Raw only; no parsed fields in v1.

- container_seal_pairs

  - Variants: Container No./Seal No., Container/ Seal No., CNTR.NOX.W/SEAL NOS. (embedded)
  - Structure: array of pairs: [{ containerNo: string, sealNo: string }]
  - Location: table-left (often inside/near Marks and Numbers column)
  - Notes: Preserve pairing and order when multiple pairs exist

- no_of_packages

  - Variants: QUANTITY, No. of Packages, NUMBER OF PACKAGES
  - Structure: integer
  - Location: table-middle
  - Notes: Leading count extracted from combined text (strip commas)

- packaging_kind

  - Variants: Kind of Packages, Number and kind of packages
  - Structure: string
  - Location: table-middle
  - Notes: Packaging type (e.g., CARTONS, CASES, BOXES)

- goods_classification

  - Variants: derived from context (e.g., GROCERY ITEMS, FROZEN MEAT, KITCHENWARE)
  - Structure: string
  - Location: table-middle
  - Notes: Content category of the shipment

- description_of_goods

  - Variants: DESCRIPTION OF PACKAGES AND GOODS, DESCRIPTION OF Goods, Description of Goods, Description of Goods Said To Contain
  - Structure: multiline string (preserve line breaks)
  - Location: table-middle
  - Notes: Product names; may include weights/volumes; do not extract HS codes

- gross_weight
  - Variants: GROSS WEIGHT, Gross Weight, Weight, Gross Weight (KGS)
  - Structure: decimal (KGS)
  - Location: table-right
  - Notes: Capture KGS only; ignore LBS

### Extraction Guidance

- Labels are matched case/whitespace/punctuation-insensitively, using proximity.
- shipping_line: scan the top header area (e.g., top 15% of the first page) for known carrier keywords; use case-insensitive fuzzy match against a dictionary; ignore styling. If text is absent but a logo exists, optionally use image OCR/vision as a fallback. Normalize via alias map (e.g., OCEAN NETWORK EXPRESS → ONE).
- Vessel/Voyage: if printed together (e.g., "YM UNICORN 059W"), split into vesselName="YM UNICORN" and voyageNo="059W".
- Container/Seal: detect and group as pairs; allow multiple pairs. If containers and seals are separated by lines or slashes, align by reading order.
- Packages: parse the combined "Number and kind of packages" text — extract leading integer as noOfPackages; remainder (uppercased/trimmed) as packagingKind.
- placeOfDelivery: derive from consignee block using the SUBIC/CLARK/MANILA rules above; never blank.
- Weights: only grossWeight is captured for BoL; cross-check with Packing List totalGrossWeight later (separate step).
