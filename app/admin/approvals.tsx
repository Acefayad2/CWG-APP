import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { usePendingUsers, useApproveUser, useDenyUser, PendingUser } from '@/lib/queries/auth'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'

export default function AdminApprovalsScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: pendingUsers, isLoading, refetch, isRefetching } = usePendingUsers()
  const approveUser = useApproveUser()
  const denyUser = useDenyUser()

  const handleApprove = (userId: string, userName: string) => {
    Alert.alert(
      'Approve User',
      `Are you sure you want to approve ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              await approveUser.mutateAsync(userId)
              refetch()
            } catch (error: any) {
              Alert.alert('Error', error.message)
            }
          },
        },
      ]
    )
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
            onApprove={() => handleApprove(item.id, item.full_name || 'User')}
            onDeny={() => handleDeny(item.id, item.full_name || 'User')}
            isLoading={approveUser.isPending || denyUser.isPending}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

function UserCard({ user, onApprove, onDeny, isLoading }: { 
  user: PendingUser
  onApprove: () => void
  onDeny: () => void
  isLoading: boolean
}) {
  const createdDate = new Date(user.created_at).toLocaleDateString()
  
  return (
    <View style={CommonStyles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{user.full_name || 'No Name'}</Text>
        </View>
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
          onPress={onApprove}
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
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
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
})
