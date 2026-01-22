import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, Platform, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { useSession } from '@/lib/queries/auth'
import { useCreateResource } from '@/lib/queries/resources'

export default function AdminResourcesScreen() {
  const router = useRouter()
  const { data: session, isLoading: sessionLoading } = useSession()
  const createResource = useCreateResource()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.user?.id) {
      router.replace('/(auth)/login')
    }
  }, [session, sessionLoading, router])
  const [uploading, setUploading] = useState(false)
  const [showTitleModal, setShowTitleModal] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [pendingUpload, setPendingUpload] = useState<{ uri: string; type: 'image' | 'video' | 'pdf'; fileName: string } | null>(null)

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Media library permission is required')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    })

    if (!result.canceled && result.assets[0]) {
      setPendingUpload({ uri: result.assets[0].uri, type: 'image', fileName: result.assets[0].fileName || 'image.jpg' })
      setShowTitleModal(true)
    }
  }

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Media library permission is required')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    })

    if (!result.canceled && result.assets[0]) {
      setPendingUpload({ uri: result.assets[0].uri, type: 'video', fileName: result.assets[0].fileName || 'video.mp4' })
      setShowTitleModal(true)
    }
  }

  const pickPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    })

    if (!result.canceled && result.assets[0]) {
      setPendingUpload({ uri: result.assets[0].uri, type: 'pdf', fileName: result.assets[0].name })
      setShowTitleModal(true)
    }
  }

  const handleUpload = async () => {
    if (!titleInput.trim() || !pendingUpload || !session?.user?.id) {
      Alert.alert('Error', 'Please enter a title')
      return
    }

    setUploading(true)
    setShowTitleModal(false)
    try {
      const mimeType = 
        pendingUpload.type === 'image' ? 'image/jpeg' :
        pendingUpload.type === 'video' ? 'video/mp4' : 'application/pdf'

      await createResource.mutateAsync({
        resource: {
          title: titleInput.trim(),
          type: pendingUpload.type,
          created_by: session.user.id,
        },
        file: {
          uri: pendingUpload.uri,
          type: mimeType,
          name: pendingUpload.fileName,
        },
      })

      Alert.alert('Success', 'Resource uploaded successfully')
      setTitleInput('')
      setPendingUpload(null)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload resource')
    } finally {
      setUploading(false)
    }
  }

  // Show loading while checking authentication
  if (sessionLoading) {
    return (
      <ScrollView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center" style={{ minHeight: 400 }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </ScrollView>
    )
  }

  // Redirect if not authenticated (handled by useEffect, but show loading during redirect)
  if (!session?.user?.id) {
    return (
      <ScrollView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center" style={{ minHeight: 400 }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </ScrollView>
    )
  }

  return (
    <>
      <ScrollView className="flex-1 bg-gray-50">
        <View className="p-4">
          <Text className="text-xl font-bold text-gray-900 mb-4">Upload Resources</Text>
          <Text className="text-gray-600 mb-6">
            Upload images, videos, or PDFs that will be available to all users.
          </Text>

          <TouchableOpacity
            className="bg-blue-600 rounded-lg py-4 mb-4"
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">Upload Image</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-green-600 rounded-lg py-4 mb-4"
            onPress={pickVideo}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">Upload Video</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-red-600 rounded-lg py-4 mb-4"
            onPress={pickPDF}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">Upload PDF</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showTitleModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowTitleModal(false)
          setTitleInput('')
          setPendingUpload(null)
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View style={styles.modalContent}>
            <Text className="text-xl font-bold text-gray-900 mb-4">Resource Title</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 bg-white"
              placeholder="Enter a title for this resource"
              value={titleInput}
              onChangeText={setTitleInput}
              autoFocus
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-300 rounded-lg py-3"
                onPress={() => {
                  setShowTitleModal(false)
                  setTitleInput('')
                  setPendingUpload(null)
                }}
              >
                <Text className="text-gray-900 text-center font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-blue-600 rounded-lg py-3"
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-semibold">Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: Platform.OS === 'web' ? 600 : '83.33%',
    maxWidth: Platform.OS === 'web' ? '90%' : undefined,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
})
