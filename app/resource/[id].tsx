import { useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { useResource, useToggleResourceFavorite } from '@/lib/queries/resources'

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: session, isLoading: sessionLoading } = useSession()
  const { data: resource, isLoading } = useResource(id, session?.user?.id)
  const toggleFavorite = useToggleResourceFavorite()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.user?.id) {
      router.replace('/(auth)/login')
    }
  }, [session, sessionLoading, router])

  const handleFavorite = async () => {
    if (!session?.user?.id || !resource) return
    try {
      await toggleFavorite.mutateAsync({
        resourceId: resource.id,
        userId: session.user.id,
        isFavorite: resource.is_favorite || false,
      })
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const handleView = async () => {
    if (resource?.url) {
      const canOpen = await Linking.canOpenURL(resource.url)
      if (canOpen) {
        await Linking.openURL(resource.url)
      } else {
        Alert.alert('Error', 'Cannot open this resource')
      }
    }
  }

  // Show loading while checking authentication
  if (sessionLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  // Redirect if not authenticated (handled by useEffect, but show loading during redirect)
  if (!session?.user?.id) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (!resource) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500">Resource not found</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">{resource.title}</Text>
        <Text className="text-gray-500 mb-4 capitalize">Type: {resource.type}</Text>

        <View className="flex-row gap-3 mb-4">
          {resource.url && (
            <TouchableOpacity
              className="flex-1 bg-blue-600 rounded-lg py-3"
              onPress={handleView}
            >
              <Text className="text-white text-center font-semibold">View Resource</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="bg-gray-200 rounded-lg py-3 px-4"
            onPress={handleFavorite}
          >
            <Text className="text-gray-700 font-semibold text-lg">
              {resource.is_favorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}
