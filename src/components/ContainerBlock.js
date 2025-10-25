import React, { useState, useEffect } from 'react'
import { updateContainerOperation, deleteContainerOperation, formatDateForDisplay, parseDateFromInput } from '../services/supabase/containerOperations'
import ContainerStatusDropdown from './ContainerStatusDropdown'
import { supabase } from '../services/supabase/client'
import './ContainerBlock.css'

// Individual container block component
function ContainerOperationBlock({ 
  operation, 
  onUpdate, 
  onDelete, 
  isReadOnly = false 
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    departure_date_from_port: operation.departure_date_from_port || '',
    driver: operation.driver || '',
    truck_plate_number: operation.truck_plate_number || '',
    chassis_number: operation.chassis_number || '',
    date_of_return_to_yard: operation.date_of_return_to_yard || ''
  })

  // Auto-save function
  const saveField = async (fieldName, value) => {
    if (isReadOnly || saving) return

    console.log(`[saveField] Attempting to save ${fieldName} with value:`, value)
    setSaving(true)
    try {
      // Get current user ID for logging
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id

      // Parse date fields
      let processedValue = value
      if (fieldName.includes('date') && value) {
        processedValue = parseDateFromInput(value)
        console.log(`[saveField] Date field processed: ${value} -> ${processedValue}`)
      }

      const updates = { [fieldName]: processedValue }
      console.log(`[saveField] Updating operation ${operation.id} with:`, updates)
      
      const result = await updateContainerOperation(operation.id, updates, userId)
      console.log(`[saveField] Update successful:`, result)
      
      // Update local state with the processed value
      setValues(prev => ({ ...prev, [fieldName]: processedValue || value }))
      
      // Notify parent
      onUpdate && onUpdate(operation.id, updates)
    } catch (error) {
      console.error(`[saveField] Error saving field ${fieldName}:`, error)
      console.error(`[saveField] Error details:`, {
        fieldName,
        value,
        operationId: operation.id,
        errorMessage: error.message,
        errorCode: error.code
      })
      // Don't revert on error - keep user's input
      // The user can try again or the error will be handled elsewhere
    } finally {
      setSaving(false)
    }
  }

  // Handle field blur (auto-save)
  const handleBlur = (fieldName) => {
    const currentValue = values[fieldName]
    const originalValue = operation[fieldName] || ''
    
    console.log(`[handleBlur] Field: ${fieldName}, Current: "${currentValue}", Original: "${originalValue}"`)
    
    if (currentValue !== originalValue) {
      console.log(`[handleBlur] Value changed, saving ${fieldName}`)
      saveField(fieldName, currentValue)
      
      // Auto-change container status to "returned" when return date is set
      if (fieldName === 'date_of_return_to_yard' && currentValue) {
        console.log(`[handleBlur] Auto-setting status to returned for operation ${operation.id}`)
        // Update the operation status directly
        const updates = { status: 'returned' }
        updateContainerOperation(operation.id, updates)
          .then(() => {
            // Notify parent to update the operation data
            onUpdate && onUpdate(operation.id, updates)
          })
          .catch(error => {
            console.error('Error updating container status:', error)
          })
      }
    } else {
      console.log(`[handleBlur] No change detected for ${fieldName}`)
    }
  }

  // Handle field change
  const handleChange = (fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }))
  }

  // Check if return date should be disabled
  const isReturnDateDisabled = !values.departure_date_from_port

  // Handle delete
  const handleDelete = async () => {
    if (isReadOnly) return
    
    if (window.confirm(`Delete container operation for ${operation.container_number}?`)) {
      try {
        console.log(`[handleDelete] Deleting container operation ${operation.id} for ${operation.container_number}`)
        await deleteContainerOperation(operation.id)
        console.log(`[handleDelete] Database delete successful, notifying parent`)
        onDelete && onDelete(operation.id)
      } catch (error) {
        console.error('Error deleting container operation:', error)
      }
    }
  }

  // Format display values
  const getDisplayValue = (fieldName) => {
    const value = values[fieldName]
    if (fieldName.includes('date') && value) {
      return formatDateForDisplay(value)
    }
    return value || '--'
  }

  return (
    <div className="container-block">
      {/* Header with Container/Seal info and Delete button */}
      <div className="container-block-header">
        <div className="container-info-group">
          <div className="container-info">
            <h3 className="container-title">{operation.container_number}</h3>
            {operation.seal_number && (
              <span className="seal-number">{operation.seal_number}</span>
            )}
          </div>
          <ContainerStatusDropdown
            operationId={operation.id}
            currentStatus={operation.status || 'booking'}
            onStatusChange={(newStatus) => onUpdate && onUpdate(operation.id, { status: newStatus })}
          />
        </div>
        {!isReadOnly && (
          <button 
            className="delete-btn"
            onClick={handleDelete}
            title="Delete container operation"
          >
            <i className="fi fi-rs-trash"></i>
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="container-fields">
        {/* Departure Date */}
        <div className="field-group">
          <label>Departure Date from Port</label>
          {isReadOnly ? (
            <div className="field-value">{getDisplayValue('departure_date_from_port')}</div>
          ) : (
            <input
              type="date"
              value={values.departure_date_from_port ? new Date(values.departure_date_from_port).toISOString().split('T')[0] : ''}
              onChange={(e) => handleChange('departure_date_from_port', e.target.value)}
              onBlur={() => handleBlur('departure_date_from_port')}
              className={saving ? 'saving' : ''}
            />
          )}
        </div>

        {/* Spacer */}
        <div className="field-spacer"></div>

        {/* Driver */}
        <div className="field-group">
          <label>Driver</label>
          {isReadOnly ? (
            <div className="field-value">{getDisplayValue('driver')}</div>
          ) : (
            <input
              type="text"
              placeholder="Driver name"
              value={values.driver}
              onChange={(e) => handleChange('driver', e.target.value)}
              onBlur={() => handleBlur('driver')}
              className={saving ? 'saving' : ''}
            />
          )}
        </div>

        {/* Truck Plate Number */}
        <div className="field-group">
          <label>Truck Plate Number</label>
          {isReadOnly ? (
            <div className="field-value">{getDisplayValue('truck_plate_number')}</div>
          ) : (
            <input
              type="text"
              placeholder="License plate"
              value={values.truck_plate_number}
              onChange={(e) => handleChange('truck_plate_number', e.target.value)}
              onBlur={() => handleBlur('truck_plate_number')}
              className={saving ? 'saving' : ''}
            />
          )}
        </div>

        {/* Chassis Number */}
        <div className="field-group">
          <label>Chassis Number</label>
          {isReadOnly ? (
            <div className="field-value">{getDisplayValue('chassis_number')}</div>
          ) : (
            <input
              type="text"
              placeholder="Chassis identifier"
              value={values.chassis_number}
              onChange={(e) => handleChange('chassis_number', e.target.value)}
              onBlur={() => handleBlur('chassis_number')}
              className={saving ? 'saving' : ''}
            />
          )}
        </div>

        {/* Spacer */}
        <div className="field-spacer"></div>

        {/* Date of Return to Yard */}
        <div className="field-group">
          <label>Date of Return to Yard</label>
          {isReadOnly ? (
            <div className="field-value">{getDisplayValue('date_of_return_to_yard')}</div>
          ) : (
            <input
              type="date"
              value={values.date_of_return_to_yard ? new Date(values.date_of_return_to_yard).toISOString().split('T')[0] : ''}
              onChange={(e) => handleChange('date_of_return_to_yard', e.target.value)}
              onBlur={() => handleBlur('date_of_return_to_yard')}
              className={saving ? 'saving' : ''}
              disabled={isReturnDateDisabled || saving}
              title={isReturnDateDisabled ? 'Please set departure date first' : ''}
            />
          )}
        </div>
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="saving-indicator">
          <span>Saving...</span>
        </div>
      )}
    </div>
  )
}

