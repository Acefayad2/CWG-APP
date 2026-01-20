import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, StyleSheet, Platform, RefreshControl, AppState, AppStateStatus, TextInput } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import * as Contacts from 'expo-contacts'
import { useSession } from '@/lib/queries/auth'
import { useUserContacts, useImportContacts } from '@/lib/queries/contacts'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'

export default function ContactsScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: userContacts, isLoading, refetch, isRefetching } = useUserContacts(session?.user?.id)
  const importContacts = useImportContacts()
  const [importing, setImporting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const appState = useRef(AppState.currentState)

  const syncContactsSilently = useCallback(async () => {
    if (!session?.user?.id || Platform.OS === 'web' || importing) return

    try {
      const { status } = await Contacts.getPermissionsAsync()
      if (status !== 'granted') return

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      })

      const contactsToImport = data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .flatMap(contact => 
          contact.phoneNumbers!.map(phone => ({
            user_id: session.user.id,
            name: contact.name || 'Unknown',
            phone_number: phone.number || '',
            phone_label: phone.label || '',
          }))
        )
        .filter(contact => contact.phone_number.length > 0)

      if (contactsToImport.length > 0) {
        try {
          await importContacts.mutateAsync({
            userId: session.user.id,
            contacts: contactsToImport,
          })
          refetch()
        } catch (error: any) {
          // Silently handle duplicates (error code 23505) - this is expected
          if (error.code !== '23505') {
            console.error('Error syncing contacts:', error)
          }
        }
      }
    } catch (error) {
      // Silently fail - don't disturb user
      console.error('Error syncing contacts:', error)
    }
  }, [session?.user?.id, importing, importContacts, refetch])

  // Auto-sync contacts when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id && Platform.OS !== 'web') {
        syncContactsSilently()
      }
    }, [session?.user?.id, syncContactsSilently])
  )

  // Auto-sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        session?.user?.id &&
        Platform.OS !== 'web'
      ) {
        syncContactsSilently()
      }
      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [session?.user?.id, syncContactsSilently])

  const handleImportContacts = async () => {
    if (!session?.user?.id) {
      Alert.alert('Authentication Required', 'Please sign in to import contacts')
      return
    }

    if (Platform.OS === 'web') {
      Alert.alert('Web Platform', 'Contact import is not available on web. Please use the mobile app.')
      return
    }

    try {
      setImporting(true)
      
      // Request permission
      const { status } = await Contacts.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Contacts permission is required to import contacts')
        setImporting(false)
        return
      }

      // Get contacts from device
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      })

      // Filter and format contacts
      const contactsToImport = data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .flatMap(contact => 
          contact.phoneNumbers!.map(phone => ({
            user_id: session.user.id,
            name: contact.name || 'Unknown',
            phone_number: phone.number || '',
            phone_label: phone.label || '',
          }))
        )
        .filter(contact => contact.phone_number.length > 0)

      if (contactsToImport.length === 0) {
        Alert.alert('No Contacts', 'No contacts with phone numbers found')
        setImporting(false)
        return
      }

      // Import to Supabase (batch insert - handle duplicates with UNIQUE constraint)
      await importContacts.mutateAsync({
        userId: session.user.id,
        contacts: contactsToImport,
      })

      Alert.alert('Success', `Imported ${contactsToImport.length} contacts`)
      refetch()
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation - some contacts already exist
        Alert.alert('Import Complete', 'Contacts imported. Some contacts were already in your list.')
        refetch()
      } else {
        Alert.alert('Error', error.message || 'Failed to import contacts')
      }
    } finally {
      setImporting(false)
    }
  }

  const filteredContacts = (userContacts || []).filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone_number.includes(searchQuery)
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <Text style={styles.headerSubtitle}>Manage your contact list</Text>
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[CommonStyles.button, CommonStyles.buttonPrimary]}
          onPress={handleImportContacts}
          disabled={importing}
          activeOpacity={0.8}
        >
          <Text style={CommonStyles.buttonText}>
            {importing ? 'Importing...' : 'Import Contact Lists'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : filteredContacts.length > 0 ? (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={isRefetching} 
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.contactCard}
              activeOpacity={0.7}
            >
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>
                  {item.phone_number}
                  {item.phone_label && ` • ${item.phone_label}`}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No contacts found</Text>
          <Text style={styles.emptySubtext}>
            {!session?.user?.id 
              ? 'Please sign in to import contacts'
              : Platform.OS === 'web' 
              ? 'Contact import is not available on web'
              : searchQuery 
              ? 'No contacts match your search'
              : 'Tap "Import Contact Lists" to import your device contacts'}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  contactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...CommonStyles.cardElevated,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    width: Platform.OS === 'web' ? 600 : '90%',
    maxWidth: Platform.OS === 'web' ? '90%' : undefined,
    maxHeight: '85%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
  },
  modalScrollView: {
    maxHeight: Platform.OS === 'web' ? 450 : 400,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 48,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonCancel: {
    backgroundColor: Colors.borderLight,
  },
  modalButtonCreate: {
    backgroundColor: Colors.primary,
  },
  modalButtonTextCancel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextCreate: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
})
