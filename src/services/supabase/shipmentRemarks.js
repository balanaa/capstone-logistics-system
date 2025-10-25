// Supabase helpers for shipment remarks persistence
import { supabase } from './client'

export async function fetchShipmentRemarks(proNumber) {
  const { data, error } = await supabase
    .from('shipment_remarks')
    .select('id, remark_date, notes, created_at, created_by, updated_at, updated_by')
    .eq('pro_number', String(proNumber))
    .order('remark_date', { ascending: true, nullsLast: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(r => ({ id: r.id, date: r.remark_date || '', notes: r.notes || '' }))
}

export async function saveShipmentRemarks(proNumber, currentRows, originalIds, userId) {
  const originalIdSet = new Set(Array.isArray(originalIds) ? originalIds : [])
  const currentIdSet = new Set(currentRows.filter(r => r.id).map(r => r.id))

  // Deletions: anything that existed originally but no longer present
  const deletedIds = [...originalIdSet].filter(id => !currentIdSet.has(id))
  if (deletedIds.length) {
    const { error: delErr } = await supabase
      .from('shipment_remarks')
      .delete()
      .in('id', deletedIds)
    if (delErr) throw delErr
  }

  // Partition rows into updates (have id) and inserts (no id)
  const prepared = currentRows.filter(r => r?.date).map(r => ({
    id: r.id || null,
    pro_number: String(proNumber),
    remark_date: r.date,
    notes: r.notes || ''
  }))

  const updateRows = prepared.filter(r => r.id)
  const insertRows = prepared.filter(r => !r.id).map(r => ({
    pro_number: r.pro_number,
    remark_date: r.remark_date,
    notes: r.notes,
    created_by: userId || undefined
  }))

  if (updateRows.length) {
    const { error: upsertErr } = await supabase
      .from('shipment_remarks')
      .upsert(updateRows, { onConflict: 'id' })
    if (upsertErr) throw upsertErr
  }

  if (insertRows.length) {
    const { error: insertErr } = await supabase
      .from('shipment_remarks')
      .insert(insertRows)
    if (insertErr) throw insertErr
  }

  // Return the fresh list from DB (with generated ids)
  return await fetchShipmentRemarks(proNumber)
}


