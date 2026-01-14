import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { useScripts, useDeleteScript } from '@/lib/queries/scripts'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'
import { ScriptWithFavorite } from '@/types'

export default function AdminScriptsScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: scripts, isLoading, refetch, isRefetching } = useScripts(session?.user?.id)
  const deleteScript = useDeleteScript()

  const adminScripts = scripts?.filter(s => s.created_by === session?.user?.id) || []

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Script',
      'Are you sure you want to delete this script?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScript.mutateAsync(id)
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
        <Text style={styles.headerTitle}>Admin Scripts</Text>
        <Text style={styles.headerSubtitle}>Manage your scripts</Text>
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[CommonStyles.button, CommonStyles.buttonPrimary]}
          onPress={() => router.push('/(tabs)/scripts')}
          activeOpacity={0.8}
        >
          <Text style={CommonStyles.buttonText}>+ Create Script</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={adminScripts}
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
          <ScriptCard 
            script={item} 
            onPress={() => router.push(`/script/${item.id}`)}
            onEdit={() => router.push(`/script/edit/${item.id}`)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

function ScriptCard({ script, onPress, onEdit, onDelete }: { script: ScriptWithFavorite; onPress: () => void; onEdit: () => void; onDelete: () => void }) {
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
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
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
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: Colors.border,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
})
