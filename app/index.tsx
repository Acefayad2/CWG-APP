import { useEffect, useState } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { supabase } from '@/lib/supabase'
import { useCallback } from 'react'

export default function IndexScreen() {
  const router = useRouter()
  const { data: session, isLoading: sessionLoading } = useSession()
  const [isChecking, setIsChecking] = useState(true)

  const checkAuthAndRedirect = useCallback(async () => {
    setIsChecking(true)
    
    try {
      // Always check session directly from Supabase for security
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session check error:', error)
        router.replace('/(auth)/login')
        return
      }
      
      if (currentSession?.user?.id) {
        // User is authenticated - check approval status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', currentSession.user.id)
          .single()
        
        // If profile doesn't exist or approval_status is missing, allow access
        // (This handles edge cases where SQL setup might be incomplete)
        if (profileError || !profile) {
          console.warn('Profile check failed, allowing access:', profileError)
          router.replace('/(tabs)/scripts')
          return
        }
        
        // Redirect to awaiting approval if status is pending
        if (profile.approval_status === 'pending') {
          router.replace('/awaiting-approval')
        } else {
          router.replace('/(tabs)/scripts')
        }
      } else {
        // Not logged in - redirect to login and clear any navigation history
        router.dismissAll()
        router.replace('/(auth)/login')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.dismissAll()
      router.replace('/(auth)/login')
    } finally {
      setIsChecking(false)
    }
  }, [router])

  // Check auth on mount and when session changes
  useEffect(() => {
    if (!sessionLoading) {
      checkAuthAndRedirect()
    }
  }, [session, sessionLoading, checkAuthAndRedirect])

  // Also check when screen comes into focus (prevents back button bypass)
  useFocusEffect(
    useCallback(() => {
      checkAuthAndRedirect()
    }, [checkAuthAndRedirect])
  )

  // Return null while checking or redirecting
  return null
}

