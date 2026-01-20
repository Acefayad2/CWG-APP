import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, StyleSheet, TextInput, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession, useProfile } from '@/lib/queries/auth'
import { useScripts, useCreateScript } from '@/lib/queries/scripts'
import { ScriptWithFavorite } from '@/types'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'
import { scriptSchema } from '@/utils/validation'

export default function ScriptsScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: profile } = useProfile(session?.user?.id)
  const { data: scripts, isLoading, refetch, isRefetching } = useScripts(session?.user?.id)
  const createScript = useCreateScript()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [scriptTitle, setScriptTitle] = useState('')
  const [scriptBody, setScriptBody] = useState('')
  const [isAdminScript, setIsAdminScript] = useState(false)
  
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
        contentContainerStyle={styles.listContent}
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
          <ScriptCard script={item} onPress={() => router.push(`/script/${item.id}`)} />
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
    </View>
  )
}

function ScriptCard({ script, onPress }: { script: ScriptWithFavorite; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={CommonStyles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle} numberOfLines={2}>{script.title}</Text>
          {script.is_favorite && (
            <Text style={styles.favoriteIcon}>★</Text>
          )}
        </View>
        {script.is_admin && (
          <View style={[CommonStyles.badge, CommonStyles.badgePrimary]}>
            <Text style={CommonStyles.badgeText}>Admin</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardBody} numberOfLines={3}>
        {script.body}
      </Text>
      {script.category && (
        <View style={styles.cardFooter}>
          <Text style={styles.categoryText}>{script.category}</Text>
        </View>
      )}
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
    padding: 20,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  favoriteIcon: {
    fontSize: 18,
    color: Colors.warning,
    marginLeft: 8,
  },
  cardBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
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
})
