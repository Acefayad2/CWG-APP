import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { Script, ScriptInsert, ScriptUpdate, ScriptWithFavorite } from '@/types'

export function useScripts(userId?: string) {
  return useQuery({
    queryKey: ['scripts', userId],
    queryFn: async () => {
      // Fetch admin scripts (is_admin = true) and user's own scripts if authenticated
      // We need to get both admin scripts and user's scripts separately, then combine
      
      let adminScripts: any[] = []
      let userScripts: any[] = []
      
      // Always get admin scripts (visible to all)
      const { data: adminData, error: adminError } = await supabase
        .from('scripts')
        .select('*, script_favorites!left(user_id)')
        .eq('is_admin', true)
        .order('created_at', { ascending: false })
      
      if (adminError) {
        console.error('Admin scripts query error:', adminError)
      } else {
        adminScripts = adminData || []
      }
      
      // Get user's own scripts if userId provided
      if (userId) {
        const { data: userData, error: userError } = await supabase
          .from('scripts')
          .select('*, script_favorites!left(user_id)')
          .eq('created_by', userId)
          .eq('is_admin', false)
          .order('created_at', { ascending: false })
        
        if (userError) {
          console.error('User scripts query error:', userError)
        } else {
          userScripts = userData || []
        }
      }
      
      // Combine and deduplicate by id
      const allScripts = [...adminScripts, ...userScripts]
      const uniqueScripts = Array.from(
        new Map(allScripts.map((script: any) => [script.id, script])).values()
      )
      
      const scripts = uniqueScripts.map((script: any) => ({
        ...script,
        is_favorite: script.script_favorites?.some((f: any) => f.user_id === userId),
      })) as ScriptWithFavorite[]
      
      console.log('Scripts loaded:', scripts.length, 'admin scripts:', scripts.filter(s => s.is_admin).length, 'user scripts:', scripts.filter(s => !s.is_admin).length)
      return scripts
    },
    enabled: true, // Always enabled - queries will handle auth via RLS
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
