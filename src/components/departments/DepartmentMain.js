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
  routePrefix = ''
}) {
  return (
    <div className="dept-main">
      <div className="dept-top">
        {/* Render the provided chart window directly (no extra card) */}
        {PieChartComponent ? <PieChartComponent /> : null}
        <RemindersPanel title={'Reminders'} reminders={reminders} />
      </div>

      <TableList 
        title={title}
        columns={columns}
        data={rows}
        onAdd={onAdd}
        routePrefix={routePrefix}
      />
    </div>
  )
}


