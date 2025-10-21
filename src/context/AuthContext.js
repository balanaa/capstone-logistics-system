import React from 'react'
import { supabase } from '../services/supabase/client'

const AuthContext = React.createContext({
  user: null,
  profile: null,
  roles: [],
  loading: true,
  authReady: false,
  signIn: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  getLandingPath: () => '/dashboard'
})

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null)
  const [profile, setProfile] = React.useState(null)
  const [roles, setRoles] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [authReady, setAuthReady] = React.useState(false)

  const getLandingPath = React.useCallback((userRoles) => {
    const r = userRoles || roles || []
    if (r.includes('admin') || r.includes('viewer')) return '/dashboard'
    if (r.includes('verifier')) return '/verifier'
    if (r.includes('shipment')) return '/shipment'
    if (r.includes('finance')) return '/finance'
    if (r.includes('trucking')) return '/trucking'
    // fallback
    return '/dashboard'
  }, [roles])

  const loadProfile = React.useCallback(async (u) => {
    if (!u) {
      setProfile(null)
      setRoles([])
      return []
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,roles,full_name')
      .eq('id', u.id)
      .single()
    if (!error && data) {
      setProfile(data)
      setRoles(Array.isArray(data.roles) ? data.roles : [])
      try {
        localStorage.setItem(`roles:${u.id}`, JSON.stringify(Array.isArray(data.roles) ? data.roles : []))
      } catch (_e) {}
      return Array.isArray(data.roles) ? data.roles : []
    } else {
      setProfile(null)
      setRoles([])
      return []
    }
  }, [])

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        
        // Watchdog: ensure we never hang forever on getSession
        const watchdog = setTimeout(() => {
          if (mounted) {
            setLoading(false)
          }
        }, 1500)
        const { data: sessionData } = await supabase.auth.getSession()
        if (!mounted) return
        const currentUser = sessionData?.session?.user || null
        setUser(currentUser)
        
        if (currentUser) {
          try {
            const cached = JSON.parse(localStorage.getItem(`roles:${currentUser.id}`) || '[]')
            if (Array.isArray(cached) && cached.length) {
              setRoles(cached)
              
            }
          } catch (_e) {}
        }
        // Do not block readiness on profile fetch to avoid spinner deadlocks
        if (mounted) {
          setAuthReady(true)
          setLoading(false)
        }
        // Fire-and-forget profile refresh
        loadProfile(currentUser)
        clearTimeout(watchdog)
      } catch (_e) {
        // ensure UI unblocks even if session/profile fetch fails
        setUser(null)
        if (process.env.NODE_ENV !== 'production') console.warn('[Auth] init error, proceeding unauthenticated')
      } finally {
        
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user || null
      setUser(u)
      
      // prime roles from cache quickly
      if (u) {
        try {
          const cached = JSON.parse(localStorage.getItem(`roles:${u.id}`) || '[]')
          if (Array.isArray(cached) && cached.length) setRoles(cached)
        } catch (_e) {}
      } else {
        setRoles([])
        setProfile(null)
      }
      // Mark ready immediately; refresh profile in background
      setAuthReady(true)
      setLoading(false)
       loadProfile(u)
    })
    return () => {
      mounted = false
      sub?.subscription?.unsubscribe()
    }
  }, [loadProfile])

  const signIn = React.useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    const u = data.user
    setUser(u)
    const userRoles = await loadProfile(u)
    const landingPath = getLandingPath(userRoles)
    return { error: null, landingPath }
  }, [loadProfile])

  const signOut = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
      setRoles([])
    }
    return { error }
  }, [])

  const value = React.useMemo(() => ({ user, profile, roles, loading, authReady, signIn, signOut, getLandingPath }), [user, profile, roles, loading, authReady, signIn, signOut, getLandingPath])

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return React.useContext(AuthContext)
}


