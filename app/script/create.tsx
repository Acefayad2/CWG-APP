import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { useCreateScript } from '@/lib/queries/scripts'
import { scriptSchema, ScriptInput } from '@/utils/validation'

export default function CreateScriptScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('')
  const [errors, setErrors] = useState<Partial<ScriptInput>>({})
  const createScript = useCreateScript()

  const handleCreate = async () => {
    try {
      setErrors({})
      const validated = scriptSchema.parse({ title, body, category: category || undefined })
      
      await createScript.mutateAsync({
        ...validated,
        is_admin: false,
        created_by: session?.user?.id || null,
      })
      
      router.back()
    } catch (error: any) {
      if (error.errors) {
        const fieldErrors: Partial<ScriptInput> = {}
        error.errors.forEach((err: any) => {
          if (err.path) fieldErrors[err.path[0] as keyof ScriptInput] = err.message
        })
        setErrors(fieldErrors)
      } else {
        Alert.alert('Error', error.message || 'Failed to create script')
      }
    }
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-semibold">Title</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
            placeholder="Enter script title"
            value={title}
            onChangeText={setTitle}
          />
          {errors.title && <Text className="text-red-500 text-sm mt-1">{errors.title}</Text>}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-semibold">Body</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white h-40"
            placeholder="Enter script body"
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
          />
          {errors.body && <Text className="text-red-500 text-sm mt-1">{errors.body}</Text>}
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 mb-2 font-semibold">Category (optional)</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
            placeholder="e.g., Welcome, Follow-up"
            value={category}
            onChangeText={setCategory}
          />
        </View>

        <TouchableOpacity
          className="bg-blue-600 rounded-lg py-4"
          onPress={handleCreate}
          disabled={createScript.isPending}
        >
          {createScript.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold text-lg">Create Script</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
