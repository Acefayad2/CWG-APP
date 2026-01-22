import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, BackHandler } from 'react-native'
import { Link, useRouter, useFocusEffect } from 'expo-router'
import { useSignIn, useSession } from '@/lib/queries/auth'
import { useQueryClient } from '@tanstack/react-query'
import { signInSchema, SignInInput } from '@/utils/validation'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Partial<SignInInput>>({})
  const [focused, setFocused] = useState<string | null>(null)
  const signIn = useSignIn()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  // Redirect if already logged in (only check once, not on every render)
  useEffect(() => {
    let isMounted = true
    
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!isMounted) return
      
      if (currentSession?.user?.id) {
        // Check approval status before redirecting
        const { data: profile } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', currentSession.user.id)
          .single()
        
        if (!isMounted) return
        
        if (profile?.approval_status === 'pending') {
          router.replace('/awaiting-approval')
        } else if (profile?.approval_status === 'approved') {
          router.replace('/(tabs)/scripts')
        } else {
          // Rejected or unknown - stay on login
          await supabase.auth.signOut()
          queryClient.clear()
        }
      }
    }
    
    // Small delay to prevent race condition with index.tsx redirect
    const timeoutId = setTimeout(() => {
      checkSession()
    }, 100)
    
    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [router, queryClient])

  // Prevent back button on login page (after logout)
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // If there's no session, prevent going back
        const checkSession = async () => {
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (!currentSession) {
            // No session - exit app instead of going back
            if (Platform.OS === 'android') {
              BackHandler.exitApp()
              return true
            }
          }
          return false
        }
        checkSession()
        return true // Prevent default back behavior
      }

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
      return () => subscription.remove()
    }, [])
  )

  const handleLogin = async () => {
    try {
      setErrors({})
      const validated = signInSchema.parse({ email, password })
      
      // Sign in
      const authData = await signIn.mutateAsync(validated)
      
      if (!authData.session || !authData.user?.id) {
        throw new Error('Login failed: No session created')
      }
      
      // Ensure session is set in cache immediately
      queryClient.setQueryData(['session'], authData.session)
      
      // Wait a moment for session to be fully established
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Verify session is still valid
      const { data: { session: verifySession } } = await supabase.auth.getSession()
      if (!verifySession) {
        throw new Error('Session verification failed. Please try again.')
      }
      
      // Get profile data to check approval status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('approval_status, role')
        .eq('id', authData.user.id)
        .single()
      
      
      if (profileError) {
        console.error('Profile fetch error:', profileError)
        // If profile doesn't exist, user needs to sign up
        Alert.alert(
          'Account Not Found',
          'No account found with this email. Please sign up first.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear session and redirect to signup
                supabase.auth.signOut()
                queryClient.clear()
                router.replace('/(auth)/signup')
              }
            }
          ]
        )
        return
      }
      
      if (!profile) {
        // Profile doesn't exist - redirect to signup
        Alert.alert(
          'Account Not Found',
          'Your account profile was not found. Please sign up again.',
          [
            {
              text: 'OK',
              onPress: () => {
                supabase.auth.signOut()
                queryClient.clear()
                router.replace('/(auth)/signup')
              }
            }
          ]
        )
        return
      }
      
      // Check approval status and redirect accordingly
      const approvalStatus = profile.approval_status
      
      if (approvalStatus === 'pending') {
        // User is pending approval - redirect to awaiting approval screen
        router.replace('/awaiting-approval')
      } else if (approvalStatus === 'approved') {
        // User is approved - navigate to app
        // Invalidate and refetch profile to ensure fresh data
        await queryClient.invalidateQueries({ queryKey: ['profile', authData.user.id] })
        await queryClient.refetchQueries({ queryKey: ['profile', authData.user.id] })
        router.replace('/(tabs)/scripts')
      } else if (approvalStatus === 'rejected') {
        // User was rejected - show message and sign out
        Alert.alert(
          'Account Rejected',
          'Your account has been rejected. Please contact an administrator if you believe this is an error.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await supabase.auth.signOut()
                queryClient.clear()
                router.replace('/(auth)/login')
              }
            }
          ]
        )
      } else {
        // Unknown status - default to approved
        router.replace('/(tabs)/scripts')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      
      if (error.errors) {
        const fieldErrors: Partial<SignInInput> = {}
        error.errors.forEach((err: any) => {
          if (err.path) fieldErrors[err.path[0] as keyof SignInInput] = err.message
        })
        setErrors(fieldErrors)
      } else {
        // Show user-friendly error messages
        let errorMessage = 'Failed to sign in'
        
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.'
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.'
        } else if (error.message) {
          errorMessage = error.message
        }
        
        Alert.alert('Sign In Error', errorMessage)
      }
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue to CWG APP</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.label}>Email</Text>
            <TextInput
              style={[
                CommonStyles.input,
                focused === 'email' && CommonStyles.inputFocused,
                errors.email && CommonStyles.inputError
              ]}
              placeholder="Enter your email"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
            {errors.email && <Text style={CommonStyles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.label}>Password</Text>
            <TextInput
              style={[
                CommonStyles.input,
                focused === 'password' && CommonStyles.inputFocused,
                errors.password && CommonStyles.inputError
              ]}
              placeholder="Enter your password"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.password && <Text style={CommonStyles.errorText}>{errors.password}</Text>}
          </View>

          <TouchableOpacity
            style={[
              CommonStyles.button,
              CommonStyles.buttonPrimary,
              signIn.isPending && CommonStyles.buttonDisabled
            ]}
            onPress={handleLogin}
            disabled={signIn.isPending}
            activeOpacity={0.8}
          >
            {signIn.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={CommonStyles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
})
