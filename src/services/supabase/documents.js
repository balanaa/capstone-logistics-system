// Document service over Supabase
import { supabase } from './supabaseClient'

export async function upsertPro(proNumber) {
  // Idempotent by primary key; ignore duplicates
  const { error } = await supabase
    .from('pro')
    .upsert({ pro_number: String(proNumber) }, { onConflict: 'pro_number', ignoreDuplicates: true })
  if (error) throw error
}

export async function insertDocument({
  proNumber,
  department = 'shipment',
  documentType = 'bill_of_lading',
  filePath,
  uploadedBy,
  actionType = 'document_file_uploaded' // NEW: Allow different action types
}) {
  // Create local timestamp (Singapore time) instead of UTC
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
  const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
  
  const payload = {
    pro_number: String(proNumber),
    department,
    document_type: documentType,
    file_path: filePath,
    uploaded_by: uploadedBy,
    uploaded_at: localTimeString, // Use local time instead of auto-generated UTC
    updated_at: localTimeString,  // Use local time instead of auto-generated UTC
  }
  const { data, error } = await supabase
    .from('documents')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw error
  
  // Get user details for logging
  let userName = 'Unknown User'
  try {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const user = session.session.user
      userName = user.user_metadata?.full_name || user.email || `User ${user.id.substring(0, 8)}`
    }
  } catch (err) {
    console.warn('Could not get user details:', err)
  }

  // Log to actions_log for audit trail
  const { error: logError } = await supabase
    .from('actions_log')
    .insert({
      user_id: uploadedBy,
      action: actionType, // Use the provided action type
      target_type: 'document',
      target_id: data.id,
      payload: {
        pro_number: String(proNumber),
        department,
        document_type: documentType,
        file_path: filePath,
        user_name: userName // Add username to payload
      }
    })
  
  if (logError) {
    console.error('❌ Error logging document upload:', logError)
    // Don't throw - document was created successfully
  }
  
  return data.id
}

/**
 * Log document action to actions_log table for audit trail
 * @param {Object} params
 * @param {string} params.userId - User ID performing the action
 * @param {string} params.action - Action type: 'document_file_uploaded', 'document_data_updated', 'document_deleted'
 * @param {string} params.documentId - Document UUID
 * @param {string} params.proNumber - PRO number
 * @param {string} params.department - Department (e.g., 'shipment')
 * @param {string} params.documentType - Document type: 'bill_of_lading', 'invoice', 'packing_list', 'delivery_order'
 */
export async function logDocumentAction({
  userId,
  action,
  documentId,
  proNumber,
  department,
  documentType,
}) {
  // Validate required fields
  if (!userId || !documentId) {
    console.warn("⚠️ Skipping action log: missing userId or documentId", {
      userId,
      documentId,
    });
    return;
  }

  // Get user details for logging
  let userName = 'Unknown User'
  try {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const user = session.session.user
      userName = user.user_metadata?.full_name || user.email || `User ${user.id.substring(0, 8)}`
    }
  } catch (err) {
    console.warn('Could not get user details:', err)
  }

  const { error } = await supabase.from("actions_log").insert({
    user_id: userId,
    action: action,
    target_type: "document",
    target_id: documentId,
    payload: {
      pro_number: String(proNumber),
      department: department || "shipment",
      document_type: documentType,
      user_name: userName, // Add username to payload
    },
  });

  if (error) {
    console.error("❌ Error logging document action:", error);
    // Don't throw - the actual operation was successful
  } else {
    console.log(
      `✅ Logged action: ${action} for ${documentType} (${documentId}) by ${userName}`
    );
  }
}

export async function insertDocumentFields(documentId, fields) {
  // fields: array of { canonical_key, raw_value } and optional typed values
  if (!Array.isArray(fields) || !fields.length) return
  const { error } = await supabase
    .from('document_fields')
    .insert(fields.map(f => ({ ...f, document_id: documentId })))
  if (error) throw error
}

export async function getSignedDocumentUrl(filePath, expiresInSeconds = 600) {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, expiresInSeconds)
  if (error) throw error
  return data?.signedUrl
}

export async function fetchShipmentDocumentsByPro(proNumber) {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id,document_type,file_path,uploaded_at,uploaded_by,updated_at,updated_by,status,department')
    .eq('pro_number', String(proNumber))
    .eq('department', 'shipment')
  if (error) throw error
  return docs || []
}

export async function fetchTruckingDocumentsByPro(proNumber) {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id,document_type,file_path,uploaded_at,uploaded_by,updated_at,updated_by,status,department')
    .eq('pro_number', String(proNumber))
    .eq('department', 'shipment')
    .eq('document_type', 'delivery_order')
  if (error) throw error
  return docs || []
}

export async function fetchBolDataForTrucking(proNumber) {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id,document_type,file_path,uploaded_at,uploaded_by,updated_at,updated_by,status,department')
    .eq('pro_number', String(proNumber))
    .eq('department', 'shipment')
    .eq('document_type', 'bill_of_lading')
  if (error) throw error
  return docs || []
}

