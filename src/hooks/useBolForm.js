import React from 'react'

// Custom hook for auto-deriving place of delivery from consignee
// Returns: { values, onChange, userEditedPlace }
export const useBolForm = (initialValues = {}) => {
  const [values, setValues] = React.useState(initialValues)
  const [userEditedPlace, setUserEditedPlace] = React.useState(false)

  // Auto-derive function
  const derivePlace = (text) => {
    if (!text) return ''
    const t = String(text).toUpperCase()
    if (t.includes('SUBIC')) return 'SUBIC'
    if (t.includes('CLARK')) return 'CLARK'
    return t.trim() ? 'MANILA' : ''
  }

  // Auto-derive place of delivery when consignee changes (including programmatic changes)
  React.useEffect(() => {
    if (!userEditedPlace && values.consignee) {
      const pod = derivePlace(values.consignee)
      if (pod && values.place_of_delivery !== pod) {
        setValues(prev => ({ ...prev, place_of_delivery: pod }))
      }
    }
  }, [values.consignee, userEditedPlace, values.place_of_delivery])

  // onChange handler
  const onChange = (key, val) => {
    setValues(prev => {
      const next = { ...prev, [key]: val }
      if (key === 'place_of_delivery') setUserEditedPlace(true)
      return next
    })
  }

  return {
    values,
    onChange,
    userEditedPlace,
    setValues
  }
}

// Hook for container/seal pairs management
export const useContainerPairs = (initialPairs = []) => {
  const [pairs, setPairs] = React.useState(() => {
    if (Array.isArray(initialPairs) && initialPairs.length) {
      return initialPairs.map(p => ({ 
        left: p.left || p.containerNo || '', 
        right: p.right || p.sealNo || '' 
      }))
    }
    return [{ left: '', right: '' }]
  })

  const addPair = () => setPairs(prev => [...prev, { left: '', right: '' }])
  
  const removePair = (idx) => setPairs(prev => 
    prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)
  )
  
  const changePair = (idx, field, val) => setPairs(prev => 
    prev.map((p, i) => i === idx ? { ...p, [field]: val } : p)
  )

  return {
    pairs,
    addPair,
    removePair,
    changePair,
    setPairs
  }
}
