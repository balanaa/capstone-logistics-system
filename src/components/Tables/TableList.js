import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TruckingStatusDropdown from '../TruckingStatusDropdown'
import { updateTruckingContainerStatus } from '../../services/supabase/truckingStatus'
import './TableList.css'

/**
 * TableList - reusable department list/table component
 *
 * Props:
 * - title (string)
 * - columns (Array<{ key, label }>)
 * - data (Array of row objects)
 * - onAdd (function)
 * - routePrefix (string) e.g. "/shipment"
 * - proKey (string) default "proNo"
 * - dateField (string) default "filedOn" or set to "created_at" for Supabase
 * - searchKeys (array of keys) default to columns keys
 * - rowsPerPage (number) default 10
 * - onOpenProfile (function) optional override for row click/navigation
 * - loading (bool) optional
 */
const Toast = ({ message, onClose }) => {
  return (
    <div className="toast" onClick={onClose}>
      {message}
    </div>
  );
};

export default function TableList({
  title = 'Records',
  columns = [],
  data = [],
  onAdd = () => {},
  showAddButton = true,
  routePrefix = '',
  proKey = 'proNo',
  dateField = 'createdOn',
  searchKeys = null,
  rowsPerPage = 10,
  onOpenProfile = null,
  loading = false,
  showTypeDropdown = false,
  customTypeOptions = null,
}) {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Handle trucking status changes
  const handleTruckingStatusChange = async (newStatus, containerId) => {
    try {
      // Get current user ID (you might need to adjust this based on your auth context)
      const userId = 'current-user-id'; // Replace with actual user ID from context
      
      await updateTruckingContainerStatus(containerId, newStatus, userId);
      
      // Show success message
      setToastMessage(`Status updated to ${newStatus}`);
      setShowToast(true);
      
      // Refresh the data by triggering a re-render
      // You might want to add a callback prop to refresh data from parent
      window.location.reload(); // Simple refresh for now
      
    } catch (error) {
      console.error('Error updating trucking status:', error);
      setToastMessage('Failed to update status');
      setShowToast(true);
    }
  };

  // Internal state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [holdTimer, setHoldTimer] = useState(null);
  const [activeHoldCell, setActiveHoldCell] = useState(null);
  const [expandedColumn, setExpandedColumn] = useState(null);

  // derive search keys from columns if not provided
  const effectiveSearchKeys = useMemo(() => {
    if (Array.isArray(searchKeys) && searchKeys.length) return searchKeys;
    return columns.map(c => c.key);
  }, [searchKeys, columns]);

  // Debounce the search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // apply search + date filters
  const filtered = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const s = debouncedSearch;

    // parse date inputs to Date objects if present
    const sd = startDate ? new Date(startDate) : null;
    const ed = endDate ? new Date(endDate) : null;
    if (ed) {
      // set ed to end of day for inclusive comparison
      ed.setHours(23, 59, 59, 999);
    }

    const base = data.filter(row => {
      // Date filter (apply to dateField, fallback to created_at)
      if (sd || ed) {
        const raw = row[dateField] ?? row.created_at ?? row.filedOn ?? null;
        if (!raw) return false;
        const rowDate = new Date(raw);
        if (isNaN(rowDate)) return false;
        if (sd && rowDate < sd) return false;
        if (ed && rowDate > ed) return false;
      }

      // Search filter (only across effectiveSearchKeys)
      if (!s) return true;
      return effectiveSearchKeys.some(k => {
        const val = row[k];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(s);
      });
    });

    // Sort by PRO number descending (assumes format YYYYNNN or numeric string)
    return [...base].sort((a, b) => {
      const aKey = String(a[proKey] || '');
      const bKey = String(b[proKey] || '');
      // Pad to 10 to be safe for lexicographic compare when lengths differ
      const ap = aKey.padStart(10, '0');
      const bp = bKey.padStart(10, '0');
      if (ap < bp) return 1;
      if (ap > bp) return -1;
      return 0;
    });
  }, [data, debouncedSearch, startDate, endDate, dateField, effectiveSearchKeys]);

  // Pagination calculations
  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);

  // Pagination window (max 5 page buttons, center current)
  const paginationWindow = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    const pages = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  // default navigation action
  const defaultOpenProfile = (row) => {
    const key = row[proKey];
    if (!key || !routePrefix) return;
    navigate(`${routePrefix}/pro-number/${key}`);
  };

  const handleOpen = (row) => {
    if (typeof onOpenProfile === 'function') return onOpenProfile(row);
    return defaultOpenProfile(row);
  };

  const handlePrev = () => { if (currentPage > 1) setCurrentPage(p => p - 1); };
  const handleNext = () => { if (currentPage < totalPages) setCurrentPage(p => p + 1); };
  const handleGoto = (p) => { if (p >= 1 && p <= totalPages) setCurrentPage(p); };

  // small date formatter
  const formatDate = (raw) => {
    if (!raw) return '-';
    const d = new Date(raw);
    if (isNaN(d)) return String(raw);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  };

  // consignee formatter - normalize consignee names
  const formatConsignee = (raw) => {
    if (!raw) return '-';
    const text = String(raw).toUpperCase();
    if (text.includes('PUREGOLD')) return 'PUREGOLD';
    if (text.includes('ROBINSON')) return 'ROBINSONS';
    if (text.includes('MOTOSCO') || text.includes('MONTOSCO')) return 'MONTOSCO';
    return raw; // Return original if no match
  };

  // container formatter - handle multiple containers with line breaks
  const formatContainers = (raw) => {
    if (!raw) return '-';
    
    // If it's already formatted with commas (from service), split and join with line breaks
    if (String(raw).includes(',')) {
      return String(raw).split(',').map(item => item.trim()).join('\n');
    }
    
    // If it's a single container, return as is
    return String(raw);
  };

  // PRO number formatter - highlight last 3 digits
  const formatProNumber = (raw) => {
    if (!raw) return '-';
    const str = String(raw);
    if (str.length <= 3) return str; // If too short, return as is
    
    // Split into prefix and last 3 digits
    const prefix = str.slice(0, -3);
    const suffix = str.slice(-3);
    
    return (
      <span>
        <span>{prefix}</span>
        <span style={{ fontWeight: 900, fontSize: '1.1em' }}>{suffix}</span>
      </span>
    );
  };

  // Document chips formatter - convert document names to colored chips
  const formatDocumentChips = (documentsString) => {
    if (!documentsString || documentsString === '-') return '-';
    
    const documentMap = {
      'Bill of Lading': { abbr: 'BoL', color: '#FFD4D4', fullName: 'Bill of Lading' },
      'Invoice': { abbr: 'CI', color: '#C9D9E4', fullName: 'Commercial Invoice' },
      'Packing List': { abbr: 'PL', color: '#E7FFD3', fullName: 'Packing List' },
      'Delivery Order': { abbr: 'DO', color: '#FFF6C0', fullName: 'Delivery Order' }
    };
    
    const documents = documentsString.split(', ').filter(d => d.trim());
    
    return (
      <div className="document-chips-container">
        {documents.map((doc, index) => {
          const docInfo = documentMap[doc.trim()];
          if (!docInfo) return null;
          
          return (
            <span 
              key={index}
              className="document-chip"
              style={{ backgroundColor: docInfo.color }}
              title={docInfo.fullName}
            >
              {docInfo.abbr}
            </span>
          );
        })}
      </div>
    );
  };

  // Clear filters handler
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  // Hold handler constants
  const holdDuration = 500; // 500ms hold time

  // Hold handlers to copy value with visual progress
  const handleCellMouseDown = (value, cellId) => {
    setActiveHoldCell(cellId); // Set which cell is being held
    
    const timer = setTimeout(() => {
      navigator.clipboard.writeText(value).then(() => {
        setToastMessage(`Copied '${value}'`);
        setShowToast(true);
        setActiveHoldCell(null);
        setTimeout(() => setShowToast(false), 3000);
      }).catch(err => console.error("Failed to copy: ", err));
      
      setHoldTimer(null);
    }, holdDuration);
    
    setHoldTimer(timer);
  };

  const handleCellMouseUp = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
    setActiveHoldCell(null);
  };

  const handleCellMouseLeave = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
    setActiveHoldCell(null);
  };

  // Handle column expand/collapse on double-click
  const handleCellDoubleClick = (columnKey) => {
    setExpandedColumn(prev => prev === columnKey ? null : columnKey);
  };

  // Click outside to collapse expanded column
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (expandedColumn && !e.target.closest('.table-list')) {
        setExpandedColumn(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [expandedColumn]);

  return (
    <div className="table-list-root">
      <div className="table-control-bar" role="toolbar" aria-label={`${title} controls`}>
        {/* Desktop Layout */}
        <div className="control-left">
          <h2 className="table-list-title-inline">{title} List</h2>
          {showAddButton && (
            <button className="table-list-add-btn-inline" onClick={onAdd}>
              <i className="fi fi-rs-plus"></i>
              <span className="btn-text-create">Create</span>
              <span className="btn-text-new">New</span>
              <span className="btn-text-shipment">Shipment</span>
            </button>
          )}
        </div>

        <div className="control-center">
          <div className="control-date">
            <label>Starting From:</label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="table-filter-date-inline"
              aria-label="Start date"
            />
          </div>
          <div className="control-date">
            <label>Ending To:</label>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="table-filter-date-inline"
              aria-label="End date"
            />
          </div>
          {showTypeDropdown && (
            <select className="type-dropdown" aria-label="Type filter">
              {customTypeOptions ? (
                customTypeOptions.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type}
                  </option>
                ))
              ) : (
                <>
                  <option value="all">All Types</option>
                  <option value="shipment">Shipment</option>
                  <option value="finance">Finance</option>
                  <option value="trucking">Trucking</option>
                </>
              )}
            </select>
          )}
          <div className="search-wrapper">
            <i className="fi fi-rs-search search-icon"></i>
            <input
              className="search-input"
              placeholder="Search"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              aria-label="Search records"
            />
          </div>
        </div>

        <div className="control-right">
          <button className="table-filter-btn-clear" onClick={clearFilters}>
            <i className="fi fi-rs-clear-alt"></i>
            Clear Filters
          </button>
          <div className="pagination-controls-wrapper">
            <div className="page-indicator" aria-live="polite">
              {currentPage}/{totalPages}
            </div>
            <div className="page-arrows">
              <button className="arrow-btn" onClick={handlePrev} disabled={currentPage === 1}>&lt;</button>
              <button className="arrow-btn" onClick={handleNext} disabled={currentPage === totalPages}>&gt;</button>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="mobile-controls">
          <div className="control-row control-row-title">
            <h2 className="table-list-title-inline">{title} List</h2>
            {showAddButton && (
              <button className="table-list-add-btn-inline" onClick={onAdd}>
                <i className="fi fi-rs-plus"></i>
                <span className="btn-text-create">Create</span>
                <span className="btn-text-new">New</span>
                <span className="btn-text-shipment">Shipment</span>
              </button>
            )}
          </div>

          <div className="control-row control-row-label">
            <label className="control-label">Starting From:</label>
          </div>

          <div className="control-row control-row-input">
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="table-filter-date-inline"
              aria-label="Start date"
            />
          </div>

          <div className="control-row control-row-label">
            <label className="control-label">Ending To:</label>
          </div>

          <div className="control-row control-row-input">
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="table-filter-date-inline"
              aria-label="End date"
            />
          </div>

          {showTypeDropdown && (
            <>
              <div className="control-row control-row-label">
                <label className="control-label">Type:</label>
              </div>
              <div className="control-row control-row-input">
                <select className="type-dropdown" aria-label="Type filter">
                  {customTypeOptions ? (
                    customTypeOptions.map(type => (
                      <option key={type} value={type}>
                        {type === 'all' ? 'All Types' : type}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="all">All Types</option>
                      <option value="shipment">Shipment</option>
                      <option value="finance">Finance</option>
                      <option value="trucking">Trucking</option>
                    </>
                  )}
                </select>
              </div>
            </>
          )}

          <div className="control-row control-row-label">
            <label className="control-label">Search:</label>
          </div>

          <div className="control-row control-row-input">
            <div className="search-wrapper">
              <i className="fi fi-rs-search search-icon"></i>
              <input
                className="search-input"
                placeholder="Search"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                aria-label="Search records"
              />
            </div>
          </div>

          <div className="control-row control-row-actions">
            <button className="table-filter-btn-clear" onClick={clearFilters}>
              <i className="fi fi-rs-clear-alt"></i>
              Clear Filters
            </button>
            <div className="page-indicator" aria-live="polite">
              {currentPage}/{totalPages}
            </div>
            <div className="page-arrows">
              <button className="arrow-btn" onClick={handlePrev} disabled={currentPage === 1}>&lt;</button>
              <button className="arrow-btn" onClick={handleNext} disabled={currentPage === totalPages}>&gt;</button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-list-wrapper">
        <table className="table-list" role="table" aria-label={`${title} table`}>
          <thead>
            <tr>
              <th style={{ width: '50px' }} scope="col" aria-hidden="true"></th>
              {columns.map(col => (
                <th 
                  key={col.key} 
                  scope="col"
                  data-column={col.key}
                  className={expandedColumn === col.key ? 'column-expanded' : 'column-shrunk'}
                  onDoubleClick={() => handleCellDoubleClick(col.key)}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1} style={{ textAlign:'center', padding:'2rem' }}>Loading…</td></tr>
            ) : currentRows.length > 0 ? (
              currentRows.map((row, idx) => {
                const status = (row.status || '').toString().toLowerCase();
                // Map display status to CSS class
                const getStatusClass = (statusText) => {
                  const statusMap = {
                    'ongoing': 'status-ongoing',
                    'filed boc': 'status-filed-boc',
                    'completed': 'status-complete',
                    'unpaid': 'status-unpaid',
                    'paid': 'status-paid'
                  }
                  return statusMap[statusText] || 'status-pending'
                }
                const statusClass = `status-chip ${getStatusClass(status)}`;
                // Check if row is complete (Completed or Paid status)
                const isComplete = status === 'completed' || status === 'paid';
                return (
                  <tr key={row.id || idx} className={isComplete ? 'row-complete' : ''}>
                    <td data-label="Actions">
                      <button
                        className="table-row-arrow"
                        onClick={() => handleOpen(row)}
                        aria-label={`Open profile for ${row[proKey] || 'record'}`}
                      >
                        ▶
                      </button>
                    </td>

                    {columns.map(col => {
                      const value = row[col.key] ?? '-';
                      if (col.key === dateField || col.key === 'created_at' || col.key === 'filedOn' || col.key === 'createdOn') {
                        return (
                          <td 
                            key={col.key} 
                            data-label={col.label}
                            className={expandedColumn === col.key ? 'column-expanded' : 'column-shrunk'}
                            onDoubleClick={() => handleCellDoubleClick(col.key)}
                          >
                            {formatDate(row[col.key] || row[dateField] || row.created_at || row.createdOn)}
                          </td>
                        );
                      }
                      if (col.key === 'consignee' || col.key === 'consigneeName') {
                        console.log(`[TableList] Processing ${col.key} for row ${row.id}:`, { value, formatted: formatConsignee(value) });
                        const cellId = `${row.id}-${col.key}`;
                        return (
                          <td 
                            key={col.key} 
                            data-label={col.label} 
                            onMouseDown={() => handleCellMouseDown(value, cellId)}
                            onMouseUp={handleCellMouseUp}
                            onMouseLeave={handleCellMouseLeave}
                            onDoubleClick={() => handleCellDoubleClick(col.key)}
                            className={`${activeHoldCell === cellId ? 'cell-copy-holding' : ''} ${expandedColumn === col.key ? 'column-expanded' : 'column-shrunk'}`}
                          >
                            {activeHoldCell === cellId && (
                              <div className="copy-progress-bar" style={{ animationDuration: `${holdDuration}ms` }}></div>
                            )}
                            <span className="cell-content-wrapper">{formatConsignee(value)}</span>
                          </td>
                        );
                      }
                      if (col.key === 'containerNoSealNo' || col.key === 'containerNo' || col.key === 'containerNumber') {
                        const formattedContainers = formatContainers(value);
                        const cellId = `${row.id}-${col.key}`;
                        return (
                          <td 
                            key={col.key} 
                            data-label={col.label} 
                            className={`container-cell ${activeHoldCell === cellId ? 'cell-copy-holding' : ''} ${expandedColumn === col.key ? 'column-expanded' : 'column-shrunk'}`} 
                            onMouseDown={() => handleCellMouseDown(value, cellId)}
                            onMouseUp={handleCellMouseUp}
                            onMouseLeave={handleCellMouseLeave}
                            onDoubleClick={() => handleCellDoubleClick(col.key)}
                          >
                            {activeHoldCell === cellId && (
                              <div className="copy-progress-bar" style={{ animationDuration: `${holdDuration}ms` }}></div>
                            )}
                            <span className="cell-content-wrapper">
                              {formattedContainers.split('\n').map((line, index) => (
                                <div key={index} className="container-line">{line}</div>
                              ))}
                            </span>
                          </td>
                        );
                      }
                      if (col.key === proKey) {
                        // Format PRO number with highlighted last 3 digits
                        return (
                          <td 
                            key={col.key} 
                            data-label={col.label}
                            className={expandedColumn === col.key ? 'column-expanded' : 'column-shrunk'}
                            onDoubleClick={() => handleCellDoubleClick(col.key)}
                          >
                            {formatProNumber(value)}
                          </td>
                        );
                      }
                      if (col.key === 'documentsRecorded') {
                        // Format documents as colored chips
                        return (
                          <td 
                            key={col.key} 
                            data-label={col.label}
                            className={expandedColumn === col.key ? 'column-expanded' : 'column-shrunk'}
                            onDoubleClick={() => handleCellDoubleClick(col.key)}
                          >
                            {formatDocumentChips(value)}
                          </td>
                        );
                      }
                      if (col.key === 'status') {
                        // Check if this is a trucking status (has containerId)
                        if (row.containerId && row.rawStatus) {
                          return (
                            <td 
                              key={col.key} 
                              data-label={col.label}
                              className={expandedColumn === col.key ? 'column-expanded' : 'column-shrunk'}
                              onDoubleClick={() => handleCellDoubleClick(col.key)}
                            >
                              <TruckingStatusDropdown
                                currentStatus={row.rawStatus}
                                onStatusChange={handleTruckingStatusChange}
                                containerId={row.containerId}
                              />
                            </td>
                          );
                        }
                        // Regular status chip for other departments
                        return (
                          <td 
                            key={col.key} 
                            data-label={col.label}
                            className={expandedColumn === col.key ? 'column-expanded' : 'column-shrunk'}
                            onDoubleClick={() => handleCellDoubleClick(col.key)}
                          >
                            <span className={statusClass}>{value}</span>
                          </td>
                        );
                      }
                      const cellId = `${row.id}-${col.key}`;
                      return (
                        <td 
                          key={col.key} 
                          data-label={col.label} 
                          onMouseDown={() => handleCellMouseDown(value, cellId)}
                          onMouseUp={handleCellMouseUp}
                          onMouseLeave={handleCellMouseLeave}
                          onDoubleClick={() => handleCellDoubleClick(col.key)}
                          className={`${activeHoldCell === cellId ? 'cell-copy-holding' : ''} ${expandedColumn === col.key ? 'column-expanded' : 'column-shrunk'}`}
                        >
                          {activeHoldCell === cellId && (
                            <div className="copy-progress-bar" style={{ animationDuration: `${holdDuration}ms` }}></div>
                          )}
                          <span className="cell-content-wrapper">{value}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '2rem' }}>No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - moved outside table wrapper */}
      <div className="table-list-pagination">
        <button className="pagination-btn" onClick={() => handleGoto(1)} disabled={currentPage === 1} title="First">
          <i className="fi fi-rs-angle-double-left"></i>
        </button>
        <button className="pagination-btn" onClick={handlePrev} disabled={currentPage === 1} title="Previous">
          <i className="fi fi-rs-angle-left"></i>
        </button>
        {paginationWindow[0] > 1 && <span className="dots">…</span>}
        {paginationWindow.map(p => (
          <button
            key={p}
            className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
            onClick={() => handleGoto(p)}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        {paginationWindow[paginationWindow.length - 1] < totalPages && <span className="dots">…</span>}
        <button className="pagination-btn" onClick={handleNext} disabled={currentPage === totalPages} title="Next">
          <i className="fi fi-rs-angle-right"></i>
        </button>
        <button className="pagination-btn" onClick={() => handleGoto(totalPages)} disabled={currentPage === totalPages} title="Last">
          <i className="fi fi-rs-angle-double-right"></i>
        </button>
      </div>

      {showToast && (
        <Toast message={toastMessage} onClose={() => setShowToast(false)} />
      )}
    </div>
  );
}
