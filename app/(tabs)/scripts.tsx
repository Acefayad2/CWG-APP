import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, StyleSheet, TextInput, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSession, useProfile } from '@/lib/queries/auth'
import { useScripts, useCreateScript } from '@/lib/queries/scripts'
import { useUserContacts, UserContact } from '@/lib/queries/contacts'
import { ScriptWithFavorite } from '@/types'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'
import { scriptSchema } from '@/utils/validation'
import { personalizeScript } from '@/utils/sms'
import * as SMS from 'expo-sms'
import * as Linking from 'expo-linking'

export default function ScriptsScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: profile } = useProfile(session?.user?.id)
  const { data: scripts, isLoading, refetch, isRefetching } = useScripts(session?.user?.id)
  const { data: userContacts } = useUserContacts(session?.user?.id)
  const createScript = useCreateScript()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [scriptTitle, setScriptTitle] = useState('')
  const [scriptBody, setScriptBody] = useState('')
  const [isAdminScript, setIsAdminScript] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [selectedScript, setSelectedScript] = useState<ScriptWithFavorite | null>(null)
  const [sendMethod, setSendMethod] = useState<'sms' | 'email' | null>(null)
  
  const isAdmin = profile?.role === 'admin'

  const filteredScripts = scripts?.filter(script =>
    script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    script.body.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const handleCreateScript = async () => {
    try {
      const validated = scriptSchema.parse({ title: scriptTitle, body: scriptBody })
      
      await createScript.mutateAsync({
        ...validated,
        is_admin: isAdmin && isAdminScript,
        created_by: session?.user?.id || null,
      })
      
      setShowCreateModal(false)
      setScriptTitle('')
      setScriptBody('')
      setIsAdminScript(false)
      refetch()
    } catch (error: any) {
      if (error.errors) {
        const errorMessage = error.errors.map((e: any) => e.message).join(', ')
        Alert.alert('Validation Error', errorMessage)
      } else {
        Alert.alert('Error', error.message || 'Failed to create script')
      }
    }
  }

  const handleCancelCreate = () => {
    setShowCreateModal(false)
    setScriptTitle('')
    setScriptBody('')
    setIsAdminScript(false)
  }

  const handleSendScript = (script: ScriptWithFavorite, method: 'sms' | 'email') => {
    setSelectedScript(script)
    setSendMethod(method)
    
    // Check if user has contacts
    if (userContacts && userContacts.length > 0) {
      Alert.alert(
        'Choose Contact',
        'Would you like to send this to someone from your contact list?',
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: () => sendWithoutContact(script, method),
          },
          {
            text: 'Yes',
            onPress: () => setShowContactModal(true),
          },
        ]
      )
    } else {
      // No contacts, send without contact
      sendWithoutContact(script, method)
    }
  }

  const sendWithoutContact = async (script: ScriptWithFavorite, method: 'sms' | 'email') => {
    const scriptText = script.body
    
    if (method === 'sms') {
      try {
        const isAvailable = await SMS.isAvailableAsync()
        if (isAvailable) {
          await SMS.sendSMSAsync([], scriptText)
        } else {
          // Fallback: open SMS app with text
          const url = `sms:?body=${encodeURIComponent(scriptText)}`
          const canOpen = await Linking.canOpenURL(url)
          if (canOpen) {
            await Linking.openURL(url)
          } else {
            Alert.alert('Error', 'SMS is not available on this device')
          }
        }
      } catch (error) {
        console.error('Error sending SMS:', error)
        Alert.alert('Error', 'Failed to open SMS app')
      }
    } else {
      // Email
      const subject = encodeURIComponent(script.title)
      const body = encodeURIComponent(scriptText)
      const url = `mailto:?subject=${subject}&body=${body}`
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
      } else {
        Alert.alert('Error', 'Email is not available on this device')
      }
    }
  }

  const handleContactSelect = async (contact: UserContact) => {
    if (!selectedScript || !sendMethod) return
    
    setShowContactModal(false)
    const scriptText = selectedScript.body
    const personalizedText = personalizeScript(scriptText, contact.name)
    
    if (sendMethod === 'sms') {
      try {
        const isAvailable = await SMS.isAvailableAsync()
        if (isAvailable) {
          await SMS.sendSMSAsync([contact.phone_number], personalizedText)
        } else {
          // Fallback: open SMS app with contact and text
          const url = `sms:${contact.phone_number}?body=${encodeURIComponent(personalizedText)}`
          const canOpen = await Linking.canOpenURL(url)
          if (canOpen) {
            await Linking.openURL(url)
          } else {
            Alert.alert('Error', 'SMS is not available on this device')
          }
        }
      } catch (error) {
        console.error('Error sending SMS:', error)
        Alert.alert('Error', 'Failed to open SMS app')
      }
    } else {
      // Email - note: we don't have email in contacts, so just use name
      const subject = encodeURIComponent(selectedScript.title)
      const body = encodeURIComponent(personalizedText)
      const url = `mailto:?subject=${subject}&body=${body}`
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
      } else {
        Alert.alert('Error', 'Email is not available on this device')
      }
    }
    
    setSelectedScript(null)
    setSendMethod(null)
  }

  if (isLoading) {
    return (
      <View style={[CommonStyles.centered, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scripts</Text>
        <Text style={styles.headerSubtitle}>Manage your messaging scripts</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search scripts..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[CommonStyles.button, CommonStyles.buttonPrimary]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Text style={CommonStyles.buttonText}>+ Create Script</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredScripts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No scripts found</Text>
            <Text style={styles.emptySubtext}>Create your first script to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ScriptCard 
            script={item} 
            onPress={() => router.push(`/script/${item.id}`)}
            onTextPress={() => handleSendScript(item, 'sms')}
            onEmailPress={() => handleSendScript(item, 'email')}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancelCreate}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Script</Text>
              
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Title</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter script title"
                    placeholderTextColor={Colors.textLight}
                    value={scriptTitle}
                    onChangeText={setScriptTitle}
                    autoFocus
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Text</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Enter script text"
                    placeholderTextColor={Colors.textLight}
                    value={scriptBody}
                    onChangeText={setScriptBody}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                {isAdmin && (
                  <View style={styles.modalField}>
                    <View style={styles.adminToggleContainer}>
                      <View style={styles.adminToggleTextContainer}>
                        <Text style={styles.modalLabel}>Make visible to all users</Text>
                        <Text style={styles.adminToggleDescription}>
                          This script will be available to all users as a static template
                        </Text>
                      </View>
                      <Switch
                        value={isAdminScript}
                        onValueChange={setIsAdminScript}
                        trackColor={{ false: Colors.borderLight, true: Colors.primary }}
                        thumbColor={Colors.surface}
                      />
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={handleCancelCreate}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCreate]}
                  onPress={handleCreateScript}
                  disabled={createScript.isPending || !scriptTitle.trim() || !scriptBody.trim()}
                  activeOpacity={0.8}
                >
                  {createScript.isPending ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.modalButtonTextCreate}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Contact Selection Modal */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowContactModal(false)
          setSelectedScript(null)
          setSendMethod(null)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Select Contact to {sendMethod === 'sms' ? 'Text' : 'Email'}
            </Text>
            
            <FlatList
              data={userContacts || []}
              keyExtractor={(item) => item.id}
              style={styles.contactsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handleContactSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.contactItemContent}>
                    <Text style={styles.contactItemName}>{item.name}</Text>
                    <Text style={styles.contactItemPhone}>{item.phone_number}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContacts}>
                  <Text style={styles.emptyContactsText}>No contacts available</Text>
                </View>
              }
            />
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => {
                setShowContactModal(false)
                if (selectedScript && sendMethod) {
                  sendWithoutContact(selectedScript, sendMethod)
                }
                setSelectedScript(null)
                setSendMethod(null)
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonTextCancel}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function ScriptCard({ 
  script, 
  onPress,
  onTextPress,
  onEmailPress 
}: { 
  script: ScriptWithFavorite
  onPress: () => void
  onTextPress: () => void
  onEmailPress: () => void
}) {
  return (
    <TouchableOpacity
      style={styles.scriptCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle} numberOfLines={2}>{script.title}</Text>
            {script.is_favorite && (
              <View style={styles.favoriteBadge}>
                <Text style={styles.favoriteIcon}>★</Text>
              </View>
            )}
          </View>
          {script.is_admin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.cardBody} numberOfLines={3}>
          {script.body}
        </Text>
        
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={(e) => {
              e.stopPropagation()
              onTextPress()
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={(e) => {
              e.stopPropagation()
              onEmailPress()
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="mail" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        
        {script.category && (
          <View style={styles.cardFooter}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{script.category}</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  actionBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  },
  scriptCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    width: '48%',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    lineHeight: 26,
  },
  favoriteBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  favoriteIcon: {
    fontSize: 20,
    color: Colors.warning,
  },
  adminBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actionIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  modalTextArea: {
    minHeight: 250,
    paddingTop: 12,
  },
  adminToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  adminToggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  adminToggleDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
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
  contactsList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactItemContent: {
    flex: 1,
  },
  contactItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contactItemPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContacts: {
    padding: 32,
    alignItems: 'center',
  },
  emptyContactsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
})
