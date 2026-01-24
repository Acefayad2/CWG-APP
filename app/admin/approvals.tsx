import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, StyleSheet, Modal, Switch, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { usePendingUsers, useAllUsers, useApproveUser, useDenyUser, useUpdateUserStatus, PendingUser, AllUser } from '@/lib/queries/auth'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'

export default function AdminApprovalsScreen() {
  const router = useRouter()
  const { data: session, isLoading: sessionLoading } = useSession()
  const { data: pendingUsers, isLoading: pendingLoading, refetch: refetchPending, isRefetching: isRefetchingPending } = usePendingUsers()
  const { data: allUsers, isLoading: allLoading, refetch: refetchAll, isRefetching: isRefetchingAll } = useAllUsers()
  const approveUser = useApproveUser()
  const denyUser = useDenyUser()
  const updateUserStatus = useUpdateUserStatus()

  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<PendingUser | AllUser | null>(null)
  const [makeAdmin, setMakeAdmin] = useState(false)
  const [editApprovalStatus, setEditApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('approved')
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user')

  const handleApprove = (user: PendingUser | AllUser) => {
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
      refetchPending()
      refetchAll()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  const handleDeny = (userId: string, userName: string, currentStatus?: string) => {
    console.log('Deny/Reject button clicked for user:', userId, 'Current status:', currentStatus)
    const isApproved = currentStatus === 'approved'
    const actionText = isApproved ? 'Reject' : 'Deny'
    const message = isApproved 
      ? `Are you sure you want to reject ${userName}? They will lose access to the app.`
      : `Are you sure you want to deny ${userName}? They will not be able to access the app.`
    
    Alert.alert(
      `${actionText} User`,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`${actionText}ing user:`, userId)
              await denyUser.mutateAsync(userId)
              console.log(`User ${actionText.toLowerCase()}ed successfully`)
              refetchPending()
              refetchAll()
              Alert.alert('Success', `User has been ${actionText.toLowerCase()}ed successfully`)
            } catch (error: any) {
              console.error(`${actionText} error:`, error)
              Alert.alert('Error', error.message || `Failed to ${actionText.toLowerCase()} user`)
            }
          },
        },
      ]
    )
  }

  const handleEditUser = (user: AllUser) => {
    setSelectedUser(user)
    setEditApprovalStatus(user.approval_status)
    setEditRole(user.role || 'user')
    setShowEditModal(true)
  }

  const confirmEditUser = async () => {
    if (!selectedUser) return
    
    try {
      const result = await updateUserStatus.mutateAsync({
        userId: selectedUser.id,
        approval_status: editApprovalStatus,
        role: editRole,
      })
      
      setShowEditModal(false)
      setSelectedUser(null)
      
      // If user was rejected (deleted), show different message
      if (editApprovalStatus === 'rejected' || (result as any)?.deleted) {
        Alert.alert('Success', 'User has been rejected and all their data has been removed from the system')
      } else {
        Alert.alert('Success', 'User status updated successfully')
      }
      
      refetchPending()
      refetchAll()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update user status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return Colors.success
      case 'pending':
        return '#FFA500'
      case 'rejected':
        return Colors.error
      default:
        return Colors.textSecondary
    }
  }

  const currentUsers = activeTab === 'pending' ? pendingUsers : allUsers
  const isLoading = activeTab === 'pending' ? pendingLoading : allLoading
  const isRefetching = activeTab === 'pending' ? isRefetchingPending : isRefetchingAll
  const refetch = activeTab === 'pending' ? refetchPending : refetchAll

  // Show loading while checking authentication
  if (sessionLoading) {
    return (
      <View style={[CommonStyles.centered, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  // Redirect if not authenticated (handled by useEffect, but show loading during redirect)
  if (!session?.user?.id) {
    return (
      <View style={[CommonStyles.centered, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
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
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>
          {activeTab === 'pending' ? 'Review and approve new user signups' : 'Manage all users'}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingUsers?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Users ({allUsers?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentUsers || []}
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
            <Text style={styles.emptyText}>
              {activeTab === 'pending' ? 'No pending users' : 'No users found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'pending' ? 'All users have been reviewed' : 'Users will appear here once they sign up'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <UserCard 
            user={item}
            onApprove={() => handleApprove(item)}
            onDeny={() => handleDeny(item.id, item.full_name || 'User', item.approval_status)}
            onEdit={activeTab === 'all' ? () => handleEditUser(item as AllUser) : undefined}
            isLoading={approveUser.isPending || denyUser.isPending || updateUserStatus.isPending}
            showEdit={activeTab === 'all'}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Approve Modal with Admin Option */}
      <Modal
        visible={showApproveModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowApproveModal(false)
          setSelectedUser(null)
          setMakeAdmin(false)
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowApproveModal(false)
            setSelectedUser(null)
            setMakeAdmin(false)
          }}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowEditModal(false)
          setSelectedUser(null)
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Edit User Status</Text>
            
            <Text style={styles.modalText}>
              Edit status for {selectedUser?.full_name || 'this user'}
            </Text>

            {/* Approval Status Selection */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Approval Status</Text>
              <View style={styles.statusButtons}>
                {(['pending', 'approved', 'rejected'] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      editApprovalStatus === status && styles.statusButtonActive,
                      { borderColor: getStatusColor(status) }
                    ]}
                    onPress={() => setEditApprovalStatus(status)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      editApprovalStatus === status && styles.statusButtonTextActive
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Role Toggle */}
            <View style={styles.adminToggleContainer}>
              <View style={styles.adminToggleTextContainer}>
                <Text style={styles.adminToggleLabel}>Admin Role</Text>
                <Text style={styles.adminToggleDescription}>
                  Grant or revoke admin privileges for this user.
                </Text>
              </View>
              <Switch
                value={editRole === 'admin'}
                onValueChange={(value) => setEditRole(value ? 'admin' : 'user')}
                trackColor={{ false: Colors.borderLight, true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowEditModal(false)
                  setSelectedUser(null)
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonApprove]}
                onPress={confirmEditUser}
                disabled={updateUserStatus.isPending}
                activeOpacity={0.8}
              >
                {updateUserStatus.isPending ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.modalButtonTextApprove}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

function UserCard({ user, onApprove, onDeny, onEdit, isLoading, showEdit }: { 
  user: PendingUser | AllUser
  onApprove: (user: PendingUser | AllUser) => void
  onDeny: () => void
  onEdit?: () => void
  isLoading: boolean
  showEdit?: boolean
}) {
  const createdDate = new Date(user.created_at).toLocaleDateString()
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return Colors.success
      case 'pending':
        return '#FFA500'
      case 'rejected':
        return Colors.error
      default:
        return Colors.textSecondary
    }
  }
  
  const denyButtonText = user.approval_status === 'approved' ? 'Reject' : 'Deny'
  
  return (
    <View style={CommonStyles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{user.full_name || 'No Name'}</Text>
          {showEdit && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.approval_status) }]}>
              <Text style={styles.statusBadgeText}>
                {user.approval_status.charAt(0).toUpperCase() + user.approval_status.slice(1)}
              </Text>
            </View>
          )}
        </View>
        {showEdit && (user as AllUser).role === 'admin' && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
      </View>
      
      <View style={styles.cardInfo}>
        <Text style={styles.cardInfoText}>Created: {createdDate}</Text>
        {user.email && (
          <Text style={styles.cardInfoText}>Email: {user.email}</Text>
        )}
      </View>

      <View style={styles.cardActions}>
        {showEdit ? (
          // All users in "All Users" tab: Only Edit button
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton, isLoading && styles.actionButtonDisabled]}
            onPress={onEdit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <Text style={styles.actionButtonText}>Edit</Text>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton, isLoading && styles.actionButtonDisabled]}
              onPress={() => onApprove(user)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Approve</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.denyButton, isLoading && styles.actionButtonDisabled]}
              onPress={onDeny}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <Text style={styles.actionButtonText}>{denyButtonText}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
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
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  adminBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  adminBadgeText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
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
    flexWrap: 'wrap',
    gap: 8,
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
  editButton: {
    backgroundColor: Colors.primary,
  },
  removeButton: {
    backgroundColor: '#8B0000', // Dark red for permanent removal
  },
  actionButtonDisabled: {
    opacity: 0.5,
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
  editSection: {
    marginBottom: 24,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  statusButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusButtonTextActive: {
    color: Colors.text,
  },
})
