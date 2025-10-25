// Analytics Service - Real Supabase Queries
// This file contains all the real database queries for the analytics page
// Currently using mock data in Analytics.js - uncomment these when ready

import { supabase } from './supabaseClient';

/**
 * ============================================
 * FINANCIAL ANALYTICS
 * ============================================
 */

/**
 * Get total unpaid amount across all PROs
 * Uses finance_receipts.receipt_data.grandTotal as source of truth
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<number>} Total unpaid amount
 */
export async function getTotalUnpaidAmount(startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('pro')
      .select(`
        pro_number,
        finance_status,
        created_at,
        finance_receipts!inner(
          receipt_type,
          receipt_data
        )
      `)
      .eq('finance_status', 'Unpaid');

    // Apply date filtering if provided
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Sum up all amounts from finance_receipts (different fields based on receipt type)
    let totalUnpaid = 0;
    data.forEach(pro => {
      pro.finance_receipts.forEach(receipt => {
        let receiptAmount = 0;
        const receiptType = receipt.receipt_type;
        
        // Use different fields based on receipt type
        if (receiptType === 'service_invoice') {
          receiptAmount = receipt.receipt_data?.totalAmountDue;
        } else if (receiptType === 'statement_of_accounts') {
          receiptAmount = receipt.receipt_data?.grandTotal;
        } else {
          // Fallback to grandTotal for unknown types
          receiptAmount = receipt.receipt_data?.grandTotal;
        }
        
        if (receiptAmount && !isNaN(parseFloat(receiptAmount))) {
          totalUnpaid += parseFloat(receiptAmount);
        }
      });
    });

    return totalUnpaid;
  } catch (error) {
    console.error('Error fetching total unpaid amount:', error);
    throw error;
  }
}

/**
 * Get total paid amount (Year to Date)
 * Uses finance_receipts.receipt_data.grandTotal as source of truth
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<number>} Total paid amount
 */
export async function getTotalPaidAmount(startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('pro')
      .select(`
        pro_number,
        finance_status,
        created_at,
        finance_receipts!inner(
          receipt_type,
          receipt_data
        )
      `)
      .eq('finance_status', 'Paid');

    // Apply date filtering if provided
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    let totalPaid = 0;
    data.forEach(pro => {
      pro.finance_receipts.forEach(receipt => {
        let receiptAmount = 0;
        const receiptType = receipt.receipt_type;
        
        // Use different fields based on receipt type
        if (receiptType === 'service_invoice') {
          receiptAmount = receipt.receipt_data?.totalAmountDue;
        } else if (receiptType === 'statement_of_accounts') {
          receiptAmount = receipt.receipt_data?.grandTotal;
        } else {
          // Fallback to grandTotal for unknown types
          receiptAmount = receipt.receipt_data?.grandTotal;
        }
        
        if (receiptAmount && !isNaN(parseFloat(receiptAmount))) {
          totalPaid += parseFloat(receiptAmount);
        }
      });
    });

    return totalPaid;
  } catch (error) {
    console.error('Error fetching total paid amount:', error);
    throw error;
  }
}

/**
 * Get unpaid amounts grouped by consignee
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<Array>} Array of {consignee, amount, count}
 */
