# Invoice Components Analysis

## Overview

This document provides a comprehensive analysis of the Invoice-related components in the shipment management system, including their dependencies, database integration, and styling structure.

## Components Analyzed

### 1. InvoiceEditOverlay.js

- **Purpose**: Edit existing invoice documents with structured form layout
- **Location**: `src/components/overlays/InvoiceEditOverlay.js`
- **Type**: Modal overlay for editing invoice data

### 2. InvoiceUploadAndEditOverlay.js

- **Purpose**: Upload new invoice documents with form data entry
- **Location**: `src/components/overlays/InvoiceUploadAndEditOverlay.js`
- **Type**: Upload + edit modal overlay

## Component Architecture

### InvoiceEditOverlay.js Structure

#### Props Interface

```javascript
{
  title: string,
  fileUrl: string,
  fileName: string,
  initialValues: object,
  initialItems: array,
  onClose: function,
  onSubmit: function,
  updatedAt: timestamp,
  updatedBy: string,
  uploadedBy: string
}
```

#### State Management

- **Document Info Fields**:

  - `invoiceNo`: Invoice number
  - `invoiceDate`: Invoice date
  - `incoterms`: Incoterms field
  - `currency`: Currency (defaults to USD)

- **Line Items**:

  - `items`: Array of product line items
  - Each item contains: `product`, `quantity`, `unitPrice`, `amount`

- **Totals**:
  - `totalQuantity`: Manual input total quantity
  - `totalAmount`: Manual input total amount

#### Key Features

1. **Auto-calculation**: Amount = quantity × unitPrice for line items
2. **Dynamic item management**: Add/remove line items
3. **File preview**: Supports PDF, PNG, JPG, JPEG embedding
4. **Dummy data**: Fill with sample data for testing
5. **Last edited tracking**: Shows who last edited and when

### InvoiceUploadAndEditOverlay.js Structure

#### Props Interface

```javascript
{
  title: string,
  proNumber: string,
  onClose: function,
  onSuccess: function
}
```

#### State Management

- Same state structure as InvoiceEditOverlay
- Additional upload state management:
  - `uploading`: Boolean upload status
  - `uploadError`: Error message string

#### Key Features

1. **File upload integration**: Uses DocumentUploadOverlay component
2. **Database persistence**: Saves to Supabase tables
3. **File storage**: Uploads to Supabase Storage
4. **Audit logging**: Logs actions to actions_log table

## Dependencies Analysis

### Direct Dependencies

#### Core React Dependencies

- `React`: Component framework
- `React.useState`: State management
- `React.useRef`: DOM references

#### Internal Components

- `DocumentUploadOverlay`: Generic upload modal component
- `CameraCapture`: Camera functionality for document capture

#### Utility Functions

- `formatDateTime`: Date/time formatting utility
- `supabase`: Database client
- `upsertPro`: PRO number management
- `insertDocument`: Document creation

### CSS Dependencies

- `CreateShipmentOverlay.css`: Main styling for edit overlay
- `DocumentUploadOverlay.css`: Upload modal styling
- `CameraCapture.css`: Camera component styling

## Database Integration

### Supabase Tables Used

#### 1. `pro` Table

```sql
CREATE TABLE pro (
    pro_number TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    status TEXT,
    trucking_status TEXT,
    finance_status TEXT
);
```

#### 2. `documents` Table

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pro_number TEXT NOT NULL REFERENCES pro(pro_number),
    department TEXT NOT NULL CHECK (department = 'shipment'),
    document_type TEXT NOT NULL CHECK (
        document_type IN ('bill_of_lading', 'invoice', 'packing_list', 'delivery_order')
    ),
    file_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending_verifier',
    deleted_at TIMESTAMP,
    doc_no TEXT,
    sequence_no INT,
    requires_reencode BOOLEAN NOT NULL DEFAULT false
);
```

#### 3. `document_fields` Table

```sql
CREATE TABLE document_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    canonical_key TEXT NOT NULL,
    raw_label TEXT,
    raw_value TEXT,
    normalized_value TEXT,
    value_number NUMERIC(18, 4),
    value_date DATE,
    UNIQUE (document_id, canonical_key)
);
```

#### 4. `document_items` Table

```sql
CREATE TABLE document_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    line_no INT NOT NULL,
    product TEXT,
    quantity NUMERIC(18, 0),
    unit_price NUMERIC(18, 4),
    amount NUMERIC(18, 4),
    net_weight NUMERIC(18, 4),
    gross_weight NUMERIC(18, 4),
    UNIQUE (document_id, line_no)
);
```

#### 5. `actions_log` Table

```sql
CREATE TABLE actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Database Operations

#### Upload Process (InvoiceUploadAndEditOverlay)

1. **File Upload**: Upload to Supabase Storage with timestamped path
2. **PRO Upsert**: Ensure PRO number exists in `pro` table
3. **Document Insert**: Create document record in `documents` table
4. **Fields Insert**: Save invoice fields to `document_fields` table
5. **Items Insert**: Save line items to `document_items` table
6. **Audit Log**: Log upload action to `actions_log` table

