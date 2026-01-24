import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useSignUp } from '@/lib/queries/auth'
import { signUpSchema, SignUpInput } from '@/utils/validation'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'
import { supabase } from '@/lib/supabase'

export default function SignUpScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [errors, setErrors] = useState<Partial<SignUpInput>>({})
  const [focused, setFocused] = useState<string | null>(null)
  const signUp = useSignUp()
  const router = useRouter()

  const handleSignUp = async () => {
    try {
      setErrors({})
      const validated = signUpSchema.parse({ email, password, fullName })
      const authData = await signUp.mutateAsync(validated)
      
      if (!authData.user?.id) {
        throw new Error('User creation failed - no user ID returned')
      }
      
      // Wait for the database trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Verify session exists
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) {
        console.warn('No session after signup, but user was created')
        // Session might not be set if email confirmation is required
        // In that case, show a message
        Alert.alert(
          'Account Created',
          'Your account has been created! Please check your email to confirm your account, then you can sign in.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login')
            }
          ]
        )
        return
      }
      
      // Retry fetching profile a few times in case trigger is slow
      let profile = null
      let profileError = null
      let retries = 3
      
      while (retries > 0 && !profile) {
        try {
          const result = await supabase
            .from('profiles')
            .select('approval_status, full_name')
            .eq('id', authData.user.id)
            .single()
          
          profile = result.data
          profileError = result.error
          
          if (profile) {
            break
          }
          
          // Only retry if it's a "not found" error, not other errors
          if (profileError && profileError.code !== 'PGRST116') {
            // Not a "not found" error - don't retry
            break
          }
          
          // Wait before retrying (only if we have retries left)
          if (retries > 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } catch (err) {
          console.error('Error fetching profile:', err)
          profileError = err as any
          break
        }
        
        retries--
      }
      
      if (profileError || !profile) {
        console.error('Profile fetch error after retries:', profileError)
        // Profile might not exist yet - redirect to awaiting approval as fallback
        // User can log back in later and it should work
        Alert.alert(
          'Account Created',
          'Your account is being set up. Please sign in to continue.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login')
            }
          ]
        )
        return
      }
      
      // Log for debugging
      console.log('Profile created:', { 
        full_name: profile.full_name, 
        approval_status: profile.approval_status 
      })
      
      // Redirect based on approval status
      const approvalStatus = profile.approval_status
      
      if (approvalStatus === 'pending') {
        router.replace('/awaiting-approval')
      } else if (approvalStatus === 'approved') {
        router.replace('/(tabs)/scripts')
      } else {
        // Rejected or unknown - redirect to login
        router.replace('/(auth)/login')
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      
      if (error.errors) {
        const fieldErrors: Partial<SignUpInput> = {}
        error.errors.forEach((err: any) => {
          if (err.path) fieldErrors[err.path[0] as keyof SignUpInput] = err.message
        })
        setErrors(fieldErrors)
      } else {
        let errorMessage = 'Failed to sign up'
        
        if (error.message?.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.'
        } else if (error.message) {
          errorMessage = error.message
        }
        
        Alert.alert('Sign Up Error', errorMessage)
      }
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back to Sign In</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started with CWG APP</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={CommonStyles.label}>Full Name</Text>
              <TextInput
                style={[
                  CommonStyles.input,
                  focused === 'fullName' && CommonStyles.inputFocused,
                  errors.fullName && CommonStyles.inputError
                ]}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textLight}
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setFocused('fullName')}
                onBlur={() => setFocused(null)}
                autoCapitalize="words"
              />
              {errors.fullName && <Text style={CommonStyles.errorText}>{errors.fullName}</Text>}
            </View>

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
                signUp.isPending && CommonStyles.buttonDisabled
              ]}
              onPress={handleSignUp}
              disabled={signUp.isPending}
              activeOpacity={0.8}
            >
              {signUp.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={CommonStyles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
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
