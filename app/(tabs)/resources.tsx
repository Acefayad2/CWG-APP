import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/queries/auth'
import { useResources } from '@/lib/queries/resources'
import { ResourceWithFavorite } from '@/types'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'

export default function ResourcesScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: resources, isLoading, refetch, isRefetching } = useResources(session?.user?.id)

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
        <Text style={styles.headerTitle}>Resources</Text>
        <Text style={styles.headerSubtitle}>Browse available resources</Text>
      </View>

      <FlatList
          data={resources || []}
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
              <Text style={styles.emptyText}>No resources available</Text>
              <Text style={styles.emptySubtext}>Resources will be added by administrators</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ResourceCard resource={item} onPress={() => router.push(`/resource/${item.id}`)} />
          )}
          showsVerticalScrollIndicator={false}
        />
    </View>
  )
}

function ResourceCard({ resource, onPress }: { resource: ResourceWithFavorite; onPress: () => void }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'pdf': return '📄'
      default: return '📎'
    }
  }

  return (
    <TouchableOpacity
      style={CommonStyles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.resourceHeader}>
        <View style={styles.resourceIcon}>
          <Text style={styles.iconText}>{getTypeIcon(resource.type)}</Text>
        </View>
        <View style={styles.resourceContent}>
          <Text style={styles.resourceTitle} numberOfLines={2}>{resource.title}</Text>
          <View style={styles.resourceMeta}>
            <Text style={styles.resourceType}>{resource.type.toUpperCase()}</Text>
            {resource.is_favorite && <Text style={styles.favoriteIcon}>★</Text>}
          </View>
        </View>
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
    textAlign: 'center',
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  resourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceType: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoriteIcon: {
    fontSize: 16,
    color: Colors.warning,
    marginLeft: 8,
  },
})