#### Field Mapping

- `invoice_no` → `document_fields.canonical_key`
- `invoice_date` → `document_fields.value_date`
- `incoterms` → `document_fields.raw_value`
- `invoice_currency` → `document_fields.raw_value`
- `total_quantity` → `document_fields.value_number`
- `total_amount` → `document_fields.value_number`

#### Line Items Mapping

- `product` → `document_items.product`
- `quantity` → `document_items.quantity`
- `unitPrice` → `document_items.unit_price`
- `amount` → `document_items.amount`

## CSS Structure Analysis

### CreateShipmentOverlay.css

#### Layout Classes

- `.cso-backdrop`: Full-screen modal backdrop
- `.cso-modal`: Main modal container (95vw × 90vh)
- `.cso-header`: Modal header with title and close button
- `.cso-body`: Two-column grid layout (file preview + form)
- `.cso-footer`: Footer with action buttons

#### Form Styling

- `.form-group`: Form field container
- `.invoice-section`: Sectioned form layout with borders
- `.invoice-table`: Line items table styling
- `.invoice-delete-btn`: Delete button for line items

#### Responsive Design

- **Desktop**: Two-column layout (file preview + form)
- **Mobile**: Single-column layout with stacked sections

### DocumentUploadOverlay.css

#### Upload Area

- `.duo-upload-area`: Drag & drop upload zone
- `.duo-preview`: File preview container
- `.duo-frame`: PDF iframe styling
- `.duo-image`: Image preview styling

#### Camera Integration

- `.camera-btn`: Camera capture button
- `.duo-camera-section`: Camera button container

### CameraCapture.css

#### Modal Structure

- `.camera-capture-overlay`: Full-screen camera overlay
- `.camera-capture-modal`: Camera modal container
- `.camera-video-container`: Video preview area
- `.camera-controls`: Capture/cancel buttons

## Key Features & Functionality

### File Handling

- **Supported Formats**: PDF, PNG, JPG, JPEG, DOCX, XLSX
- **Preview Support**: Embedded PDF viewer, image display
- **Camera Capture**: Mobile camera integration
- **File Validation**: Type checking and error handling

### Form Management

- **Dynamic Line Items**: Add/remove product lines
- **Auto-calculation**: Quantity × Unit Price = Amount
- **Currency Support**: USD, EUR, PHP, GBP, JPY, CNY
- **Validation**: Form validation and error display

### Data Persistence

- **Atomic Operations**: All-or-nothing database transactions
- **Audit Trail**: Complete action logging
- **File Storage**: Secure Supabase Storage integration
- **Conflict Resolution**: Built-in conflict detection system

### User Experience

- **Responsive Design**: Mobile-first approach
- **Loading States**: Upload progress indicators
- **Error Handling**: Comprehensive error messages
- **Accessibility**: Keyboard navigation support

## Integration Points

### With Other Components

- **DocumentUploadOverlay**: Generic upload functionality
- **CameraCapture**: Mobile document capture
- **Supabase Services**: Database and storage operations

### With Business Logic

- **PRO Management**: PRO number validation and creation
- **Document Workflow**: Status tracking and transitions
- **User Authentication**: User ID tracking and permissions

## Security Considerations

### Data Protection

- **Row Level Security**: Supabase RLS enabled
- **User Authentication**: Required for all operations
- **File Validation**: Type and size checking
- **SQL Injection Prevention**: Parameterized queries

### Access Control

- **Department Constraints**: Shipment department only
- **Document Type Validation**: Invoice type checking
- **User Permissions**: Role-based access control

## Performance Optimizations

### Database

- **Indexes**: Optimized queries with proper indexing
- **Batch Operations**: Bulk inserts for line items
- **Connection Pooling**: Supabase connection management

### Frontend

- **Lazy Loading**: Component-based loading
- **State Management**: Efficient React state updates
- **File Handling**: Optimized file preview and upload

## Error Handling

### Client-Side

- **Form Validation**: Real-time field validation
- **File Errors**: Type and size validation
- **Network Errors**: Upload failure handling

### Server-Side

- **Database Errors**: Transaction rollback
- **Storage Errors**: File upload failure handling
- **Constraint Violations**: Data integrity checks

## Future Enhancements

### Planned Features

- **Real-time Validation**: Live field validation
- **Bulk Operations**: Multiple invoice processing
- **Advanced Search**: Invoice search and filtering
- **Export Functionality**: PDF/Excel export

### Technical Improvements

- **Offline Support**: PWA capabilities
- **Performance Monitoring**: Analytics integration
- **Automated Testing**: Unit and integration tests
- **Documentation**: API documentation generation

## Conclusion

The Invoice components represent a well-structured, feature-rich implementation of document management functionality. The architecture follows React best practices with proper separation of concerns, comprehensive error handling, and robust database integration. The system is designed for scalability and maintainability while providing an excellent user experience across desktop and mobile platforms.

The integration with Supabase provides a solid foundation for data persistence, file storage, and user management, while the CSS structure ensures responsive design and consistent styling across the application.
