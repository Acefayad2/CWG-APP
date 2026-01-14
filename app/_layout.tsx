import { Stack } from 'expo-router'
import { QueryProvider } from '@/lib/react-query'
// Temporarily disabled CSS import for web compatibility
// import '../global.css'

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthLayout />
    </QueryProvider>
  )
}

function AuthLayout() {
  // Dashboard is now the default - auth routes are hidden
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="script/[id]" options={{ headerShown: true, title: 'Script Details' }} />
      <Stack.Screen name="script/create" options={{ headerShown: true, title: 'Create Script' }} />
      <Stack.Screen name="script/edit/[id]" options={{ headerShown: true, title: 'Edit Script' }} />
      <Stack.Screen name="resource/[id]" options={{ headerShown: true, title: 'Resource Details' }} />
      <Stack.Screen name="contacts" options={{ headerShown: true, title: 'Select Contacts' }} />
      <Stack.Screen name="send-preview" options={{ headerShown: true, title: 'Preview & Send' }} />
      <Stack.Screen name="admin/scripts" options={{ headerShown: true, title: 'Manage Scripts' }} />
      <Stack.Screen name="admin/resources" options={{ headerShown: true, title: 'Upload Resources' }} />
      <Stack.Screen name="admin/approvals" options={{ headerShown: true, title: 'User Approvals' }} />
      <Stack.Screen name="awaiting-approval" options={{ headerShown: false }} />
    </Stack>
  )
}
