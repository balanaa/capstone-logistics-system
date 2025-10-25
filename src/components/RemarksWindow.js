import React from 'react'
import './RemarksWindow.css'
import { fetchShipmentRemarks, saveShipmentRemarks } from '../services/supabase/shipmentRemarks'
import { supabase } from '../services/supabase/client'

export default function RemarksWindow({ title = 'Remarks', bgColor = '#D8F4FF', proNo, onSaved = () => {} }) {
	const formatToday = () => {
		const d = new Date()
		const mm = String(d.getMonth() + 1).padStart(2, '0')
		const dd = String(d.getDate()).padStart(2, '0')
		const yy = String(d.getFullYear()).slice(-2)
		return `${mm}/${dd}/${yy}`
	}

	const [rows, setRows] = React.useState(() => [{ date: new Date().toISOString().split('T')[0], notes: '' }])
	const [originalIds, setOriginalIds] = React.useState([])
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
				const list = await fetchShipmentRemarks(proNo)
				if (!mounted) return
				setRows(list.length ? list : [{ date: new Date().toISOString().split('T')[0], notes: '' }])
				setOriginalIds(list.filter(r => r.id).map(r => r.id))
			} catch (e) {
				if (!mounted) return
				setError(e?.message || 'Failed to load remarks')
			} finally {
				if (mounted) setLoading(false)
			}
		}
		load()
		return () => { mounted = false }
	}, [proNo])

	const handleChange = (idx, field, value) => {
		setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
	}

	const addRow = () => {
		setRows(prev => [...prev, { date: new Date().toISOString().split('T')[0], notes: '' }])
	}

	const removeRow = (idx) => {
		if (rows.length <= 1) return
		setRows(prev => prev.filter((_, i) => i !== idx))
	}

	const onSave = async () => {
		if (!proNo) return
		setError('')
		setSaving(true)
		try {
			const { data: sess } = await supabase.auth.getSession()
			const userId = sess?.session?.user?.id
			const saved = await saveShipmentRemarks(proNo, rows, originalIds, userId)
			setRows(saved.length ? saved : [{ date: new Date().toISOString().split('T')[0], notes: '' }])
			setOriginalIds(saved.filter(r => r.id).map(r => r.id))
			onSaved()
		} catch (e) {
			setError(e?.message || 'Failed to save remarks')
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="document-container" style={{ backgroundColor: bgColor }}>
			<h3 className="document-name">{title}</h3>
			<div className="remarks-table">
				<div className="remarks-header">
					<div className="remarks-col">Date</div>
					<div className="remarks-col">Notes</div>
					<div className="remarks-col actions"></div>
				</div>
				<div className="remarks-body">
					{rows.map((row, idx) => (
						<div key={idx} className="remarks-row">
							<input
								type="date"
								value={row.date}
								onChange={(e) => handleChange(idx, 'date', e.target.value)}
								className="remarks-date-input"
							/>
							<textarea
								value={row.notes}
								onChange={(e) => handleChange(idx, 'notes', e.target.value)}
								rows={2}
								className="remarks-notes-input"
								placeholder="Enter notes..."
							/>
							<button
								type="button"
								onClick={() => removeRow(idx)}
								disabled={rows.length <= 1}
								className="remarks-delete-btn"
								title="Remove row"
							>
								<i className="fi fi-rs-trash"></i>
							</button>
						</div>
					))}
				</div>
			</div>
			<div className="remarks-add-container">
				<button type="button" className="remarks-add-btn" onClick={addRow}>+ Add Row</button>
			</div>
			<div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
				<button type="button" className="remarks-add-btn" onClick={onSave} disabled={!proNo || saving || loading}>
					{saving ? 'Saving…' : 'Save Remarks'}
				</button>
			</div>
			{error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
			{loading && <div style={{ color: '#666', marginTop: 8 }}>Loading…</div>}
		</div>
	)
}


