import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'

export default function AwaitingApprovalScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      // Step 1: Sign out from Supabase (this clears AsyncStorage session)
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) {
        console.error('Sign out error:', signOutError)
        throw signOutError
      }
      
      // Step 2: Clear all cached queries immediately
      queryClient.clear()
      
      // Step 3: Force set session to null
      queryClient.setQueryData(['session'], null)
      queryClient.setQueryData(['profile'], null)
      
      // Step 4: Invalidate all auth-related queries
      queryClient.invalidateQueries({ queryKey: ['session'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      // Step 5: Wait briefly to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Step 6: Navigate to login and reset navigation stack
      router.dismissAll()
      router.replace('/(auth)/login')
      
      // Step 7: Verify session is cleared
      const { data: { session: verifySession } } = await supabase.auth.getSession()
      if (verifySession) {
        await supabase.auth.signOut()
        queryClient.setQueryData(['session'], null)
      }
      
    } catch (error) {
      console.error('Sign out error:', error)
      // Even on error, clear everything and navigate
      queryClient.clear()
      queryClient.setQueryData(['session'], null)
      router.dismissAll()
      router.replace('/(auth)/login')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⏳</Text>
        </View>
        
        <Text style={styles.title}>Awaiting Approval</Text>
        <Text style={styles.subtitle}>
          Your account has been created and is awaiting admin approval.
        </Text>
        <Text style={styles.description}>
          You will be able to access the application once an administrator has reviewed and approved your account.
        </Text>

        <TouchableOpacity
          style={[CommonStyles.button, CommonStyles.buttonOutline, styles.signOutButton]}
          onPress={handleSignOut}
          disabled={isSigningOut}
          activeOpacity={0.8}
        >
          {isSigningOut ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={CommonStyles.buttonTextOutline}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: 32,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  signOutButton: {
    width: '100%',
    marginTop: 16,
  },
})
