import { useEffect, useRef, useCallback } from 'react';

/**
 * Global table navigation hook for Excel-like keyboard navigation
 * Supports arrow key navigation between table cells and action buttons
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.rows - Number of rows in the table
 * @param {number} options.columns - Number of columns in the table
 * @param {boolean} options.wrapAround - Enable wrap-around navigation (default: true)
 * @param {Function} options.onAddItem - Callback for add item button
 * @param {Function} options.onDeleteItem - Callback for delete button
 * @param {string} options.tableSelector - CSS selector for the table container
 * @returns {Object} Navigation state and handlers
 */
export const useTableNavigation = (options = {}) => {
  const {
    rows = 0,
    columns = 0,
    wrapAround = true,
    onAddItem = null,
    onDeleteItem = null,
    tableSelector = '.invoice-table'
  } = options;

  const tableRef = useRef(null);
  const currentPosition = useRef({ row: 0, col: 0 });
  const isNavigating = useRef(false);

  /**
   * Get the current focused element within the table
   */
  const getCurrentFocusedElement = useCallback(() => {
    if (!tableRef.current) return null;
    return tableRef.current.querySelector(':focus');
  }, []);

  /**
   * Get the position of the currently focused element
   */
  const getCurrentPosition = useCallback(() => {
    const focusedElement = getCurrentFocusedElement();
    if (!focusedElement) return { row: 0, col: 0 };

    // Find the row and column of the focused element
    const row = focusedElement.closest('tr');
    const cell = focusedElement.closest('td, th');
    
    if (!row || !cell) return { row: 0, col: 0 };

    const rowIndex = Array.from(row.parentNode.children).indexOf(row);
    const colIndex = Array.from(row.children).indexOf(cell);

    return { row: rowIndex, col: colIndex };
  }, [getCurrentFocusedElement]);

  /**
   * Calculate the new position based on navigation direction
   */
  const calculateNewPosition = useCallback((currentPos, direction) => {
    let newRow = currentPos.row;
    let newCol = currentPos.col;

    switch (direction) {
      case 'ArrowUp':
        newRow = Math.max(0, currentPos.row - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(rows - 1, currentPos.row + 1);
        break;
      case 'ArrowLeft':
        if (currentPos.col > 0) {
          newCol = currentPos.col - 1;
        } else if (wrapAround && currentPos.row > 0) {
          // Wrap to last column of previous row
          newRow = currentPos.row - 1;
          newCol = columns - 1;
        }
        break;
      case 'ArrowRight':
        if (currentPos.col < columns - 1) {
          newCol = currentPos.col + 1;
        } else if (wrapAround && currentPos.row < rows - 1) {
          // Wrap to first column of next row
          newRow = currentPos.row + 1;
          newCol = 0;
        }
        break;
      default:
        return currentPos;
    }

    return { row: newRow, col: newCol };
  }, [rows, columns, wrapAround]);

  /**
   * Get the element at a specific position
   */
  const getElementAtPosition = useCallback((position) => {
    if (!tableRef.current) return null;

    const table = tableRef.current.querySelector('table');
    if (!table) return null;

    const tbody = table.querySelector('tbody');
    if (!tbody) return null;

    const tableRows = Array.from(tbody.children);
    if (position.row >= tableRows.length) return null;

    const row = tableRows[position.row];
    const cells = Array.from(row.children);
    
    if (position.col >= cells.length) return null;

    const cell = cells[position.col];
    
    // Look for input or button within the cell
    const input = cell.querySelector('input');
    const button = cell.querySelector('button');
    
    // Debug logging for delete buttons
    if (button && button.classList.contains('invoice-delete-btn')) {
      console.log('Found delete button at position:', position, button);
    }
    
    return input || button || cell;
  }, []);

  /**
   * Set focus to a specific element
   */
  const setFocus = useCallback((element) => {
    if (!element) return false;

    // Handle different element types
    if (element.tagName === 'INPUT' || element.tagName === 'BUTTON') {
      element.focus();
      return true;
    }

    // If it's a cell, try to focus the first focusable element
    const focusableElement = element.querySelector('input, button');
    if (focusableElement) {
      focusableElement.focus();
      return true;
    }

    return false;
  }, []);

  /**
   * Navigate to a specific cell
   */
  const navigateToCell = useCallback((direction) => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    try {
      const currentPos = getCurrentPosition();
      const newPos = calculateNewPosition(currentPos, direction);
      
      console.log('Navigation:', {
        direction,
        currentPos,
        newPos,
        rows,
        columns
      });
      
      // Check if position changed
      if (newPos.row !== currentPos.row || newPos.col !== currentPos.col) {
        const targetElement = getElementAtPosition(newPos);
        console.log('Target element:', targetElement, 'at position:', newPos);
        if (targetElement) {
          const focused = setFocus(targetElement);
          console.log('Focus result:', focused, targetElement);
          if (focused) {
            currentPosition.current = newPos;
          }
        }
      }
    } finally {
      isNavigating.current = false;
    }
  }, [getCurrentPosition, calculateNewPosition, getElementAtPosition, setFocus, rows, columns]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback((event) => {
    // Only handle arrow keys
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      return;
    }

    // Check if the event is within our table
    const focusedElement = getCurrentFocusedElement();
    if (!focusedElement || !tableRef.current?.contains(focusedElement)) {
      return;
    }

    // Prevent default arrow key behavior
    event.preventDefault();
    event.stopPropagation();

    // Navigate to the new cell
    navigateToCell(event.key);
  }, [getCurrentFocusedElement, navigateToCell]);

  /**
   * Handle special key combinations
   */
  const handleSpecialKeys = useCallback((event) => {
    const focusedElement = getCurrentFocusedElement();
    if (!focusedElement || !tableRef.current?.contains(focusedElement)) {
      return;
    }

    // Handle Enter key on buttons
    if (event.key === 'Enter' && focusedElement.tagName === 'BUTTON') {
      event.preventDefault();
      focusedElement.click();
    }

    // Handle Delete key on delete buttons
    if (event.key === 'Delete' && focusedElement.classList?.contains('invoice-delete-btn')) {
      event.preventDefault();
      focusedElement.click();
    }
  }, [getCurrentFocusedElement]);

  /**
   * Initialize the navigation system
   */
  const initializeNavigation = useCallback(() => {
    if (!tableRef.current) return;

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleSpecialKeys);

    // Set initial focus to first input if available
    const firstInput = tableRef.current.querySelector('input');
    if (firstInput) {
      firstInput.focus();
      currentPosition.current = { row: 0, col: 0 };
    }
  }, [handleKeyDown, handleSpecialKeys]);

  /**
   * Cleanup navigation system
   */
  const cleanupNavigation = useCallback(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keydown', handleSpecialKeys);
  }, [handleKeyDown, handleSpecialKeys]);

  // Initialize and cleanup
  useEffect(() => {
    initializeNavigation();
    return cleanupNavigation;
  }, [initializeNavigation, cleanupNavigation]);

  // Update current position when rows/columns change
  useEffect(() => {
    if (currentPosition.current.row >= rows) {
      currentPosition.current.row = Math.max(0, rows - 1);
    }
    if (currentPosition.current.col >= columns) {
      currentPosition.current.col = Math.max(0, columns - 1);
    }
  }, [rows, columns]);

  return {
    tableRef,
    currentPosition: currentPosition.current,
    navigateToCell,
    setFocus,
    getCurrentPosition,
    getElementAtPosition
  };
};

export default useTableNavigation;
