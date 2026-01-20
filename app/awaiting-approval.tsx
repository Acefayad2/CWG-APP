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
      // Sign out from Supabase directly
      await supabase.auth.signOut()
      // Clear all cached queries to ensure fresh state
      queryClient.clear()
      // Invalidate session query to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['session'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      // Navigate immediately after sign out
      router.replace('/(auth)/login')
    } catch (error) {
      console.error('Sign out error:', error)
      // Clear queries even on error
      queryClient.clear()
      // Navigate anyway - session check will handle it
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
