import React from 'react'
import './DepartmentMain.css'
import RemindersPanel from './RemindersPanel'
import TableList from '../Tables/TableList'

export default function DepartmentMain({
  title,
  PieChartComponent,
  reminders = [], // [{ title, proNo, deadline }]
  columns = [],
  rows = [],
  onAdd,
  showAddButton = true,
  routePrefix = '',
  loading = false,
  isTruckingThreeCharts = false, // Special prop for trucking layout
  // Additional props for TableList
  proKey = 'proNo',
  dateField = 'createdOn',
  searchKeys = null,
  rowsPerPage = 10,
  onOpenProfile = null,
  showTypeDropdown = false,
}) {
  return (
    <div className="dept-main">
      <div className={`dept-top ${isTruckingThreeCharts ? 'trucking-three-charts' : ''}`}>
        {/* Render the provided chart window directly (no extra card) */}
        {PieChartComponent ? <PieChartComponent /> : null}
        <RemindersPanel title={'Reminders'} reminders={reminders} />
      </div>

      <TableList 
        title={title}
        columns={columns}
        data={rows}
        onAdd={onAdd}
        showAddButton={showAddButton}
        routePrefix={routePrefix}
        loading={loading}
        proKey={proKey}
        dateField={dateField}
        searchKeys={searchKeys}
        rowsPerPage={rowsPerPage}
        onOpenProfile={onOpenProfile}
        showTypeDropdown={showTypeDropdown}
      />
    </div>
  )
}


