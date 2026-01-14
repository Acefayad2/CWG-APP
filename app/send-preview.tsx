import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { useScript } from '@/lib/queries/scripts'
import { sendScriptToContacts, personalizeScript } from '@/utils/sms'
import * as Contacts from 'expo-contacts'
import { Contact } from '@/types'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'

export default function SendPreviewScreen() {
  const { scriptId, contactIds } = useLocalSearchParams<{ scriptId: string; contactIds: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const { data: script, isLoading: scriptLoading } = useScript(scriptId!, session?.user?.id)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      const ids = JSON.parse(contactIds || '[]') as string[]
      const { data } = await Contacts.getContactsAsync({
        ids,
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      })

      const contactsWithPhones = data.map(contact => ({
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

  // Get personalized script text (using first contact's name)
  const personalizedScript = script && contacts.length > 0
    ? personalizeScript(script.body, contacts[0].name)
    : script?.body || ''

  const handleSend = async () => {
    if (!script) return

    setSending(true)
    try {
      await sendScriptToContacts(script.body, contacts)
      Alert.alert('Success', 'SMS composer opened with script text')
      router.back()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send script')
    } finally {
      setSending(false)
    }
  }

  if (scriptLoading || loading) {
    return (
      <View style={[CommonStyles.centered, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!script) {
    return (
      <View style={[CommonStyles.centered, { backgroundColor: Colors.background }]}>
        <Text style={{ color: Colors.textSecondary }}>Script not found</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Preview</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Script: {script.title}</Text>
          <View style={styles.scriptPreview}>
            <Text style={styles.scriptText}>{personalizedScript}</Text>
          </View>
          {contacts.length > 0 && script.body !== personalizedScript && (
            <Text style={styles.note}>
              * Name placeholder replaced with "{contacts[0].name}"
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recipients ({contacts.length})
          </Text>
          {contacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <Text style={styles.contactName}>{contact.name}</Text>
              {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                <Text style={styles.contactPhone}>{contact.phoneNumbers[0].number}</Text>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[CommonStyles.button, CommonStyles.buttonPrimary, sending && CommonStyles.buttonDisabled]}
          onPress={handleSend}
          disabled={sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={CommonStyles.buttonText}>Send from Phone</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  scriptPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scriptText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  note: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
  contactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
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
})
