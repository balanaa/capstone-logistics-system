// Finance Receipts service for CRUD operations
import { supabase } from './supabaseClient'

// Create a new receipt
export async function createReceipt(proNumber, receiptType, receiptData) {
  console.log('🔍 Creating finance receipt:', { proNumber, receiptType });
  
  try {
    // Insert receipt with data
    const { data: receipt, error: receiptError } = await supabase
      .from('finance_receipts')
      .insert({
        pro_number: proNumber,
        receipt_type: receiptType,
        receipt_data: receiptData
      })
      .select()
      .single();

    if (receiptError) {
      console.error('❌ Error creating receipt:', receiptError);
      throw receiptError;
    }

    // Log audit trail with proper user name and notification message
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (userId) {
      // Get user details for logging from profiles table
      let userName = 'Unknown User';
      try {
        console.log(`[createReceipt] Fetching user name from profiles table for user: ${userId}`)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single()
        
        if (!profileError && profile?.full_name) {
          userName = profile.full_name
          console.log(`[createReceipt] Found user name in profiles: ${userName}`)
        } else {
          console.warn(`[createReceipt] Could not fetch user name from profiles:`, profileError)
          // Fallback to user ID if profile not found
          userName = `User ${userId.substring(0, 8)}`
        }
      } catch (err) {
        console.warn('Could not get user details from profiles:', err)
        userName = `User ${userId.substring(0, 8)}`
      }

      const receiptTypeDisplay = receiptType === 'statement_of_accounts' ? 'Statement of Account' : 'Service Invoice';
      const notificationMessage = `${receiptTypeDisplay} created for PRO ${proNumber}`;

      const { error: logError } = await supabase
        .from('actions_log')
        .insert({
          user_id: userId,
          action: 'receipt_created',
          target_type: 'finance_receipt',
          target_id: receipt.id,
          payload: { 
            pro_number: proNumber, 
            receipt_type: receiptType,
            receipt_type_display: receiptTypeDisplay,
            user_name: userName,
            notification_message: notificationMessage
          }
        });

      if (logError) {
        console.error('❌ Error logging receipt creation:', logError);
        // Don't throw here, receipt was created successfully
      } else {
        console.log(`✅ Logged receipt creation: ${receiptTypeDisplay} for PRO ${proNumber} by ${userName}`);
      }
    }

    console.log('✅ Receipt created successfully:', receipt.id);
    return receipt;
  } catch (error) {
    console.error('❌ Error in createReceipt:', error);
    throw error;
  }
}

// Update an existing receipt
export async function updateReceipt(receiptId, receiptData) {
  console.log('🔍 Updating finance receipt:', receiptId);
  
  try {
    // Update receipt data directly
    const { data: receipt, error: receiptError } = await supabase
      .from('finance_receipts')
      .update({
        receipt_data: receiptData,
        updated_at: new Date().toISOString()
      })
      .eq('id', receiptId)
      .select()
      .single();

    if (receiptError) {
      console.error('❌ Error updating receipt:', receiptError);
      throw receiptError;
    }

    // Log audit trail with proper user name and notification message
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (userId) {
      // Get user details for logging from profiles table
      let userName = 'Unknown User';
      try {
        console.log(`[updateReceipt] Fetching user name from profiles table for user: ${userId}`)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single()
        
        if (!profileError && profile?.full_name) {
          userName = profile.full_name
          console.log(`[updateReceipt] Found user name in profiles: ${userName}`)
        } else {
          console.warn(`[updateReceipt] Could not fetch user name from profiles:`, profileError)
          // Fallback to user ID if profile not found
          userName = `User ${userId.substring(0, 8)}`
        }
      } catch (err) {
        console.warn('Could not get user details from profiles:', err)
        userName = `User ${userId.substring(0, 8)}`
      }

      // Get receipt details for better logging
      const { data: receiptDetails } = await supabase
        .from('finance_receipts')
        .select('pro_number, receipt_type')
        .eq('id', receiptId)
        .single();

      const receiptTypeDisplay = receiptDetails?.receipt_type === 'statement_of_accounts' ? 'Statement of Account' : 'Service Invoice';
      const proNumber = receiptDetails?.pro_number || 'Unknown';
      const notificationMessage = `${receiptTypeDisplay} updated for PRO ${proNumber}`;

      const { error: logError } = await supabase
        .from('actions_log')
        .insert({
          user_id: userId,
          action: 'receipt_updated',
          target_type: 'finance_receipt',
          target_id: receiptId,
          payload: { 
            pro_number: proNumber,
            receipt_type: receiptDetails?.receipt_type,
            receipt_type_display: receiptTypeDisplay,
            user_name: userName,
            notification_message: notificationMessage,
            updated_at: new Date().toISOString()
          }
        });

      if (logError) {
        console.error('❌ Error logging receipt update:', logError);
        // Don't throw here, receipt was updated successfully
      } else {
        console.log(`✅ Logged receipt update: ${receiptTypeDisplay} for PRO ${proNumber} by ${userName}`);
      }
    }

    console.log('✅ Receipt updated successfully:', receiptId);
    return receipt;
  } catch (error) {
    console.error('❌ Error in updateReceipt:', error);
    throw error;
  }
}

