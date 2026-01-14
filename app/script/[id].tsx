import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { useScript, useDeleteScript, useToggleScriptFavorite } from '@/lib/queries/scripts'

export default function ScriptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const { data: script, isLoading } = useScript(id, session?.user?.id)
  const deleteScript = useDeleteScript()
  const toggleFavorite = useToggleScriptFavorite()

  const handleDelete = () => {
    Alert.alert(
      'Delete Script',
      'Are you sure you want to delete this script?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScript.mutateAsync(id)
              router.back()
            } catch (error: any) {
              Alert.alert('Error', error.message)
            }
          },
        },
      ]
    )
  }

  const handleFavorite = async () => {
    if (!session?.user?.id || !script) return
    try {
      await toggleFavorite.mutateAsync({
        scriptId: script.id,
        userId: session.user.id,
        isFavorite: script.is_favorite || false,
      })
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const handleSend = () => {
    router.push(`/contacts?scriptId=${id}`)
  }

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (!script) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500">Script not found</Text>
      </View>
    )
  }

  // Users can only edit/delete their own scripts, not admin scripts
  const canEdit = script.created_by === session?.user?.id && !script.is_admin

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 mb-2">{script.title}</Text>
            {script.category && (
              <Text className="text-gray-500">Category: {script.category}</Text>
            )}
            {script.is_admin && (
              <View className="bg-blue-100 px-2 py-1 rounded self-start mt-2">
                <Text className="text-blue-700 text-xs font-semibold">Admin Script</Text>
              </View>
            )}
          </View>
        </View>

        <View className="bg-gray-50 rounded-lg p-4 mb-4">
          <Text className="text-gray-900 text-base leading-6">{script.body}</Text>
        </View>

        {script.tags && script.tags.length > 0 && (
          <View className="flex-row flex-wrap mb-4">
            {script.tags.map((tag, index) => (
              <View key={index} className="bg-gray-200 px-3 py-1 rounded-full mr-2 mb-2">
                <Text className="text-gray-700 text-sm">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            className="flex-1 bg-blue-600 rounded-lg py-3"
            onPress={handleSend}
          >
            <Text className="text-white text-center font-semibold">Send Script</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-gray-200 rounded-lg py-3 px-4"
            onPress={handleFavorite}
          >
            <Text className="text-gray-700 font-semibold">
              {script.is_favorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>

        {canEdit && (
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-gray-600 rounded-lg py-3"
              onPress={() => router.push(`/script/edit/${script.id}`)}
            >
              <Text className="text-white text-center font-semibold">Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-red-600 rounded-lg py-3"
              onPress={handleDelete}
            >
              <Text className="text-white text-center font-semibold">Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
