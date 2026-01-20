import { useEffect, useState, useCallback } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

export default function IndexScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session, isLoading: sessionLoading } = useSession()
  const [isChecking, setIsChecking] = useState(true)
  const [hasRedirected, setHasRedirected] = useState(false)

  const checkAuthAndRedirect = useCallback(async () => {
    // Prevent multiple redirects
    if (hasRedirected) return
    
    setIsChecking(true)
    
    try {
      // Always check session directly from Supabase for security (bypasses cache)
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      
      if (error || !currentSession?.user?.id) {
        // No session or error - immediately redirect to login
        console.log('No session found, redirecting to login')
        queryClient.clear()
        queryClient.setQueryData(['session'], null)
        queryClient.setQueryData(['profile'], null)
        
        // Use replace to prevent back navigation
        setHasRedirected(true)
        router.replace('/(auth)/login')
        return
      }
      
      // User is authenticated - check approval status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('approval_status')
        .eq('id', currentSession.user.id)
        .single()
      
      // If profile doesn't exist, redirect to login (user needs to sign up)
      if (profileError || !profile) {
        console.warn('Profile not found, redirecting to login:', profileError)
        queryClient.clear()
        queryClient.setQueryData(['session'], null)
        setHasRedirected(true)
        router.replace('/(auth)/login')
        return
      }
      
      // Redirect based on approval status
      setHasRedirected(true)
      if (profile.approval_status === 'pending') {
        router.replace('/awaiting-approval')
      } else if (profile.approval_status === 'approved') {
        router.replace('/(tabs)/scripts')
      } else {
        // Rejected users should be redirected to login
        queryClient.clear()
        router.replace('/(auth)/login')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      // On error, clear everything and force login
      queryClient.clear()
      queryClient.setQueryData(['session'], null)
      setHasRedirected(true)
      router.replace('/(auth)/login')
    } finally {
      setIsChecking(false)
    }
  }, [router, queryClient, hasRedirected])

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

  // Check auth immediately on mount (don't wait for sessionLoading)
  useEffect(() => {
    // Small delay to ensure router is ready
    const timer = setTimeout(() => {
      checkAuthAndRedirect()
    }, 100)
    
    return () => clearTimeout(timer)
  }, []) // Empty deps - only run once on mount

  // Also check when session changes (if user signs in/out)
  useEffect(() => {
    if (!sessionLoading && !hasRedirected) {
      checkAuthAndRedirect()
    }
  }, [session, sessionLoading, hasRedirected, checkAuthAndRedirect])

  // Also check when screen comes into focus (prevents back button bypass)
  useFocusEffect(
    useCallback(() => {
      if (!hasRedirected) {
        checkAuthAndRedirect()
      }
    }, [checkAuthAndRedirect, hasRedirected])
  )

  // Show loading screen while checking (prevents hollow/blank state)
  if (isChecking || !hasRedirected) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  // Return null while redirecting
  return null
}

