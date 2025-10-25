## Delivery Order — Label and Data Expectations (v1)

### Scope

- Language: English
- Inputs: scanned or digital PDFs
- Table: container/seal pairs table with delivery information
- Units: Date format MM/DD/YYYY for detention free time end

### Canonical Fields

#### Header (top section)

- pickup_location

  - Variants: Pickup Location, Collection Point, Origin Location, Pick-up Location
  - Structure: multiline string (preserve line breaks)
  - Location: top section
  - Notes: Full address including street, city, country; preserve formatting

- empty_return_location

  - Variants: Empty Return Location, Return Location, Empty Container Return, Drop-off Location
  - Structure: multiline string (preserve line breaks)
  - Location: top section (often adjacent to pickup location)
  - Notes: Full address where empty containers should be returned; preserve formatting

- detention_free_time_end

  - Variants: Detention Free Time End, Free Time End, Detention Period End, Free Time Expiry
  - Structure: string (MM/DD/YYYY format)
  - Location: top section or header area
  - Notes: Date when detention charges begin; store as string in MM/DD/YYYY format

#### Container/Seal Pairs (table section)

- container_seal_pairs

  - Variants: Container No./Seal No., Container/Seal, CNTR.NO/SEAL NO., Container Number/Seal Number
  - Structure: array of pairs: [{ containerNo: string, sealNo: string }]
  - Location: table section (separate but visually connected to header fields)
  - Notes:
    - Preserve pairing and order when multiple pairs exist
    - Display as separate rows but maintain visual connection to main document
    - Format: "Container No. / Seal No." with values joined by " / "

### Display Format

The delivery order document displays information in a structured format:

1. **Header Fields** (3 columns):

   - Pickup Location
   - Empty Return Location
   - Detention Free Time End

2. **Container Table** (separate but connected):
   - Container No. / Seal No. pairs displayed as individual rows
   - Maintains visual connection to the main document fields
   - Supports multiple container/seal pairs

### Extraction Guidance

- **Location Fields**: Extract full addresses including street addresses, cities, and countries. Preserve line breaks and formatting for readability.
- **Date Field**: Parse detention free time end as MM/DD/YYYY format. If ambiguous date formats are detected, prompt user for clarification.
- **Container/Seal Pairs**:
  - Detect and group container numbers with their corresponding seal numbers
  - Allow multiple pairs per delivery order
  - If containers and seals are separated by lines or different formatting, align by reading order
  - Display each pair as a separate row with "Container No. / Seal No." label
- **Visual Connection**: Container/seal pairs should appear separate from the main 3-column header but maintain visual connection to indicate they belong to the same delivery order document.

### Data Storage

- **pickup_location**: Stored as raw_value in document_fields table
- **empty_return_location**: Stored as raw_value in document_fields table
- **detention_free_time_end**: Stored as raw_value in document_fields table
- **container_seal_pairs**: Stored as JSON string in raw_value, parsed for display as individual rows

### UI Integration

The delivery order integrates with the existing document management system:

- Uses the same upload/edit overlay pattern as BOL, Invoice, and Packing List
- Displays field information in the standard document grid format
- Container/seal pairs render as separate data rows with consistent styling
- Supports edit functionality with form validation and dummy data for testing
