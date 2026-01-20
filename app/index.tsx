import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { supabase } from '@/lib/supabase'

export default function IndexScreen() {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      if (session?.user?.id) {
        // Check approval status
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', session.user.id)
          .single()
        
        // If profile doesn't exist or approval_status is missing, allow access
        // (This handles edge cases where SQL setup might be incomplete)
        if (error || !profile) {
          console.warn('Profile check failed, allowing access:', error)
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
        // Not logged in - redirect to login
        router.replace('/(auth)/login')
      }
    }

    checkAuthAndRedirect()
  }, [session, router])

  // Return null while redirecting
  return null
}

