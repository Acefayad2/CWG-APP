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
      
      // Check approval status after signup
      if (authData.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', authData.user.id)
          .single()
        
        if (!profileError && profile) {
          const approvalStatus = (profile as any).approval_status
          if (approvalStatus === 'pending') {
            router.replace('/awaiting-approval')
            return
          }
        }
      }
      
      router.replace('/(tabs)/scripts')
    } catch (error: any) {
      if (error.errors) {
        const fieldErrors: Partial<SignUpInput> = {}
        error.errors.forEach((err: any) => {
          if (err.path) fieldErrors[err.path[0] as keyof SignUpInput] = err.message
        })
        setErrors(fieldErrors)
      } else {
        Alert.alert('Error', error.message || 'Failed to sign up')
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
