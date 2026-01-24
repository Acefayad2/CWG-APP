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

    // Check if we're on web (including mobile web browsers)
    if (Platform.OS === 'web') {
      // Check if Contact Picker API is available (Chrome/Edge on Android, Safari on iOS 14.5+)
      // The Contact Picker API must be called directly from a user gesture
      const nav = typeof navigator !== 'undefined' ? navigator : null
      const hasContactPicker = nav && 
                                'contacts' in nav && 
                                typeof (nav as any).contacts?.select === 'function'
      
      console.log('Contact Picker API check:', {
        hasNavigator: !!nav,
        hasContacts: nav && 'contacts' in nav,
        contactsValue: nav ? (nav as any).contacts : 'N/A',
        hasSelect: nav && typeof (nav as any).contacts?.select === 'function',
        userAgent: nav?.userAgent || 'N/A'
      })
      
      if (!hasContactPicker) {
        const userAgent = nav?.userAgent || ''
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
        const isChrome = /Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)
        const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)
        const isEdge = /Edge/i.test(userAgent)
        
        if (isMobile && (isChrome || isEdge || isSafari)) {
          Alert.alert(
            'Contact Import Available',
            'Your browser should support contact import!\n\nHowever, the Contact Picker API may not be enabled. Please ensure:\n\n1. You are using Chrome/Edge on Android or Safari on iOS 14.5+\n2. The website is served over HTTPS\n3. You grant permission when prompted\n\nIf it still doesn\'t work, try using the native mobile app.',
            [{ text: 'OK' }]
          )
        } else if (isMobile) {
          Alert.alert(
            'Contact Import Not Available',
            'Your mobile browser does not support automatic contact import.\n\nTo import contacts:\n\n1. Download the native mobile app (iOS/Android)\n2. Or use Chrome/Edge on Android\n3. Or use Safari on iOS 14.5+\n\nAlternatively, you can add contacts manually.',
            [{ text: 'OK' }]
          )
        } else {
          Alert.alert(
            'Contact Import Not Available',
            'Automatic contact import is not available on desktop browsers.\n\nTo import contacts:\n\n1. Use the mobile app (iOS/Android)\n2. Or use Chrome/Edge on Android mobile\n3. Or add contacts manually using the "Add Contact" button',
            [{ text: 'OK' }]
          )
        }
        return
      }
      
      // IMPORTANT: Call the Contact Picker API immediately from user gesture
      // Do NOT set state or do anything async before calling the API
      // The API must be called synchronously from the user interaction
      try {
        console.log('Calling Web Contact Picker API...')
        
        // Request contacts using Contact Picker API
        // This must be called directly from user interaction (button click)
        // The API will show a native contact picker dialog
        // Call it immediately without any state updates first
        // @ts-ignore - Contact Picker API types not available
        const contacts = await (nav as any).contacts.select(
          ['name', 'tel'], 
          { multiple: true }
        )
        
        // Set importing state after the picker is shown
        setImporting(true)
          
          if (!contacts || contacts.length === 0) {
            Alert.alert('No Contacts', 'No contacts were selected')
            setImporting(false)
            return
          }

          console.log('Contacts selected:', contacts)

          // Format contacts for import
          const contactsToImport: Array<{ user_id: string; name: string; phone_number: string; phone_label: string }> = []
          
          for (const contact of contacts) {
            const name = contact.name?.[0] || 'Unknown'
            const phones = contact.tel || []
            
            for (const phone of phones) {
              if (phone && phone.trim().length > 0) {
                contactsToImport.push({
                  user_id: session.user.id,
                  name: name,
                  phone_number: phone.trim(),
                  phone_label: '',
                })
              }
            }
          }

          if (contactsToImport.length === 0) {
            Alert.alert('No Contacts', 'No contacts with phone numbers were selected')
            setImporting(false)
            return
          }

          // Check for duplicates
          const existingContacts = userContacts || []
          const existingPhoneNumbers = new Set(
            existingContacts.map(c => `${c.phone_number}`.trim().toLowerCase())
          )

          const newContacts = contactsToImport.filter(
            contact => !existingPhoneNumbers.has(contact.phone_number.trim().toLowerCase())
          )

          if (newContacts.length === 0) {
            Alert.alert('Import Complete', 'All selected contacts are already in your list.')
            setImporting(false)
            return
          }

          // Import contacts in batches
          const BATCH_SIZE = 100
          let importedCount = 0

          for (let i = 0; i < newContacts.length; i += BATCH_SIZE) {
            const batch = newContacts.slice(i, i + BATCH_SIZE)
            try {
              await importContacts.mutateAsync({
                userId: session.user.id,
                contacts: batch,
              })
              importedCount += batch.length
            } catch (error: any) {
              if (error.code !== '23505') {
                throw error
              }
            }
          }

        Alert.alert('Success', `Imported ${importedCount} contacts`)
        refetch()
        setImporting(false)
        return
      } catch (error: any) {
        console.error('Web Contact Picker error:', error)
        setImporting(false)
        
        // Check if user cancelled the picker
        if (error.name === 'AbortError' || 
            error.message?.toLowerCase().includes('cancel') || 
            error.message?.toLowerCase().includes('abort') ||
            error.code === 20) { // DOMException.ABORT_ERR
          Alert.alert('Import Cancelled', 'Contact selection was cancelled.')
          return
        }
        
        // Check if it's a permission/security error
        if (error.name === 'SecurityError' || 
            error.message?.toLowerCase().includes('permission') ||
            error.message?.toLowerCase().includes('secure context')) {
          Alert.alert(
            'Permission Required',
            'Contact access requires a secure connection (HTTPS) and user permission.\n\nPlease ensure:\n\n1. The website is using HTTPS\n2. You grant permission when prompted\n3. You are using a supported browser (Chrome/Edge on Android or Safari on iOS 14.5+)',
            [{ text: 'OK' }]
          )
          return
        }
        
        // Generic error - show helpful message
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
        const isChrome = /Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)
        const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)
        const isEdge = /Edge/i.test(userAgent)
        
        let errorMessage = 'Failed to import contacts.'
        
        if (isMobile && (isChrome || isEdge || isSafari)) {
          errorMessage += '\n\nThe Contact Picker API should be available in your browser.\n\nPlease try:\n1. Refreshing the page\n2. Ensuring the site uses HTTPS\n3. Granting permission when prompted\n\nIf it still doesn\'t work, use the native mobile app.'
        } else if (isMobile) {
          errorMessage += '\n\nYour browser may not support the Contact Picker API.\n\nSupported browsers:\n• Chrome/Edge on Android\n• Safari on iOS 14.5+\n\nPlease use one of these browsers or the native mobile app.'
        } else {
          errorMessage += '\n\nAutomatic contact import is not available on desktop browsers.\n\nPlease use:\n• The mobile app (iOS/Android)\n• Chrome/Edge on Android mobile\n• Or add contacts manually'
        }
        
        Alert.alert('Import Failed', errorMessage, [{ text: 'OK' }])
        return
      }
      } else {
        // Contact Picker API not available - show helpful message
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
        const isChrome = /Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)
        const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)
        const isEdge = /Edge/i.test(userAgent)
        
        // Reset importing state first
        setImporting(false)
        
        // Show alert with browser-specific guidance
        if (isMobile) {
          if (isChrome || isEdge) {
            Alert.alert(
              'Contact Import Available',
              'Your browser supports contact import!\n\nHowever, the Contact Picker API may not be enabled. Please ensure:\n\n1. You are using Chrome/Edge on Android\n2. The website is served over HTTPS\n3. You grant permission when prompted\n\nIf it still doesn\'t work, try using the native mobile app.',
              [{ text: 'OK' }]
            )
          } else if (isSafari) {
            Alert.alert(
              'Contact Import Available',
              'Safari on iOS 14.5+ supports contact import!\n\nPlease ensure:\n\n1. You are using iOS 14.5 or later\n2. The website is served over HTTPS\n3. You grant permission when prompted\n\nIf it still doesn\'t work, try using the native mobile app.',
              [{ text: 'OK' }]
            )
          } else {
            Alert.alert(
              'Contact Import Not Available',
              'Your mobile browser does not support automatic contact import.\n\nTo import contacts:\n\n1. Download the native mobile app (iOS/Android)\n2. Or use Chrome/Edge on Android\n3. Or use Safari on iOS 14.5+\n\nAlternatively, you can add contacts manually.',
              [{ text: 'OK' }]
            )
          }
        } else {
          Alert.alert(
            'Contact Import Not Available',
            'Automatic contact import is not available on desktop browsers.\n\nTo import contacts:\n\n1. Use the mobile app (iOS/Android)\n2. Or use Chrome/Edge on Android mobile\n3. Or add contacts manually using the "Add Contact" button',
            [{ text: 'OK' }]
          )
        }
        return
      }
    }

    try {
      setImporting(true)
      
      // Double-check we're not on web (expo-contacts doesn't work on web)
      if (Platform.OS === 'web') {
        Alert.alert(
          'Not Available on Web',
          'Contact import is not available on web browsers. Please use the mobile app (iOS/Android) to import contacts.',
          [{ text: 'OK' }]
        )
        setImporting(false)
        return
      }
      
      // Verify expo-contacts is available
      if (!Contacts || typeof Contacts.getPermissionsAsync !== 'function') {
        throw new Error('Contacts API is not available on this platform')
      }
      
      // First check current permission status
      console.log('Checking current permission status...')
      let currentStatus: string
      try {
        const permissionCheck = await Contacts.getPermissionsAsync()
        currentStatus = permissionCheck.status
      } catch (permError: any) {
        console.error('Error checking permissions:', permError)
        throw new Error(`Failed to check contacts permission: ${permError.message || 'Unknown error'}`)
      }
      console.log('Current permission status:', currentStatus)
      
      let status = currentStatus
      
      // If not granted, request permission - this will prompt the device to ask user
      if (status !== 'granted') {
        console.log('Permission not granted, requesting...')
        try {
          const permissionResult = await Contacts.requestPermissionsAsync()
          status = permissionResult.status
          console.log('Permission request result:', status)
        } catch (requestError: any) {
          console.error('Error requesting permissions:', requestError)
          throw new Error(`Failed to request contacts permission: ${requestError.message || 'Unknown error'}`)
        }
      }
      
      if (status !== 'granted') {
        console.log('Permission denied by user')
        Alert.alert(
          'Permission Denied', 
          'Contacts permission is required to import your contact list. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                // Try to open app settings if possible
                if (Platform.OS === 'ios') {
                  // On iOS, we can't programmatically open settings, but we can guide the user
                  Alert.alert(
                    'Enable Contacts Access',
                    'Please go to:\nSettings > CWG APP > Contacts\n\nThen enable "Allow Access to Contacts"'
                  )
                } else if (Platform.OS === 'android') {
                  // On Android, we can try to open settings
                  Alert.alert(
                    'Enable Contacts Access',
                    'Please go to:\nSettings > Apps > CWG APP > Permissions > Contacts\n\nThen enable access'
                  )
                } else {
                  Alert.alert('Settings', 'Please go to your device Settings > App Permissions > Contacts and enable access.')
                }
              }
            }
          ]
        )
        setImporting(false)
        return
      }
      
      console.log('Permission granted, proceeding with contact import...')

      // Get contacts from device
      console.log('Fetching contacts from device...')
      let data
      let contactsError
      try {
        const contactsResult = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        })
        data = contactsResult.data
        contactsError = contactsResult.error
      } catch (fetchError: any) {
        console.error('Exception fetching contacts:', fetchError)
        throw new Error(`Failed to fetch contacts: ${fetchError.message || 'Unknown error'}`)
      }

      if (contactsError) {
        console.error('Error fetching contacts:', contactsError)
        throw new Error(`Failed to fetch contacts: ${contactsError.message || 'Unknown error'}`)
      }
      

      if (!data || data.length === 0) {
        console.log('No contacts found on device')
        Alert.alert('No Contacts', 'No contacts found on your device')
        setImporting(false)
        return
      }

      console.log(`Found ${data.length} contacts on device`)

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

      console.log(`Formatted ${contactsToImport.length} contacts with phone numbers`)

      if (contactsToImport.length === 0) {
        Alert.alert('No Contacts', 'No contacts with phone numbers found on your device')
        setImporting(false)
        return
      }

      // Check existing contacts to avoid duplicates
      const existingContacts = userContacts || []
      const existingPhoneNumbers = new Set(
        existingContacts.map(c => `${c.phone_number}`.trim().toLowerCase())
      )

      // Filter out duplicates
      const newContacts = contactsToImport.filter(
        contact => !existingPhoneNumbers.has(contact.phone_number.trim().toLowerCase())
      )

      console.log(`Found ${newContacts.length} new contacts to import (${contactsToImport.length - newContacts.length} duplicates)`)

      if (newContacts.length === 0) {
        Alert.alert('Import Complete', 'All contacts are already in your list.')
        setImporting(false)
        return
      }

      // Import to Supabase in batches to avoid timeout
      console.log('Importing contacts to Supabase...')
      const BATCH_SIZE = 100
      let importedCount = 0
      let duplicateCount = 0

      for (let i = 0; i < newContacts.length; i += BATCH_SIZE) {
        const batch = newContacts.slice(i, i + BATCH_SIZE)
        console.log(`Importing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} contacts)...`)
        
        try {
          await importContacts.mutateAsync({
            userId: session.user.id,
            contacts: batch,
          })
          importedCount += batch.length
          console.log(`Batch imported successfully`)
        } catch (error: any) {
          console.error('Batch import error:', error)
          
          if (error.code === '23505') {
            // Unique constraint violation - some contacts already exist
            duplicateCount += batch.length
            console.log('Batch had duplicates, continuing...')
          } else {
            // For other errors, try to continue with next batch
            console.error('Error importing batch:', error.message)
            // Don't throw - continue with next batch
          }
        }
      }

      // Refresh the contact list
      await refetch()

      // Show success message
      const totalImported = importedCount
      const totalDuplicates = duplicateCount + (contactsToImport.length - newContacts.length)
      
      if (totalImported > 0) {
        if (totalDuplicates > 0) {
          Alert.alert(
            'Import Complete', 
            `Imported ${totalImported} new contacts. ${totalDuplicates} contacts were already in your list.`
          )
        } else {
          Alert.alert('Success', `Imported ${totalImported} contacts`)
        }
      } else {
        Alert.alert('Import Complete', 'All contacts are already in your list.')
      }
      
    } catch (error: any) {
      console.error('Import contacts error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      let errorMessage = 'Failed to import contacts. Please try again.'
      
      if (error.message) {
        errorMessage = error.message
      } else if (error.code) {
        errorMessage = `Error code: ${error.code}. Please try again.`
      }
      
      Alert.alert('Error', errorMessage)
    } finally {
      setImporting(false)
      console.log('Import process completed')
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
          style={[
            CommonStyles.button, 
            CommonStyles.buttonPrimary,
            (importing || !session?.user?.id) && CommonStyles.buttonDisabled
          ]}
          onPress={(e) => {
            e.stopPropagation()
            handleImportContacts()
          }}
          disabled={importing || !session?.user?.id}
          activeOpacity={0.8}
        >
          {importing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="white" size="small" />
              <Text style={CommonStyles.buttonText}>Importing...</Text>
            </View>
          ) : (
            <Text style={CommonStyles.buttonText}>Import Contact List</Text>
          )}
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
              : searchQuery 
              ? 'No contacts match your search'
              : Platform.OS === 'web'
              ? 'Tap "Import Contact List" to select contacts from your device (supported on Chrome/Edge Android and Safari iOS 14.5+)'
              : 'Tap "Import Contact List" to import your device contacts'}
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
