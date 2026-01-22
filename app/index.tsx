import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function IndexScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    // Always redirect to login first - this ensures login is the first screen users see
    // The login screen will check if user is already logged in and redirect accordingly
    
    const redirectToLogin = () => {
      // Clear any stale session data first
      queryClient.setQueryData(['session'], null)
      queryClient.setQueryData(['profile'], null)
      
      // Use requestAnimationFrame to ensure router is ready
      requestAnimationFrame(() => {
        router.replace('/(auth)/login')
      })
    }
    
    redirectToLogin()
  }, [router, queryClient])

  // Return loading state during redirect
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  )
}

