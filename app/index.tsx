import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function IndexScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    // Always redirect to login first - this ensures login is the first screen users see
    // The login screen will check if user is already logged in and redirect accordingly
    router.replace('/(auth)/login')
    
    // Clean up any stale session data on app start
    queryClient.setQueryData(['session'], null)
    queryClient.setQueryData(['profile'], null)
  }, [router, queryClient])

  // Return null - we're immediately redirecting
  return null
}

