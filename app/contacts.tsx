import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Contacts from 'expo-contacts'
import { Contact } from '@/types'

export default function ContactsScreen() {
  const { scriptId } = useLocalSearchParams<{ scriptId: string }>()
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Contacts permission is required to send scripts')
        router.back()
        return
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      })

      const contactsWithPhones = data.filter(contact => 
        contact.phoneNumbers && contact.phoneNumbers.length > 0
      ).map(contact => ({
        id: contact.id,
        name: contact.name || 'Unknown',
        phoneNumbers: contact.phoneNumbers?.map(pn => ({
          number: pn.number || '',
          label: pn.label || '',
        })),
      }))

      setContacts(contactsWithPhones)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const toggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts)
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId)
    } else {
      newSelected.add(contactId)
    }
    setSelectedContacts(newSelected)
  }

  const handleContinue = () => {
    if (selectedContacts.size === 0) {
      Alert.alert('No Contacts Selected', 'Please select at least one contact')
      return
    }
    const selected = contacts.filter(c => selectedContacts.has(c.id))
    router.push({
      pathname: '/send-preview',
      params: { scriptId, contactIds: JSON.stringify(selected.map(c => c.id)) },
    })
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Select Contacts ({selectedContacts.size})
        </Text>
        <TouchableOpacity
          className="bg-blue-600 rounded-lg py-3"
          onPress={handleContinue}
          disabled={selectedContacts.size === 0}
        >
          <Text className="text-white text-center font-semibold">Continue</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            className={`bg-white rounded-lg p-4 mb-3 border-2 ${
              selectedContacts.has(item.id) ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
            }`}
            onPress={() => toggleContact(item.id)}
          >
            <Text className="text-lg font-semibold text-gray-900">{item.name}</Text>
            {item.phoneNumbers && item.phoneNumbers.length > 0 && (
              <Text className="text-gray-600 text-sm mt-1">
                {item.phoneNumbers[0].number}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  )
}
