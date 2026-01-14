import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { useScripts } from '@/lib/queries/scripts'
import { useResources } from '@/lib/queries/resources'
import * as Contacts from 'expo-contacts'
import { Contact } from '@/types'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'

export default function DashboardScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: scripts, isLoading: scriptsLoading } = useScripts(session?.user?.id)
  const { data: resources, isLoading: resourcesLoading } = useResources(session?.user?.id)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)

  const isLoading = scriptsLoading || resourcesLoading

  useEffect(() => {
    if (Platform.OS !== 'web') {
      loadContacts()
    }
  }, [])

  const loadContacts = async () => {
    if (Platform.OS === 'web') {
      // For web, we'll allow manual entry
      return
    }
    
    try {
      setContactsLoading(true)
      const { status } = await Contacts.requestPermissionsAsync()
      if (status !== 'granted') {
        setContactsLoading(false)
        return
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      })

      const contactsWithPhones = data.filter(contact => 
        contact.phoneNumbers && contact.phoneNumbers.length > 0
      ).slice(0, 10).map(contact => ({
        id: contact.id,
        name: contact.name || 'Unknown',
        phoneNumbers: contact.phoneNumbers?.map(pn => ({
          number: pn.number || '',
          label: pn.label || '',
        })),
      }))

      setContacts(contactsWithPhones)
    } catch (error: any) {
      console.error('Error loading contacts:', error)
    } finally {
      setContactsLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome to CWG App</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{scripts?.length || 0}</Text>
              <Text style={styles.statLabel}>Scripts</Text>
              <TouchableOpacity
                style={styles.statButton}
                onPress={() => router.push('/(tabs)/scripts')}
                activeOpacity={0.8}
              >
                <Text style={styles.statButtonText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{resources?.length || 0}</Text>
              <Text style={styles.statLabel}>Resources</Text>
              <TouchableOpacity
                style={styles.statButton}
                onPress={() => router.push('/(tabs)/resources')}
                activeOpacity={0.8}
              >
                <Text style={styles.statButtonText}>View All</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/script/create')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionTitle}>Create Script</Text>
              <Text style={styles.actionDescription}>Add a new messaging script</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactsSection}>
            <View style={styles.contactsHeader}>
              <Text style={styles.sectionTitle}>Contacts</Text>
              <TouchableOpacity
                style={styles.importButton}
                onPress={loadContacts}
                activeOpacity={0.8}
              >
                <Text style={styles.importButtonText}>
                  {Platform.OS === 'web' ? 'Add Contact' : 'Import Contacts'}
                </Text>
              </TouchableOpacity>
            </View>

            {contactsLoading ? (
              <View style={styles.contactsLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.contactsLoadingText}>Loading contacts...</Text>
              </View>
            ) : contacts.length > 0 ? (
              <View style={styles.contactsList}>
                {contacts.slice(0, 5).map((contact) => (
                  <View key={contact.id} style={styles.contactItem}>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                        <Text style={styles.contactPhone}>
                          {contact.phoneNumbers[0].number}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
                {contacts.length > 5 && (
                  <Text style={styles.moreContacts}>
                    +{contacts.length - 5} more contacts
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.emptyContacts}>
                <Text style={styles.emptyContactsText}>
                  {Platform.OS === 'web' 
                    ? 'Add contacts manually or import from your device'
                    : 'Import your contacts to get started'
                  }
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
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
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...CommonStyles.cardElevated,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  statButton: {
    backgroundColor: Colors.primaryLight + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    ...CommonStyles.cardElevated,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  contactsSection: {
    padding: 16,
    paddingTop: 0,
    marginBottom: 40,
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  importButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  importButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  contactsLoading: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  contactsLoadingText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  contactsList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    ...CommonStyles.cardElevated,
  },
  contactItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  moreContacts: {
    marginTop: 12,
    textAlign: 'center',
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContacts: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    ...CommonStyles.cardElevated,
  },
  emptyContactsText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
})
