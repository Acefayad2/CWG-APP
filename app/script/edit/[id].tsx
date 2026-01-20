import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSession, useProfile } from '@/lib/queries/auth'
import { useScript, useUpdateScript } from '@/lib/queries/scripts'
import { scriptSchema, ScriptInput } from '@/utils/validation'
import { Colors } from '@/constants/Colors'

export default function EditScriptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const { data: profile } = useProfile(session?.user?.id)
  const { data: script, isLoading } = useScript(id, session?.user?.id)
  const updateScript = useUpdateScript()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('')
  const [isAdminScript, setIsAdminScript] = useState(false)
  const [errors, setErrors] = useState<Partial<ScriptInput>>({})
  
  const isAdmin = profile?.role === 'admin'
  const canEditAdmin = isAdmin && script?.is_admin

  useEffect(() => {
    if (script) {
      setTitle(script.title)
      setBody(script.body)
      setCategory(script.category || '')
      setIsAdminScript(script.is_admin || false)
    }
  }, [script])

  const handleUpdate = async () => {
    try {
      setErrors({})
      const validated = scriptSchema.parse({ title, body, category: category || undefined })
      
      const updates: any = {
        ...validated,
      }
      
      // Only allow admins to change is_admin status
      if (isAdmin) {
        updates.is_admin = isAdminScript
      }
      
      await updateScript.mutateAsync({
        id: id!,
        updates,
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
        Alert.alert('Error', error.message || 'Failed to update script')
      }
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
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

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-semibold">Category (optional)</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
            placeholder="e.g., Welcome, Follow-up"
            value={category}
            onChangeText={setCategory}
          />
        </View>

        {isAdmin && (
          <View className="mb-6 bg-gray-50 rounded-lg p-4">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 mr-4">
                <Text className="text-gray-700 mb-1 font-semibold">Make Universal (Visible to All Users)</Text>
                <Text className="text-gray-500 text-sm">
                  When enabled, this script will be visible to all users as a template. When disabled, only you can see it.
                </Text>
              </View>
              <Switch
                value={isAdminScript}
                onValueChange={setIsAdminScript}
                trackColor={{ false: '#d1d5db', true: Colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          className="bg-blue-600 rounded-lg py-4"
          onPress={handleUpdate}
          disabled={updateScript.isPending}
        >
          {updateScript.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold text-lg">Update Script</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
