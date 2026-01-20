import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSignOut } from '@/lib/queries/auth'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'

export default function AwaitingApprovalScreen() {
  const router = useRouter()
  const signOut = useSignOut()

  const handleSignOut = () => {
    // Sign out and navigate - handle both success and error cases
    signOut.mutate(undefined, {
      onSuccess: () => {
        router.replace('/(auth)/login')
      },
      onError: () => {
        // Even if sign out fails, navigate to login
        // The session will be cleared on the next check
        router.replace('/(auth)/login')
      },
    })
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
          disabled={signOut.isPending}
          activeOpacity={0.8}
        >
          {signOut.isPending ? (
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
