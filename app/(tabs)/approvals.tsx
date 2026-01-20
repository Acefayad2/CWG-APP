import { useState } from 'react'
import { useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, StyleSheet, Platform, Modal, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession, useProfile } from '@/lib/queries/auth'
import { usePendingUsers, useApproveUser, useDenyUser, PendingUser } from '@/lib/queries/auth'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'

export default function ApprovalsScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: profile, isLoading: profileLoading } = useProfile(session?.user?.id)
  const { data: pendingUsers, isLoading, refetch, isRefetching } = usePendingUsers()
  const approveUser = useApproveUser()
  const denyUser = useDenyUser()
  
  const isAdmin = profile?.role === 'admin'
  
  // Redirect non-admins away
  useEffect(() => {
    if (!profileLoading && !isAdmin) {
      router.replace('/(tabs)/scripts')
    }
  }, [isAdmin, profileLoading, router])
  
  if (profileLoading || isLoading) {
    return (
      <View style={[CommonStyles.centered, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }
  
  if (!isAdmin) {
    return null // Will redirect
  }
  
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [makeAdmin, setMakeAdmin] = useState(false)

  const handleApprove = (user: PendingUser) => {
    setSelectedUser(user)
    setMakeAdmin(false)
    setShowApproveModal(true)
  }

  const confirmApprove = async () => {
    if (!selectedUser) return
    
    try {
      await approveUser.mutateAsync({
        userId: selectedUser.id,
        makeAdmin: makeAdmin,
      })
      setShowApproveModal(false)
      setSelectedUser(null)
      setMakeAdmin(false)
      refetch()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const handleDeny = (userId: string, userName: string) => {
    Alert.alert(
      'Deny User',
      `Are you sure you want to deny ${userName}? They will need to sign up again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              await denyUser.mutateAsync(userId)
              refetch()
            } catch (error: any) {
              Alert.alert('Error', error.message)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Approvals</Text>
        <Text style={styles.headerSubtitle}>Review and approve new user signups</Text>
      </View>

      <FlatList
        data={pendingUsers}
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
            <Text style={styles.emptyText}>No pending users</Text>
            <Text style={styles.emptySubtext}>All users have been reviewed</Text>
          </View>
        }
        renderItem={({ item }) => (
          <UserCard 
            user={item}
            onApprove={() => handleApprove(item)}
            onDeny={() => handleDeny(item.id, item.full_name || 'User')}
            isLoading={approveUser.isPending || denyUser.isPending}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Approve Modal with Admin Option */}
      <Modal
        visible={showApproveModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowApproveModal(false)
          setSelectedUser(null)
          setMakeAdmin(false)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Approve User</Text>
            
            <Text style={styles.modalText}>
              Are you sure you want to approve {selectedUser?.full_name || 'this user'}?
            </Text>

            <View style={styles.adminToggleContainer}>
              <View style={styles.adminToggleTextContainer}>
                <Text style={styles.adminToggleLabel}>Grant Admin Role</Text>
                <Text style={styles.adminToggleDescription}>
                  This user will have access to admin features including user approvals, script management, and resource uploads.
                </Text>
              </View>
              <Switch
                value={makeAdmin}
                onValueChange={setMakeAdmin}
                trackColor={{ false: Colors.borderLight, true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowApproveModal(false)
                  setSelectedUser(null)
                  setMakeAdmin(false)
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonApprove]}
                onPress={confirmApprove}
                disabled={approveUser.isPending}
                activeOpacity={0.8}
              >
                {approveUser.isPending ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.modalButtonTextApprove}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function UserCard({ user, onApprove, onDeny, isLoading }: { 
  user: PendingUser
  onApprove: (user: PendingUser) => void
  onDeny: () => void
  isLoading: boolean
}) {
  const createdDate = new Date(user.created_at).toLocaleDateString()
  
  return (
    <View style={styles.userCard}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{user.full_name || 'No Name'}</Text>
        </View>
        
        <View style={styles.cardInfo}>
          <Text style={styles.cardInfoText}>Created: {createdDate}</Text>
          {user.email && (
            <Text style={styles.cardInfoText}>Email: {user.email}</Text>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => onApprove(user)}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.denyButton]}
            onPress={onDeny}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Deny</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  listContent: {
    padding: 16,
    paddingBottom: 20,
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
  userCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
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
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  cardInfo: {
    marginBottom: 16,
  },
  cardInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  denyButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
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
    width: Platform.OS === 'web' ? 500 : '90%',
    maxWidth: Platform.OS === 'web' ? '90%' : 400,
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
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  adminToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 24,
  },
  adminToggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  adminToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  adminToggleDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
  modalButtonApprove: {
    backgroundColor: Colors.success,
  },
  modalButtonTextCancel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextApprove: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
})
