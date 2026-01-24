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
      
      console.log('Starting login process...')
      
      // Sign in
      const authData = await signIn.mutateAsync(validated)
      
      if (!authData.session || !authData.user?.id) {
        throw new Error('Login failed: No session created')
      }
      
      console.log('Sign in successful, user ID:', authData.user.id)
      
      // Ensure session is set in cache immediately
      queryClient.setQueryData(['session'], authData.session)
      
      // Get profile data to check approval status
      // IMPORTANT: We only check approval_status, NOT role. All users (admin or regular) 
      // can log in if their approval_status is 'approved'
      console.log('Fetching profile...')
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('approval_status, role')
        .eq('id', authData.user.id)
        .single()
      
      console.log('Profile fetch result:', { 
        hasProfile: !!profile, 
        approvalStatus: profile?.approval_status, 
        role: profile?.role,
        error: profileError 
      })
      
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
      // NOTE: We do NOT check role here - all users (admin or regular) can log in if approved
      const approvalStatus = profile.approval_status
      
      console.log('Checking approval status:', approvalStatus, 'Role:', profile.role)
      
      // Invalidate profile cache (but don't wait for refetch - it can hang)
      queryClient.invalidateQueries({ queryKey: ['profile', authData.user.id] })
      
      if (approvalStatus === 'pending') {
        // User is pending approval - redirect to awaiting approval screen
        console.log('User is pending approval, redirecting to awaiting-approval')
        router.replace('/awaiting-approval')
      } else if (approvalStatus === 'approved') {
        // User is approved - navigate to app (works for both admin and regular users)
        console.log('User is approved, redirecting to scripts page. Role:', profile.role)
        // Navigate immediately - don't wait for refetch
        router.replace('/(tabs)/scripts')
      } else if (approvalStatus === 'rejected') {
        // User was rejected - show message and sign out
        console.log('User is rejected, showing error message')
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
        // Unknown status - default to approved (fallback for safety)
        console.log('Unknown approval status, defaulting to approved. Status was:', approvalStatus)
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
        // Show user-friendly error messages with specific password/email feedback
        let errorMessage = 'Failed to sign in'
        let errorTitle = 'Sign In Error'
        
        // Check error code and message for more specific feedback
        const errorCode = error.code || error.status
        const errorMsg = error.message || ''
        
        if (errorCode === 'invalid_credentials' || 
            errorMsg.includes('Invalid login credentials') ||
            errorMsg.includes('Invalid email or password') ||
            errorMsg.toLowerCase().includes('invalid credentials')) {
          errorTitle = 'Invalid Credentials'
          errorMessage = 'The email or password you entered is incorrect. Please check your credentials and try again.'
        } else if (errorCode === 'email_not_confirmed' || 
                   errorMsg.includes('Email not confirmed')) {
          errorTitle = 'Email Not Confirmed'
          errorMessage = 'Please check your email and confirm your account before signing in.'
        } else if (errorCode === 'too_many_requests' || 
                   errorMsg.includes('too many requests')) {
          errorTitle = 'Too Many Attempts'
          errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.'
        } else if (errorMsg) {
          errorMessage = errorMsg
        }
        
        Alert.alert(errorTitle, errorMessage)
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
