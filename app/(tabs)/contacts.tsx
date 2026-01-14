import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, StyleSheet, Platform, RefreshControl, AppState, AppStateStatus, Modal, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native'
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
  const [showAddContactModal, setShowAddContactModal] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactPhoneLabel, setContactPhoneLabel] = useState('')
  const [addingContact, setAddingContact] = useState(false)
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

  const handleAddContact = async () => {
    if (!session?.user?.id) {
      Alert.alert('Authentication Required', 'Please sign in to add contacts')
      return
    }

    if (!contactName.trim() || !contactPhone.trim()) {
      Alert.alert('Validation Error', 'Name and phone number are required')
      return
    }

    try {
      setAddingContact(true)
      await importContacts.mutateAsync({
        userId: session.user.id,
        contacts: [{
          user_id: session.user.id,
          name: contactName.trim(),
          phone_number: contactPhone.trim(),
          phone_label: contactPhoneLabel.trim() || undefined,
        }],
      })
      setShowAddContactModal(false)
      setContactName('')
      setContactPhone('')
      setContactPhoneLabel('')
      refetch()
      Alert.alert('Success', 'Contact added successfully')
    } catch (error: any) {
      if (error.code === '23505') {
        Alert.alert('Error', 'This contact already exists')
      } else {
        Alert.alert('Error', error.message || 'Failed to add contact')
      }
    } finally {
      setAddingContact(false)
    }
  }

  const handleCancelAddContact = () => {
    setShowAddContactModal(false)
    setContactName('')
    setContactPhone('')
    setContactPhoneLabel('')
  }

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
        
        <TouchableOpacity
          style={[CommonStyles.button, CommonStyles.buttonOutline, styles.addButton]}
          onPress={() => {
            if (!session?.user?.id) {
              Alert.alert('Authentication Required', 'Please sign in to add contacts')
              return
            }
            setShowAddContactModal(true)
          }}
          activeOpacity={0.8}
        >
          <Text style={[CommonStyles.buttonTextOutline]}>Add Contact</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showAddContactModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancelAddContact}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Contact</Text>
              
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter contact name"
                    placeholderTextColor={Colors.textLight}
                    value={contactName}
                    onChangeText={setContactName}
                    autoFocus
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter phone number"
                    placeholderTextColor={Colors.textLight}
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Phone Label (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g., Mobile, Home, Work"
                    placeholderTextColor={Colors.textLight}
                    value={contactPhoneLabel}
                    onChangeText={setContactPhoneLabel}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={handleCancelAddContact}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCreate]}
                  onPress={handleAddContact}
                  disabled={addingContact || !contactName.trim() || !contactPhone.trim()}
                  activeOpacity={0.8}
                >
                  {addingContact ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.modalButtonTextCreate}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : userContacts && userContacts.length > 0 ? (
        <FlatList
          data={userContacts}
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
            <View style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>
                  {item.phone_number}
                  {item.phone_label && ` • ${item.phone_label}`}
                </Text>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No contacts imported</Text>
          <Text style={styles.emptySubtext}>
            {!session?.user?.id 
              ? 'Please sign in to import contacts'
              : Platform.OS === 'web' 
              ? 'Contact import is not available on web'
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
    padding: 16,
    gap: 12,
  },
  addButton: {
    marginTop: 0,
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
    width: '90%',
    maxHeight: '80%',
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
  },
  modalScrollView: {
    maxHeight: 400,
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
