import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { Resource, ResourceInsert, ResourceUpdate, ResourceWithFavorite } from '@/types'

export function useResources(userId?: string) {
  return useQuery({
    queryKey: ['resources', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*, resources_favorites!left(user_id)')
        .order('created_at', { ascending: false })

      if (error) throw error

      const resourcesWithUrls = await Promise.all(
        (data as any[]).map(async (resource) => {
          const { data: urlData } = await supabase.storage
            .from('resources')
            .createSignedUrl(resource.storage_path, 3600)

          return {
            ...resource,
            is_favorite: resource.resources_favorites?.some((f: any) => f.user_id === userId),
            url: urlData?.signedUrl,
          }
        })
      )

      return resourcesWithUrls as ResourceWithFavorite[]
    },
    // Always enabled - allow unauthenticated access
  })
}

export function useResource(id: string, userId?: string) {
  return useQuery({
    queryKey: ['resource', id, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*, resources_favorites!left(user_id)')
        .eq('id', id)
        .single()

      if (error) throw error

      const { data: urlData } = await supabase.storage
        .from('resources')
        .createSignedUrl(data.storage_path, 3600)

      const resource = data as any
      return {
        ...resource,
        is_favorite: resource.resources_favorites?.some((f: any) => f.user_id === userId),
        url: urlData?.signedUrl,
      } as ResourceWithFavorite
    },
    enabled: !!id,
    // Allow unauthenticated access
  })
}

export function useCreateResource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ resource, file }: { resource: ResourceInsert; file: { uri: string; type: string; name: string } }) => {
      // Upload file
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = fileName

      // Read file using fetch (React Native compatible)
      const response = await fetch(file.uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, blob, {
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      // Create resource record
      const { data, error } = await supabase
        .from('resources')
        .insert({ ...resource, storage_path: filePath })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
    },
  })
}

export function useDeleteResource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      // Delete file
      const { error: storageError } = await supabase.storage
        .from('resources')
        .remove([storagePath])
      if (storageError) throw storageError

      // Delete record
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
    },
  })
}

export function useToggleResourceFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ resourceId, userId, isFavorite }: { resourceId: string; userId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        const { error } = await supabase
          .from('resources_favorites')
          .delete()
          .eq('resource_id', resourceId)
          .eq('user_id', userId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('resources_favorites')
          .insert({ resource_id: resourceId, user_id: userId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      queryClient.invalidateQueries({ queryKey: ['resource'] })
    },
  })
}
