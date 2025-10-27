import React, { useState, useEffect, useRef } from 'react'
import { updateContainerOperation, deleteContainerOperation, formatDateForDisplay, parseDateFromInput } from '../services/supabase/containerOperations'
import ContainerStatusDropdown from './ContainerStatusDropdown'
import { supabase } from '../services/supabase/client'
import './ContainerBlock.css'

// Debounce delay for auto-save (can be adjusted)
const AUTOSAVE_DELAY = 500

// Individual container block component
function ContainerOperationBlock({ 
  operation, 
  onUpdate, 
  onDelete, 
  isReadOnly = false,
  driverNames = [],
  truckPlateNumbers = [],
  isHighlighted = false
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    departure_date_from_port: operation.departure_date_from_port || '',
    driver: operation.driver || '',
    truck_plate_number: operation.truck_plate_number || '',
    date_of_return_to_yard: operation.date_of_return_to_yard || ''
  })
  const [highlightedFields, setHighlightedFields] = useState([])
  
  const debounceTimerRef = useRef(null)
  const pendingChangesRef = useRef({})

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

  // Handle field blur (auto-save with debounce and batching)
  const handleBlur = (fieldName) => {
    const currentValue = values[fieldName]
    const originalValue = operation[fieldName] || ''
    
    console.log(`[handleBlur] Field: ${fieldName}, Current: "${currentValue}", Original: "${originalValue}"`)
    
    if (currentValue !== originalValue) {
      // Add to pending changes
      pendingChangesRef.current[fieldName] = currentValue
      console.log(`[handleBlur] Added to pending changes: ${fieldName}`)
    }
    
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Set a new timer to batch save all pending changes
    debounceTimerRef.current = setTimeout(() => {
      const pendingChanges = { ...pendingChangesRef.current }
      console.log(`[handleBlur] Batch saving changes after ${AUTOSAVE_DELAY}ms delay:`, pendingChanges)
      
      // Process date fields in pending changes
      const processedUpdates = {}
      for (const [field, value] of Object.entries(pendingChanges)) {
        let processedValue = value
        if (field.includes('date') && value) {
          processedValue = parseDateFromInput(value)
          console.log(`[handleBlur] Date field processed: ${value} -> ${processedValue}`)
        }
        processedUpdates[field] = processedValue
      }
      
      // Batch save all pending changes at once
      if (Object.keys(processedUpdates).length > 0) {
        console.log(`[handleBlur] Batch updating operation ${operation.id} with:`, processedUpdates)
        
        supabase.auth.getUser().then(({ data: { user } }) => {
          const userId = user?.id
          
          updateContainerOperation(operation.id, processedUpdates, userId)
            .then(() => {
              console.log(`[handleBlur] Batch update successful`)
              
              // Auto-change container status to "returned" when return date is set
              if (processedUpdates.date_of_return_to_yard) {
                console.log(`[handleBlur] Auto-setting status to returned for operation ${operation.id}`)
                const statusUpdates = { status: 'returned' }
                updateContainerOperation(operation.id, statusUpdates)
                  .then(() => {
                    onUpdate && onUpdate(operation.id, { ...processedUpdates, ...statusUpdates })
                  })
                  .catch(error => {
                    console.error('Error updating container status:', error)
                  })
              } else {
                // Notify parent with all updates
                onUpdate && onUpdate(operation.id, processedUpdates)
              }
              
              // Clear pending changes
              pendingChangesRef.current = {}
            })
            .catch(error => {
              console.error(`[handleBlur] Error saving batch changes:`, error)
            })
        })
      }
    }, AUTOSAVE_DELAY)
  }

  // Handle field change
  const handleChange = (fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }))
  }

  // Check if return date should be disabled (requires: departure date, driver, and plate number)
  const isReturnDateDisabled = !values.departure_date_from_port || !values.driver || !values.truck_plate_number

  // Handle clear all fields
  const handleClearAll = async () => {
    if (isReadOnly || saving) return
    
    if (window.confirm(`Clear all fields for ${operation.container_number}?`)) {
      try {
        setSaving(true)
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id
        
        const clearedFields = {
          departure_date_from_port: null,
          driver: null,
          truck_plate_number: null,
          date_of_return_to_yard: null
        }
        
        await updateContainerOperation(operation.id, clearedFields, userId)
        
        // Update local state
        setValues({
          departure_date_from_port: '',
          driver: '',
          truck_plate_number: '',
          date_of_return_to_yard: ''
        })
        
        // Notify parent
        onUpdate && onUpdate(operation.id, clearedFields)
      } catch (error) {
        console.error('Error clearing fields:', error)
      } finally {
        setSaving(false)
      }
    }
  }

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
    <div className={`container-block ${isHighlighted ? 'container-highlight' : ''}`}>
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
            returnDate={values.date_of_return_to_yard}
            departureDate={values.departure_date_from_port}
            driver={values.driver}
            truckPlateNumber={values.truck_plate_number}
            onHighlightMissingFields={setHighlightedFields}
          />
        </div>
        {!isReadOnly && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="delete-btn"
              onClick={handleClearAll}
              title="Clear all fields"
            >
              <i className="fi fi-rs-rotate-left"></i>
            </button>
            <button 
              className="delete-btn"
              onClick={handleDelete}
              title="Delete container operation"
            >
              <i className="fi fi-rs-trash"></i>
            </button>
          </div>
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
              className={`${saving ? 'saving' : ''} ${highlightedFields.includes('departure_date_from_port') ? 'field-highlight' : ''}`}
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
            <>
              <input
                type="text"
                list={`driver-list-${operation.id}`}
                placeholder="Driver name"
                value={values.driver}
                onChange={(e) => handleChange('driver', e.target.value)}
                onBlur={() => handleBlur('driver')}
                className={`${saving ? 'saving' : ''} ${highlightedFields.includes('driver') ? 'field-highlight' : ''}`}
              />
              {driverNames.length > 0 && (
                <datalist id={`driver-list-${operation.id}`}>
                  {driverNames.map((name, idx) => (
                    <option key={idx} value={name} />
                  ))}
                </datalist>
              )}
            </>
          )}
        </div>

        {/* Truck Plate Number */}
        <div className="field-group">
          <label>Truck Plate Number</label>
          {isReadOnly ? (
            <div className="field-value">{getDisplayValue('truck_plate_number')}</div>
          ) : (
            <>
              <input
                type="text"
                list={`truck-plate-list-${operation.id}`}
                placeholder="License plate"
                value={values.truck_plate_number}
                onChange={(e) => handleChange('truck_plate_number', e.target.value)}
                onBlur={() => handleBlur('truck_plate_number')}
                className={`${saving ? 'saving' : ''} ${highlightedFields.includes('truck_plate_number') ? 'field-highlight' : ''}`}
              />
              {truckPlateNumbers.length > 0 && (
                <datalist id={`truck-plate-list-${operation.id}`}>
                  {truckPlateNumbers.map((plate, idx) => (
                    <option key={idx} value={plate} />
                  ))}
                </datalist>
              )}
            </>
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
              className={`${saving ? 'saving' : ''} ${highlightedFields.includes('date_of_return_to_yard') ? 'field-highlight' : ''}`}
              disabled={isReturnDateDisabled || saving}
              title={isReturnDateDisabled ? 'Please set departure date, driver, and plate number first' : ''}
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
    <div 
      className="add-container-block"
      onClick={!disabled ? onAdd : undefined}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <i className="fi fi-rs-container-storage"></i>
      <span className="add-container-text">Add Container</span>
    </div>
  )
}

// Main ContainerBlock component
export default function ContainerBlock({ 
  operations = [], 
  onOperationsChange, 
  isReadOnly = false,
  driverNames = [],
  truckPlateNumbers = [],
  highlightedContainerIds = []
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
              driverNames={driverNames}
              truckPlateNumbers={truckPlateNumbers}
              isHighlighted={highlightedContainerIds.includes(operation.id)}
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