export async function fetchFieldsByDocumentId(documentId) {
  const { data, error } = await supabase
    .from('document_fields')
    .select('canonical_key, raw_value, normalized_value, value_number, value_date')
    .eq('document_id', documentId)
  if (error) throw error
  return data || []
}

/**
 * Get the last editor information for a document from actions_log
 * @param {string} documentId - Document UUID
 * @returns {Promise<Object|null>} Last editor info with user details and timestamp
 */
export async function getLastEditorInfo(documentId) {
  try {
    const { data, error } = await supabase
      .from('actions_log')
      .select(`
        created_at,
        user_id,
        auth.users!inner(
          email,
          raw_user_meta_data
        )
      `)
      .eq('target_type', 'document')
      .eq('target_id', documentId)
      .eq('action', 'document_data_updated')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // If no edit action found, try to get the uploader
      const { data: uploadData, error: uploadError } = await supabase
        .from('actions_log')
        .select(`
          created_at,
          user_id,
          auth.users!inner(
            email,
            raw_user_meta_data
          )
        `)
        .eq('target_type', 'document')
        .eq('target_id', documentId)
        .eq('action', 'document_file_uploaded')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (uploadError) {
        console.warn('No audit log found for document:', documentId)
        return null
      }
      return uploadData
    }

    return data
  } catch (error) {
    console.error('Error fetching last editor info:', error)
    return null
  }
}

export async function fetchShipmentTableData() {
  // Fetch all PRO numbers with their documents, fields, and status from pro table
  const { data: pros, error: prosError } = await supabase
    .from('pro')
    .select(`
      pro_number,
      created_at,
      status,
      updated_at,
      documents(
        id,
        document_type,
        status,
        document_fields(
          canonical_key,
          raw_value,
          normalized_value
        )
      )
    `)
    .eq('documents.department', 'shipment')
    .order('created_at', { ascending: false })

  if (prosError) throw prosError

  // Transform the data for table display
  return pros.map(pro => {
    const documents = (pro.documents || []).filter(doc => doc.document_type)
    
    // Group fields by document type for easier access
    const fieldsByType = {}
    documents.forEach(doc => {
      fieldsByType[doc.document_type] = {}
      if (doc.document_fields) {
        doc.document_fields.forEach(field => {
          fieldsByType[doc.document_type][field.canonical_key] = field.raw_value || field.normalized_value
        })
      }
    })

    // Extract specific fields from BOL
    const bolFields = fieldsByType.bill_of_lading || {}
    console.log('BOL fields for PRO', pro.pro_number, ':', bolFields)
    
    // Normalize consignee name
    const normalizeConsigneeName = (text) => {
      if (!text) return ''
      const t = String(text).toUpperCase()
      if (t.includes('PUREGOLD')) return 'PUREGOLD'
      if (t.includes('ROBINSON')) return 'ROBINSONS'
      if (t.includes('MOTOSCO') || t.includes('MONTOSCO')) return 'MONTOSCO'
      return ''
    }

    // Get container numbers (handle multiple)
    const containerNumbers = []
    if (bolFields.container_seal_pairs) {
      try {
        const pairs = JSON.parse(bolFields.container_seal_pairs)
        if (Array.isArray(pairs)) {
          pairs.forEach(pair => {
            if (pair.containerNo) containerNumbers.push(pair.containerNo)
          })
        }
      } catch (e) {
        // If not JSON, treat as single value
        if (bolFields.container_seal_pairs) containerNumbers.push(bolFields.container_seal_pairs)
      }
    }

    // Check which documents are recorded
    const documentTypes = documents.map(doc => doc.document_type)
    const documentsRecorded = []
    if (documentTypes.includes('bill_of_lading')) documentsRecorded.push('Bill of Lading')
    if (documentTypes.includes('invoice')) documentsRecorded.push('Invoice')
    if (documentTypes.includes('packing_list')) documentsRecorded.push('Packing List')
    if (documentTypes.includes('delivery_order')) documentsRecorded.push('Delivery Order')

    // Get shipment status from pro table
    const shipmentStatus = pro.status || 'ongoing'
    
    // Format status for display
    const formatStatus = (status) => {
      const statusMap = {
        'ongoing': 'Ongoing',
        'filed_boc': 'Filed BoC', 
        'completed': 'Completed'
      }
      return statusMap[status] || status
    }

    return {
      id: pro.pro_number,
      proNo: pro.pro_number,
      blNo: bolFields.bl_number || '-',
      consignee: normalizeConsigneeName(bolFields.consignee),
      shippingLine: bolFields.shipping_line || '-',
      eta: bolFields.eta || '-',
      placeOfDelivery: bolFields.place_of_delivery || '-',
      containerNo: containerNumbers.join(', ') || '-',
      documentsRecorded: documentsRecorded.join(', ') || '-',
      createdOn: pro.created_at,
      status: formatStatus(shipmentStatus)
    }
  })
}