// Get all receipts for a PRO
export async function getReceiptsByPro(proNumber) {
  console.log('🔍 Fetching receipts for PRO:', proNumber);
  
  try {
    const { data: receipts, error } = await supabase
      .from('finance_receipts')
      .select(`
        id,
        pro_number,
        receipt_type,
        receipt_data,
        created_at,
        updated_at
      `)
      .eq('pro_number', proNumber)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching receipts:', error);
      throw error;
    }

    // Process receipts - no need for complex processing now
    const processedReceipts = receipts.map(receipt => ({
      id: receipt.id,
      pro_number: receipt.pro_number,
      receipt_type: receipt.receipt_type,
      receipt_data: receipt.receipt_data,
      created_at: receipt.created_at,
      updated_at: receipt.updated_at
    }));

    console.log(`✅ Found ${processedReceipts.length} receipts for PRO ${proNumber}`);
    return processedReceipts;
  } catch (error) {
    console.error('❌ Error in getReceiptsByPro:', error);
    throw error;
  }
}

// Get a single receipt by ID
export async function getReceiptById(receiptId) {
  console.log('🔍 Fetching receipt by ID:', receiptId);
  
  try {
    const { data: receipt, error } = await supabase
      .from('finance_receipts')
      .select(`
        id,
        pro_number,
        receipt_type,
        receipt_data,
        created_at,
        updated_at
      `)
      .eq('id', receiptId)
      .single();

    if (error) {
      console.error('❌ Error fetching receipt:', error);
      throw error;
    }

    const processedReceipt = {
      id: receipt.id,
      pro_number: receipt.pro_number,
      receipt_type: receipt.receipt_type,
      receipt_data: receipt.receipt_data,
      created_at: receipt.created_at,
      updated_at: receipt.updated_at
    };

    console.log('✅ Receipt fetched successfully');
    return processedReceipt;
  } catch (error) {
    console.error('❌ Error in getReceiptById:', error);
    throw error;
  }
}

// Export receipt to Word (local download only)
export async function exportReceiptToWord(receiptId, receiptData, proNumber, receiptType) {
  console.log('🔍 Exporting receipt to Word:', receiptId);
  
  try {
    // Generate Word document HTML
    const { generateStatementOfAccountsDoc, generateServiceInvoiceDoc } = await import('../../utils/receiptExportUtils');
    
    const htmlContent = receiptType === 'statement_of_accounts' 
      ? generateStatementOfAccountsDoc(receiptData, proNumber)
      : generateServiceInvoiceDoc(receiptData, proNumber);

    // Create blob
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    
    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${receiptType}_${proNumber}_${timestamp}.doc`;

    // Trigger download immediately
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ Receipt exported successfully:', filename);
    return { filename };
  } catch (error) {
    console.error('❌ Error in exportReceiptToWord:', error);
    throw error;
  }
}

// Delete a receipt
export async function deleteReceipt(receiptId) {
  console.log('🔍 Deleting receipt:', receiptId);
  
  try {
    // Get receipt details before deletion for logging
    const { data: receiptDetails } = await supabase
      .from('finance_receipts')
      .select('pro_number, receipt_type')
      .eq('id', receiptId)
      .single();

    const { error } = await supabase
      .from('finance_receipts')
      .delete()
      .eq('id', receiptId);

    console.log('🗑️ Delete operation result:', { error, receiptId });

    if (error) {
      console.error('❌ Error deleting receipt:', error);
      throw error;
    }

    // Log audit trail with proper user name and notification message
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (userId) {
       // Get user details for logging from profiles table
       let userName = 'Unknown User';
       try {
         console.log(`[deleteReceipt] Fetching user name from profiles table for user: ${userId}`)
         const { data: profile, error: profileError } = await supabase
           .from('profiles')
           .select('full_name')
           .eq('id', userId)
           .single()
         
         if (!profileError && profile?.full_name) {
           userName = profile.full_name
           console.log(`[deleteReceipt] Found user name in profiles: ${userName}`)
         } else {
           console.warn(`[deleteReceipt] Could not fetch user name from profiles:`, profileError)
           // Fallback to user ID if profile not found
           userName = `User ${userId.substring(0, 8)}`
         }
       } catch (err) {
         console.warn('Could not get user details from profiles:', err)
         userName = `User ${userId.substring(0, 8)}`
       }

      const receiptTypeDisplay = receiptDetails?.receipt_type === 'statement_of_accounts' ? 'Statement of Account' : 'Service Invoice';
      const proNumber = receiptDetails?.pro_number || 'Unknown';
      const notificationMessage = `${receiptTypeDisplay} deleted for PRO ${proNumber}`;

      const { error: logError } = await supabase
        .from('actions_log')
        .insert({
          user_id: userId,
          action: 'receipt_deleted',
          target_type: 'finance_receipt',
          target_id: receiptId,
          payload: { 
            pro_number: proNumber,
            receipt_type: receiptDetails?.receipt_type,
            receipt_type_display: receiptTypeDisplay,
            user_name: userName,
            notification_message: notificationMessage,
            deleted_at: new Date().toISOString()
          }
        });

      if (logError) {
        console.error('❌ Error logging receipt deletion:', logError);
        // Don't throw here, receipt was deleted successfully
      } else {
        console.log(`✅ Logged receipt deletion: ${receiptTypeDisplay} for PRO ${proNumber} by ${userName}`);
      }
    }

    console.log('✅ Receipt deleted successfully');
    
    // Verify deletion by trying to fetch the receipt
    const { data: verifyData, error: verifyError } = await supabase
      .from('finance_receipts')
      .select('id')
      .eq('id', receiptId)
      .single();
    
    console.log('🔍 Verification after delete:', { verifyData, verifyError });
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error in deleteReceipt:', error);
    throw error;
  }
}
