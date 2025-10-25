/**
 * Document completion utility functions
 */

/**
 * Check if all required shipment documents are complete
 * @param {Array} documents - Array of document objects from dbPro.documents
 * @returns {boolean} - True if all 4 required documents exist
 */
export function checkAllShipmentDocumentsComplete(documents) {
    // console.log('🔍 [documentCompletionUtils] Checking documents:', {
    //     documents: documents?.length,
    //     types: documents?.map(d => d.type)
    // })
    
    if (!Array.isArray(documents)) {
        // console.log('❌ [documentCompletionUtils] Documents not an array')
        return false
    }
    
    const requiredTypes = ['Bill of Lading', 'Invoice', 'Packing List', 'Delivery Order']
    const existingTypes = documents.map(doc => doc.type)
    
    // console.log('📋 [documentCompletionUtils] Required vs existing:', {
    //     required: requiredTypes,
    //     existing: existingTypes
    // })
    
    // Check if all required types exist
    const isComplete = requiredTypes.every(type => existingTypes.includes(type))
    
    // console.log('✅ [documentCompletionUtils] Completion check result:', isComplete)
    
    return isComplete
    
    // Alternative implementation (simpler):
    // return documents.length === 4;
}

/**
 * Check if all containers are returned
 * @param {Array} containerOperations - Array of container operation objects
 * @returns {boolean} - True if all containers have status 'returned'
 */
export function checkAllContainersReturned(containerOperations) {
    // console.log('🔍 [documentCompletionUtils] Checking containers:', {
    //     containerCount: containerOperations?.length,
    //     statuses: containerOperations?.map(op => op.status)
    // })
    
    if (!Array.isArray(containerOperations) || containerOperations.length === 0) {
        // console.log('❌ [documentCompletionUtils] No container operations')
        return false
    }
    
    const allReturned = containerOperations.every(op => op.status === 'returned')
    
    // console.log('✅ [documentCompletionUtils] All containers returned:', allReturned)
    
    return allReturned
}
