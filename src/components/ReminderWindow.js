import React from 'react'
import './RemarksWindow.css'

export default function ReminderWindow({ title = 'Reminders', bgColor = '#FFF6C0', proNo, onSaved = () => {} }) {
	const formatToday = () => {
		const d = new Date()
		const mm = String(d.getMonth() + 1).padStart(2, '0')
		const dd = String(d.getDate()).padStart(2, '0')
		const yy = String(d.getFullYear()).slice(-2)
		return `${mm}/${dd}/${yy}`
	}

	// Mock data for reminders - will be replaced with real data later
	const mockReminders = [
		{ date: '01/15/25', notes: 'Follow up on payment for PRO-2025001' },
		{ date: '01/20/25', notes: 'Send invoice to PUREGOLD for completed shipments' },
		{ date: '01/25/25', notes: 'Review outstanding payments for Q1 2025' }
	]

	const [rows, setRows] = React.useState(() => mockReminders)
	const [loading, setLoading] = React.useState(false)
	const [saving, setSaving] = React.useState(false)
	const [error, setError] = React.useState('')

	React.useEffect(() => {
		let mounted = true
		async function load() {
			if (!proNo) return
			setError('')
			setLoading(true)
			try {
				// For now, use mock data
				// TODO: Replace with actual reminder service when implemented
				if (!mounted) return
				setRows(mockReminders)
			} catch (err) {
				if (!mounted) return
				console.error('[ReminderWindow] Load error:', err)
				setError('Failed to load reminders')
			} finally {
				if (mounted) setLoading(false)
			}
		}
		load()
		return () => { mounted = false }
	}, [proNo])

	const addRow = () => {
		setRows(prev => [...prev, { date: new Date().toISOString().split('T')[0], notes: '' }])
	}

	const removeRow = (index) => {
		if (rows.length <= 1) return
		setRows(prev => prev.filter((_, i) => i !== index))
	}

	const updateRow = (index, field, value) => {
		setRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
	}

	const handleSave = async () => {
		if (!proNo) return
		setError('')
		setSaving(true)
		try {
			// TODO: Implement actual save functionality when reminder service is created
			console.log('[ReminderWindow] Saving reminders:', rows)
			// For now, just simulate save
			await new Promise(resolve => setTimeout(resolve, 500))
			onSaved()
		} catch (err) {
			console.error('[ReminderWindow] Save error:', err)
			setError('Failed to save reminders')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<div className="remarks-window" style={{ backgroundColor: bgColor }}>
				<div className="remarks-header">
					<h3>{title}</h3>
				</div>
				<div className="remarks-body">
					<div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
						Loading reminders...
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="remarks-window" style={{ backgroundColor: bgColor }}>
			<div className="remarks-header">
				<h3>{title}</h3>
				<div className="remarks-actions">
					<button className="remarks-add-btn" onClick={addRow} disabled={saving}>
						<span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>+</span> Add Reminder
					</button>
					<button className="remarks-save-btn" onClick={handleSave} disabled={saving}>
						{saving ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
			<div className="remarks-body">
				{error && (
					<div style={{ color: '#dc2626', padding: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
						{error}
					</div>
				)}
				<div className="remarks-table">
					<div className="remarks-table-header">
						<div className="remarks-col-date">Date</div>
						<div className="remarks-col-notes">Reminder Notes</div>
						<div className="remarks-col-actions">Actions</div>
					</div>
					{rows.map((row, index) => (
						<div key={index} className="remarks-table-row">
							<div className="remarks-col-date">
								<input
									type="date"
									value={row.date}
									onChange={(e) => updateRow(index, 'date', e.target.value)}
									disabled={saving}
									style={{ width: '100%', padding: '0.25rem', border: '1px solid #ccc', borderRadius: '4px' }}
								/>
							</div>
							<div className="remarks-col-notes">
								<textarea
									value={row.notes}
									onChange={(e) => updateRow(index, 'notes', e.target.value)}
									disabled={saving}
									placeholder="Enter reminder notes..."
									rows={2}
									style={{ width: '100%', padding: '0.25rem', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical' }}
								/>
							</div>
							<div className="remarks-col-actions">
								<button
									onClick={() => removeRow(index)}
									disabled={saving || rows.length <= 1}
									style={{
										background: '#dc2626',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										padding: '0.25rem 0.5rem',
										cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
										opacity: rows.length <= 1 ? 0.5 : 1
									}}
								>
									Remove
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
