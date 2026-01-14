import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { Script, ScriptInsert, ScriptUpdate, ScriptWithFavorite } from '@/types'

export function useScripts(userId?: string) {
  return useQuery({
    queryKey: ['scripts', userId],
    queryFn: async () => {
      // Fetch admin scripts and user's own scripts if authenticated
      let query = supabase
        .from('scripts')
        .select('*, script_favorites!left(user_id)')
      
      if (userId) {
        query = query.or(`is_admin.eq.true,created_by.eq.${userId}`)
      } else {
        query = query.eq('is_admin', true)
      }
      
      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      return (data as any[]).map((script) => ({
        ...script,
        is_favorite: script.script_favorites?.some((f: any) => f.user_id === userId),
      })) as ScriptWithFavorite[]
    },
    // Always enabled - queries will handle auth via RLS
  })
}

export function useScript(id: string, userId?: string) {
  return useQuery({
    queryKey: ['script', id, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scripts')
        .select('*, script_favorites!left(user_id)')
        .eq('id', id)
        .single()

      if (error) throw error

      const script = data as any
      return {
        ...script,
        is_favorite: script.script_favorites?.some((f: any) => f.user_id === userId),
      } as ScriptWithFavorite
    },
    enabled: !!id,
    // Allow unauthenticated access
  })
}

export function useCreateScript() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (script: ScriptInsert) => {
      const { data, error } = await supabase
        .from('scripts')
        .insert(script)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
    },
  })
}

export function useUpdateScript() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ScriptUpdate }) => {
      const { data, error } = await supabase
        .from('scripts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['script', variables.id] })
    },
  })
}

export function useDeleteScript() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scripts')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
    },
  })
}

export function useToggleScriptFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ scriptId, userId, isFavorite }: { scriptId: string; userId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        const { error } = await supabase
          .from('script_favorites')
          .delete()
          .eq('script_id', scriptId)
          .eq('user_id', userId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('script_favorites')
          .insert({ script_id: scriptId, user_id: userId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['script'] })
    },
  })
}