export async function getUnpaidAmountByConsignee(startDate = null, endDate = null) {
  try {
    console.log('🔍 getUnpaidAmountByConsignee: Getting PROs ready for finance work...');
    
    // Get PROs that are ready for finance (trucking completed + unpaid) with finance receipts
    let query = supabase
      .from('pro')
      .select(`
        pro_number,
        finance_status,
        trucking_status,
        created_at,
        finance_receipts!inner(
          receipt_type,
          receipt_data
        ),
        documents!inner(
          document_type,
          document_fields!inner(
            canonical_key,
            normalized_value,
            raw_value,
            value_number
          )
        )
      `)
      .eq('trucking_status', 'completed')
      .eq('finance_status', 'Unpaid');

    // Apply date filtering if provided
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data: unpaidPros, error: prosError } = await query;

    if (prosError) throw prosError;

    // Aggregate by consignee
    const consigneeMap = {};

    unpaidPros.forEach(pro => {
      let grandTotal = 0;
      let consigneeName = '';

      // Get grandTotal from finance_receipts (different fields based on receipt type)
      pro.finance_receipts.forEach(receipt => {
        let receiptAmount = 0;
        const receiptType = receipt.receipt_type;
        
        // Use different fields based on receipt type
        if (receiptType === 'service_invoice') {
          receiptAmount = receipt.receipt_data?.totalAmountDue;
        } else if (receiptType === 'statement_of_accounts') {
          receiptAmount = receipt.receipt_data?.grandTotal;
        } else {
          // Fallback to grandTotal for unknown types
          receiptAmount = receipt.receipt_data?.grandTotal;
        }
        
        if (receiptAmount && !isNaN(parseFloat(receiptAmount))) {
          grandTotal += parseFloat(receiptAmount);
        }
      });

      // Get consignee name from BOL
      pro.documents.forEach(doc => {
        doc.document_fields.forEach(field => {
          if (doc.document_type === 'bill_of_lading') {
            // Check for consignee field - use same logic as Finance tab
            if (field.canonical_key === 'consignee') {
              const consigneeValue = field.raw_value || field.normalized_value;
              consigneeName = normalizeConsigneeName(consigneeValue);
            }
          }
        });
      });

      // Aggregate by consignee
      if (consigneeName && grandTotal > 0) {
        if (!consigneeMap[consigneeName]) {
          consigneeMap[consigneeName] = { consignee: consigneeName, amount: 0, count: 0 };
        }
        consigneeMap[consigneeName].amount += grandTotal;
        consigneeMap[consigneeName].count += 1;
      }
    });

    const result = Object.values(consigneeMap).sort((a, b) => b.amount - a.amount);
    
    return result;
  } catch (error) {
    console.error('❌ Error fetching unpaid by consignee:', error);
    throw error;
  }
}

/**
 * Get monthly revenue trends
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<Array>} Array of {month, revenue, paid, unpaid}
 */
