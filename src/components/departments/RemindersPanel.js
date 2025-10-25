import React from 'react'
import './RemindersPanel.css'

function formatDue(deadlineIso) {
  const now = new Date()
  const end = new Date(deadlineIso)
  const diffMs = end - now
  
  // If deadline is in the past, show "ago"
  if (diffMs < 0) {
    const absDiffMs = Math.abs(diffMs)
    const mins = Math.floor(absDiffMs / 60000)
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }
  
  // If deadline is now
  if (diffMs === 0) return 'Due now'
  
  // If deadline is in the future, show "Due in"
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `Due in ${mins} min${mins === 1 ? '' : 's'}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Due in ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  return `Due in ${days} day${days === 1 ? '' : 's'}`
}

export default function RemindersPanel({ title = 'Reminders', reminders = [] }) {
  return (
    <div className="rem-panel">
      <div className="rem-header">{title}</div>
      <div className="rem-body">
        {reminders.length === 0 ? (
          <div className="rem-row">
            <div className="rem-title">No reminders</div>
          </div>
        ) : reminders.map((r, idx) => (
          <div key={idx} className="rem-row">
            <div className="rem-col">
              <div className="rem-title">{r.title} for {r.proNo}</div>
              <div className="rem-sub">{formatDue(r.deadline)}</div>
            </div>
            <div className="rem-date">{new Date(r.deadline).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}


