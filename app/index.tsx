import { useEffect, useState, useCallback } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function IndexScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session, isLoading: sessionLoading } = useSession()
  const [isChecking, setIsChecking] = useState(true)

  const checkAuthAndRedirect = useCallback(async () => {
    setIsChecking(true)
    
    try {
      // Always check session directly from Supabase for security (bypasses cache)
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session check error:', error)
        // Clear everything and redirect to login
        queryClient.clear()
        queryClient.setQueryData(['session'], null)
        router.dismissAll()
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
        // Not logged in - clear all data and redirect to login
        // This ensures no cached session data remains
        queryClient.clear()
        queryClient.setQueryData(['session'], null)
        queryClient.setQueryData(['profile'], null)
        router.dismissAll()
        router.replace('/(auth)/login')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      // On error, clear everything and force login
      queryClient.clear()
      queryClient.setQueryData(['session'], null)
      router.dismissAll()
      router.replace('/(auth)/login')
    } finally {
      setIsChecking(false)
    }
  }, [router, queryClient])

  // Listen for auth state changes (sign out, token expiry, etc.)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession ? 'session exists' : 'no session')
      
      if (event === 'SIGNED_OUT' || !currentSession) {
        // User signed out or session expired - clear everything
        queryClient.clear()
        queryClient.setQueryData(['session'], null)
        queryClient.setQueryData(['profile'], null)
        
        // Redirect to login and prevent back navigation
        router.dismissAll()
        router.replace('/(auth)/login')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Session restored or refreshed - re-check auth
        checkAuthAndRedirect()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, queryClient, checkAuthAndRedirect])

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

