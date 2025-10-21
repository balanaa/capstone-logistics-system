// Document service over Supabase
import { supabase } from './client'

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
  uploadedBy
}) {
  const payload = {
    pro_number: String(proNumber),
    department,
    document_type: documentType,
    file_path: filePath,
    uploaded_by: uploadedBy,
  }
  const { data, error } = await supabase
    .from('documents')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw error
  return data.id
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
    .select('id,document_type,file_path,uploaded_at,uploaded_by,updated_at,updated_by,status')
    .eq('department', 'shipment')
    .eq('pro_number', String(proNumber))
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