export async function getMonthlyRevenueTrends(startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('pro')
      .select(`
        pro_number,
        created_at,
        finance_status,
        finance_receipts!inner(
          receipt_type,
          receipt_data
        )
      `)
      .order('created_at', { ascending: true });

    // Apply date filtering if provided
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Determine grouping strategy based on date range
    const isShortRange = startDate && endDate && 
      (new Date(endDate) - new Date(startDate)) <= (30 * 24 * 60 * 60 * 1000); // 30 days
    
    const timeData = {};

    data.forEach(pro => {
      const date = new Date(pro.created_at);
      let timeKey;
      
      if (isShortRange) {
        // For short ranges (≤30 days), group by day
        timeKey = `${date.getMonth() + 1}/${date.getDate()}`;
      } else {
        // For longer ranges, group by month
        timeKey = `${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
      }

      if (!timeData[timeKey]) {
        timeData[timeKey] = { month: timeKey, revenue: 0, paid: 0, unpaid: 0 };
      }

      let receiptAmount = 0;
      pro.finance_receipts.forEach(receipt => {
        let amount = 0;
        const receiptType = receipt.receipt_type;
        
        // Use different fields based on receipt type
        if (receiptType === 'service_invoice') {
          amount = receipt.receipt_data?.totalAmountDue;
        } else if (receiptType === 'statement_of_accounts') {
          amount = receipt.receipt_data?.grandTotal;
        } else {
          // Fallback to grandTotal for unknown types
          amount = receipt.receipt_data?.grandTotal;
        }
        
        if (amount && !isNaN(parseFloat(amount))) {
          receiptAmount += parseFloat(amount);
        }
      });

      timeData[timeKey].revenue += receiptAmount;
      if (pro.finance_status === 'Paid') {
        timeData[timeKey].paid += receiptAmount;
      } else {
        timeData[timeKey].unpaid += receiptAmount;
      }
    });

    // Sort data properly
    const result = Object.values(timeData).sort((a, b) => {
      if (isShortRange) {
        // For daily data, sort by date
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA - dateB;
      } else {
        // For monthly data, sort by month name
        return a.month.localeCompare(b.month);
      }
    });

    return result;
  } catch (error) {
    console.error('Error fetching monthly revenue trends:', error);
    throw error;
  }
}

/**
 * ============================================
 * TRUCKING ANALYTICS
 * ============================================
 */

/**
 * Get average turnaround days (Port → Yard)
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<number>} Average days
 */
export async function getAverageTurnaroundDays(startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('container_operations')
      .select('departure_date_from_port, date_of_return_to_yard, created_at')
      .not('departure_date_from_port', 'is', null)
      .not('date_of_return_to_yard', 'is', null);

    // Apply date filtering if provided
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data.length === 0) return 0;

    let totalDays = 0;
    data.forEach(op => {
      const departDate = new Date(op.departure_date_from_port);
      const returnDate = new Date(op.date_of_return_to_yard);
      const days = (returnDate - departDate) / (1000 * 60 * 60 * 24);
      totalDays += days;
    });

    return totalDays / data.length;
  } catch (error) {
    console.error('Error fetching average turnaround days:', error);
    throw error;
  }
}

/**
 * Get average turnaround days by driver
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<Array>} Array of {driver, avgDays, trips}
 */
export async function getAverageTurnaroundByDriver(startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('container_operations')
      .select('driver, departure_date_from_port, date_of_return_to_yard, created_at')
      .not('departure_date_from_port', 'is', null)
      .not('date_of_return_to_yard', 'is', null)
      .not('driver', 'is', null);

    // Apply date filtering if provided
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Aggregate by driver
    const driverStats = {};

    data.forEach(op => {
      const departDate = new Date(op.departure_date_from_port);
      const returnDate = new Date(op.date_of_return_to_yard);
      const days = (returnDate - departDate) / (1000 * 60 * 60 * 24);

      if (!driverStats[op.driver]) {
        driverStats[op.driver] = { driver: op.driver, totalDays: 0, trips: 0 };
      }

      driverStats[op.driver].totalDays += days;
      driverStats[op.driver].trips += 1;
    });

    // Convert to array and calculate averages
    return Object.values(driverStats)
      .map(stat => ({
        driver: stat.driver,
        avgDays: stat.totalDays / stat.trips,
        trips: stat.trips
      }))
      .sort((a, b) => a.avgDays - b.avgDays); // Sort by best performance first
  } catch (error) {
    console.error('Error fetching average by driver:', error);
    throw error;
  }
}

/**
 * Get count of containers currently in transit (delivering status)
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<number>} Number of containers in transit
 */
export async function getContainersInTransit(startDate = null, endDate = null) {
  try {
    console.log('🔍 getContainersInTransit: Querying containers with status="delivering"');
    console.log('📅 Date range:', { startDate, endDate });
    
    let query = supabase
      .from('container_operations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'delivering');

    // Apply date filtering if provided
    if (startDate && endDate) {
      console.log('📅 Applying date filter:', { startDate, endDate });
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    } else {
      console.log('📅 No date filter applied - getting all records');
    }

    const { count, error } = await query;

    console.log('📊 getContainersInTransit result:', { count, error });

    if (error) throw error;

    const result = count || 0;
    console.log('✅ getContainersInTransit returning:', result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching containers in transit:', error);
    throw error;
  }
}

/**
 * Get count of containers that need to be booked
 * Status: booking
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<number>} Count of containers to be booked
 */
export async function getContainersToBeBooked(startDate = null, endDate = null) {
  try {
    console.log('🔍 getContainersToBeBooked: Querying containers with status="booking"');
    console.log('📅 Date range:', { startDate, endDate });
    
    let query = supabase
      .from('container_operations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'booking');

    // Apply date filtering if provided
    if (startDate && endDate) {
      console.log('📅 Applying date filter:', { startDate, endDate });
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    } else {
      console.log('📅 No date filter applied - getting all records');
    }

    const { count, error } = await query;

    console.log('📊 getContainersToBeBooked result:', { count, error });

    if (error) throw error;

    const result = count || 0;
    console.log('✅ getContainersToBeBooked returning:', result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching containers to be booked:', error);
    throw error;
  }
}

/**
 * ============================================
 * DOCUMENT PROCESSING ANALYTICS
 * ============================================
 */

/**
 * Get average document processing time (Upload → Approval)
 * @returns {Promise<number>} Average days
 */
export async function getAverageDocProcessingTime() {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('uploaded_at, updated_at')
      .eq('status', 'approved')
      .eq('department', 'shipment')
      .not('updated_at', 'is', null);

    if (error) throw error;

    if (data.length === 0) return 0;

    let totalDays = 0;
    data.forEach(doc => {
      const uploadDate = new Date(doc.uploaded_at);
      const approvalDate = new Date(doc.updated_at);
      const days = (approvalDate - uploadDate) / (1000 * 60 * 60 * 24);
      totalDays += days;
    });

    return totalDays / data.length;
  } catch (error) {
    console.error('Error fetching average doc processing time:', error);
    throw error;
  }
}

/**
 * Get processing time by document type
 * @returns {Promise<Array>} Array of {docType, avgDays, count}
 */
export async function getProcessingTimeByDocType() {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('document_type, uploaded_at, updated_at')
      .eq('status', 'approved')
      .eq('department', 'shipment')
      .not('updated_at', 'is', null);

    if (error) throw error;

    // Aggregate by document type
    const docTypeStats = {};

    data.forEach(doc => {
      const uploadDate = new Date(doc.uploaded_at);
      const approvalDate = new Date(doc.updated_at);
      const days = (approvalDate - uploadDate) / (1000 * 60 * 60 * 24);

      if (!docTypeStats[doc.document_type]) {
        docTypeStats[doc.document_type] = { 
          docType: formatDocTypeName(doc.document_type), 
          totalDays: 0, 
          count: 0 
        };
      }

      docTypeStats[doc.document_type].totalDays += days;
      docTypeStats[doc.document_type].count += 1;
    });

    // Convert to array and calculate averages
    return Object.values(docTypeStats)
      .map(stat => ({
        docType: stat.docType,
        avgDays: stat.totalDays / stat.count,
        count: stat.count
      }))
      .sort((a, b) => a.avgDays - b.avgDays); // Sort by fastest first
  } catch (error) {
    console.error('Error fetching processing time by doc type:', error);
    throw error;
  }
}

/**
 * Get count of pending documents
 * @returns {Promise<number>} Number of pending documents
 */
export async function getPendingDocumentsCount() {
  try {
    const { count, error } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_verifier')
      .eq('department', 'shipment');

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error fetching pending documents count:', error);
    throw error;
  }
}

/**
 * ============================================
 * BOTTLENECK ANALYSIS
 * (Requires additional timestamp columns)
 * ============================================
 */

/**
 * ============================================
 * CROSS-DEPARTMENTAL PIPELINE ANALYTICS
 * ============================================
 */

/**
 * Get cross-departmental pipeline view
 * Shows all PROs with their status across Shipment, Trucking, Finance
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<Array>} Array of pipeline data
 */
export async function getCrossDepartmentalPipeline(startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('pro')
      .select(`
        pro_number,
        created_at,
        status,
        trucking_status,
        finance_status
      `)
      .order('created_at', { ascending: false });

    // Apply date filtering if provided
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Process each PRO to determine current stage
    return data.map(pro => {
      let currentStage = 'Shipment';
      
      if (pro.finance_status === 'Paid') {
        currentStage = 'Completed';
      } else if (pro.trucking_status === 'completed' && pro.finance_status === 'Unpaid') {
        currentStage = 'Finance';
      } else if (pro.status === 'completed' && pro.trucking_status !== 'completed') {
        currentStage = 'Trucking';
      } else {
        currentStage = 'Shipment';
      }

      return {
        proNumber: pro.pro_number,
        createdAt: pro.created_at,
        shipmentStatus: pro.status,
        truckingStatus: pro.trucking_status,
        financeStatus: pro.finance_status,
        currentStage
      };
    });
  } catch (error) {
    console.error('Error fetching cross-departmental pipeline:', error);
    throw error;
  }
}

/**
 * Get pipeline summary counts
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<Object>} Pipeline summary counts
 */
export async function getPipelineSummary(startDate = null, endDate = null) {
  try {
    const pipelineData = await getCrossDepartmentalPipeline(startDate, endDate);
    
    const summary = {
      shipment: 0,
      trucking: 0,
      finance: 0,
      completed: 0,
      total: pipelineData.length
    };

    pipelineData.forEach(item => {
      switch (item.currentStage) {
        case 'Shipment':
          summary.shipment++;
          break;
        case 'Trucking':
          summary.trucking++;
          break;
        case 'Finance':
          summary.finance++;
          break;
        case 'Completed':
          summary.completed++;
          break;
      }
    });

    return summary;
  } catch (error) {
    console.error('Error fetching pipeline summary:', error);
    throw error;
  }
}

/**
 * ============================================
 * DEPARTMENTAL WORKLOAD ANALYTICS
 * ============================================
 */

/**
 * Get current workload by department
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<Object>} Workload counts by department
 */
export async function getDepartmentalWorkload(startDate = null, endDate = null) {
  try {
    console.log('🔍 getDepartmentalWorkload: Starting workload queries...');
    
    // Run all workload queries in parallel
    const [
      { data: shipmentData, error: shipmentError },
      { count: truckingCount, error: truckingError },
      { count: financeCount, error: financeError }
    ] = await Promise.all([
      // Shipment workload: PROs with incomplete documents
      (() => {
        let query = supabase
          .from('pro')
          .select(`
            pro_number,
            created_at,
            documents!inner(
              document_type
            )
          `)
          .not('status', 'eq', 'completed');
        
        if (startDate && endDate) {
          query = query.gte('created_at', startDate).lte('created_at', endDate);
        }
        
        return query;
      })(),
      
      // Trucking workload: Containers to be returned (delivering + booking status)
      (() => {
        let query = supabase
          .from('container_operations')
          .select('*', { count: 'exact', head: true })
          .in('status', ['delivering', 'booking']);
        
        if (startDate && endDate) {
          query = query.gte('created_at', startDate).lte('created_at', endDate);
        }
        
        return query;
      })(),
      
      // Finance workload: PROs ready for finance (trucking completed + unpaid)
      (() => {
        let query = supabase
          .from('pro')
          .select('pro_number', { count: 'exact', head: true })
          .eq('trucking_status', 'completed')
          .eq('finance_status', 'Unpaid');
        
        if (startDate && endDate) {
          query = query.gte('created_at', startDate).lte('created_at', endDate);
        }
        
        return query;
      })()
    ]);

    console.log('📊 Departmental Workload Results:');
    console.log('  Shipment:', { data: shipmentData, error: shipmentError });
    console.log('  Trucking:', { count: truckingCount, error: truckingError });
    console.log('  Finance:', { count: financeCount, error: financeError });

    if (shipmentError) throw shipmentError;
    if (truckingError) throw truckingError;
    if (financeError) throw financeError;

    // Count unique PROs for shipment workload
    const shipmentWorkload = shipmentData ? shipmentData.length : 0;
    const truckingWorkload = truckingCount || 0;
    const financeWorkload = financeCount || 0;

    const result = {
      shipment: shipmentWorkload,
      trucking: truckingWorkload,
      finance: financeWorkload,
      total: shipmentWorkload + truckingWorkload + financeWorkload
    };

    console.log('✅ getDepartmentalWorkload returning:', result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching departmental workload:', error);
    throw error;
  }
}

/**
 * Fetch all analytics data in one call
 * This is the main function to use in the Analytics component
 * @param {string} startDate - Start date filter (ISO string)
 * @param {string} endDate - End date filter (ISO string)
 * @returns {Promise<Object>} Complete analytics data object
 */
export async function fetchAllAnalyticsData(startDate = null, endDate = null) {
  try {
    // Run all queries in parallel for better performance
    const [
      unpaidAmount,
      paidAmount,
      unpaidByConsignee,
      revenueByMonth,
      avgTurnaroundDays,
      avgTurnaroundByDriver,
      containersInTransit,
      containersToBeBooked,
      pipelineData,
      pipelineSummary,
      departmentalWorkload
    ] = await Promise.all([
      getTotalUnpaidAmount(startDate, endDate),
      getTotalPaidAmount(startDate, endDate),
      getUnpaidAmountByConsignee(startDate, endDate),
      getMonthlyRevenueTrends(startDate, endDate),
      getAverageTurnaroundDays(startDate, endDate),
      getAverageTurnaroundByDriver(startDate, endDate),
      getContainersInTransit(startDate, endDate),
      getContainersToBeBooked(startDate, endDate),
      getCrossDepartmentalPipeline(startDate, endDate),
      getPipelineSummary(startDate, endDate),
      getDepartmentalWorkload(startDate, endDate)
    ]);

    return {
      // Financial Analytics
      unpaidAmount,
      paidAmount,
      unpaidByConsignee,
      revenueByMonth,
      
      // Trucking Analytics
      avgTurnaroundDays,
      avgTurnaroundByDriver,
      containersInTransit,
      containersToBeBooked,
      
      // Cross-Departmental Pipeline
      pipelineData,
      pipelineSummary,
      
      // Departmental Workload
      departmentalWorkload
    };
  } catch (error) {
    console.error('❌ Error fetching all analytics data:', error);
    throw error;
  }
}

/**
 * ============================================
 * HELPER FUNCTIONS
 * ============================================
 */

function normalizeConsigneeName(text) {
  if (!text) return 'Unknown';
  const t = String(text).toUpperCase();
  if (t.includes('PUREGOLD')) return 'PUREGOLD';
  if (t.includes('ROBINSON')) return 'ROBINSONS';
  if (t.includes('MOTOSCO') || t.includes('MONTOSCO')) return 'MONTOSCO';
  return text;
}

function formatDocTypeName(docType) {
  const names = {
    'bill_of_lading': 'Bill of Lading',
    'invoice': 'Invoice',
    'packing_list': 'Packing List',
    'delivery_order': 'Delivery Order'
  };
  return names[docType] || docType;
}