// Add Container button component
function AddContainerButton({ onAdd, disabled = false }) {
  return (
    <div className="add-container-block">
      <button 
        className="add-container-btn"
        onClick={onAdd}
        disabled={disabled}
      >
        + Add Container
      </button>
    </div>
  )
}

// Main ContainerBlock component
export default function ContainerBlock({ 
  operations = [], 
  onOperationsChange, 
  isReadOnly = false 
}) {
  const [operationsList, setOperationsList] = useState(operations)
  const [loading, setLoading] = useState(false)

  // Update local state when props change
  useEffect(() => {
    setOperationsList(operations)
  }, [operations])

  // Handle operation update
  const handleOperationUpdate = (operationId, updates) => {
    setOperationsList(prev => {
      const updatedList = prev.map(op => 
        op.id === operationId 
          ? { ...op, ...updates }
          : op
      )
      // Notify parent with the updated list
      onOperationsChange && onOperationsChange(updatedList)
      return updatedList
    })
  }

  // Handle operation delete
  const handleOperationDelete = (operationId) => {
    console.log(`[handleOperationDelete] Removing operation ${operationId} from list`)
    setOperationsList(prev => {
      const updatedList = prev.filter(op => op.id !== operationId)
      console.log(`[handleOperationDelete] Updated list length: ${updatedList.length} (was ${prev.length})`)
      // Notify parent with the updated list
      onOperationsChange && onOperationsChange(updatedList)
      return updatedList
    })
  }

  // Handle add container
  const handleAddContainer = () => {
    // This will be handled by the parent component
    onOperationsChange && onOperationsChange(operationsList, 'add')
  }

  return (
    <div className="container-blocks-container">
      <h2>Container Operations</h2>
      
      {operationsList.length === 0 ? (
        <div className="no-containers">
          <p>No container operations found. Upload a BOL to auto-generate container records.</p>
        </div>
      ) : (
        <div className="container-blocks-grid">
          {operationsList.map(operation => (
            <ContainerOperationBlock
              key={operation.id}
              operation={operation}
              onUpdate={handleOperationUpdate}
              onDelete={handleOperationDelete}
              isReadOnly={isReadOnly}
            />
          ))}
          
          {!isReadOnly && (
            <AddContainerButton 
              onAdd={handleAddContainer}
              disabled={loading}
            />
          )}
        </div>
      )}
    </div>
  )
}
