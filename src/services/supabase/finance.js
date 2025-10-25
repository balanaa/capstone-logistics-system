// Finance service for fetching completed trucking PROs
import { supabase } from './supabaseClient'

export async function getFinanceTableData() {
  console.log('🔍 Fetching finance table data for completed trucking PROs...');
  
  // Fetch PROs with 'completed' trucking status and their BOL + DO data
  const { data: prosData, error } = await supabase
    .from('pro')
    .select(`
      pro_number,
      created_at,
      trucking_status,
      finance_status,
      documents!inner(
        document_type,
        document_fields(
          canonical_key,
          normalized_value,
          raw_value,
          value_number
        )
      )
    `)
    .eq('trucking_status', 'completed') // Only show PROs that are completed in trucking
    .in('documents.document_type', ['bill_of_lading', 'delivery_order']) // Both BOL and DO documents
    .eq('documents.department', 'shipment')
    .order('created_at', { ascending: false })

  console.log('📊 Finance PROs query result:', { prosData, error });

  if (error) {
    console.error('❌ Error fetching finance data:', error);
    throw error;
  }

  console.log(`✅ Found ${prosData?.length || 0} completed trucking PROs`);

  // Normalize consignee name function
  const normalizeConsigneeName = (text) => {
    if (!text) return ''
    const t = String(text).toUpperCase()
    if (t.includes('PUREGOLD')) return 'PUREGOLD'
    if (t.includes('ROBINSON')) return 'ROBINSONS'
    if (t.includes('MOTOSCO') || t.includes('MONTOSCO')) return 'MONTOSCO'
    return ''
  }

  // Transform the data for table display - one row per PRO
  return Promise.all(prosData.map(async pro => {
    // Group documents by type
    const documentsByType = {};
    pro.documents.forEach(doc => {
      if (doc.document_fields) {
        documentsByType[doc.document_type] = doc.document_fields;
      }
    });

    const bolFields = documentsByType.bill_of_lading || [];
    const doFields = documentsByType.delivery_order || [];

    if (bolFields.length === 0) {
      console.log(`⚠️ No BOL document fields found for PRO ${pro.pro_number}`);
      return null;
    }

    // Create field maps for easier access
    const bolFieldMap = {};
    bolFields.forEach(field => {
      // For numeric fields like no_of_packages, prefer value_number
      if (field.canonical_key === 'no_of_packages' && field.value_number !== null) {
        bolFieldMap[field.canonical_key] = field.value_number;
      } else {
        bolFieldMap[field.canonical_key] = field.raw_value || field.normalized_value;
      }
    });

    const doFieldMap = {};
    doFields.forEach(field => {
      doFieldMap[field.canonical_key] = field.raw_value || field.normalized_value;
    });

    console.log(`📋 BOL fields for PRO ${pro.pro_number}:`, bolFieldMap);
    console.log(`📋 DO fields for PRO ${pro.pro_number}:`, doFieldMap);
    
    // Extract container numbers and seal numbers from BOL
    const containerSealPairs = bolFieldMap.container_seal_pairs ? 
      JSON.parse(bolFieldMap.container_seal_pairs) : [];
    const containerDisplay = containerSealPairs.map(container => {
      return container.sealNo 
        ? `${container.containerNo} / ${container.sealNo}`
        : container.containerNo
    }).join(', ') || '-';

    // Format created date
    const formatCreatedDate = (date) => {
      if (!date) return '-'
      const d = new Date(date)
      const month = d.toLocaleString('default', { month: 'long' })
      const day = d.getDate()
      const year = d.getFullYear()
      return `${month} ${day}, ${year}`
    }

    // Join container specs
    const containerSpecs = bolFieldMap.container_specs || '-'

    // Join number and kind of package
    const noOfPackages = bolFieldMap.no_of_packages || ''
    const packagingKind = bolFieldMap.packaging_kind || ''
    
    // Debug logging for package fields
    console.log(`📦 Package fields for PRO ${pro.pro_number}:`, {
      no_of_packages_raw: bolFieldMap.no_of_packages,
      no_of_packages_value_number: bolFields.find(f => f.canonical_key === 'no_of_packages')?.value_number,
      packaging_kind: bolFieldMap.packaging_kind,
      noOfPackages,
      packagingKind
    });
    
    const numberAndKindOfPackage = [noOfPackages, packagingKind].filter(Boolean).join(' ') || '-'

    // Join vessel name and voyage number
    const vesselName = bolFieldMap.vessel_name || ''
    const voyageNumber = bolFieldMap.voyage_no || ''
    const vessel = [vesselName, voyageNumber].filter(Boolean).join(' / ') || '-'

    const consigneeResult = normalizeConsigneeName(bolFieldMap.consignee) || '-'
    console.log(`[getFinanceTableData] PRO ${pro.pro_number}: consignee raw="${bolFieldMap.consignee}", normalized="${consigneeResult}"`)
    
    return {
      id: pro.pro_number,
      proNo: pro.pro_number,
      blNo: bolFieldMap.bl_number || '-',
      registryNo: doFieldMap.registry_number || '-',
      consignee: consigneeResult,
      containerSpecs: containerSpecs,
      numberAndKindOfPackage: numberAndKindOfPackage,
      vessel: vessel,
      containerNoSealNo: containerDisplay,
      createdOn: formatCreatedDate(pro.created_at),
      status: pro.finance_status || 'Unpaid', // Use finance_status from database
      proNumber: pro.pro_number
    }
  }))
}

// Status updates will be handled in the finance profile later
