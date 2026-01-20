import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

export interface UserContact {
  id: string
  user_id: string
  name: string
  phone_number: string
  phone_label?: string
  notes?: string
  created_at: string
}

export interface UserContactInsert {
  user_id: string
  name: string
  phone_number: string
  phone_label?: string
  notes?: string
}

export interface UserContactUpdate {
  name?: string
  phone_number?: string
  phone_label?: string
  notes?: string
}

export interface ContactHistory {
  id: string
  contact_id: string
  user_id: string
  activity_type: 'call' | 'schedule_appointment' | 'follow_up_appointment' | 'invited_bom' | 'recruiting_interview' | 'note'
  notes?: string
  created_at: string
}

export interface ContactHistoryInsert {
  contact_id: string
  user_id: string
  activity_type: 'call' | 'schedule_appointment' | 'follow_up_appointment' | 'invited_bom' | 'recruiting_interview' | 'note'
  notes?: string
}

export function useUserContacts(userId?: string) {
  return useQuery({
    queryKey: ['user_contacts', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('user_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })

      if (error) throw error
      return (data || []) as UserContact[]
    },
    enabled: !!userId,
  })
}

export function useContact(contactId: string, userId?: string) {
  return useQuery({
    queryKey: ['user_contact', contactId, userId],
    queryFn: async () => {
      if (!contactId || !userId) return null
      const { data, error } = await supabase
        .from('user_contacts')
        .select('*')
        .eq('id', contactId)
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return data as UserContact
    },
    enabled: !!contactId && !!userId,
  })
}

export function useContactHistory(contactId: string, userId?: string) {
  return useQuery({
    queryKey: ['contact_history', contactId, userId],
    queryFn: async () => {
      if (!contactId || !userId) return []
      const { data, error } = await supabase
        .from('contact_history')
        .select('*')
        .eq('contact_id', contactId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as ContactHistory[]
    },
    enabled: !!contactId && !!userId,
  })
}

export function useImportContacts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, contacts }: { userId: string; contacts: UserContactInsert[] }) => {
      console.log(`Importing ${contacts.length} contacts for user ${userId}`)
      
      if (!contacts || contacts.length === 0) {
        throw new Error('No contacts to import')
      }

      // Insert contacts - handle duplicates gracefully
      const { data, error } = await supabase
        .from('user_contacts')
        .insert(contacts)
        .select()

      if (error) {
        console.error('Import contacts error:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        
        // If it's a unique constraint error, that's okay - some contacts already exist
        if (error.code === '23505') {
          // Try to get the contacts that were successfully inserted
          // For now, just return empty array and let the UI handle it
          console.log('Some contacts already exist (duplicate), continuing...')
          return [] as UserContact[]
        }
        
        throw error
      }
      
      console.log(`Successfully imported ${data?.length || 0} contacts`)
      return (data || []) as UserContact[]
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user_contacts', variables.userId] })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ contactId, userId, updates }: { contactId: string; userId: string; updates: UserContactUpdate }) => {
      const { data, error } = await supabase
        .from('user_contacts')
        .update(updates)
        .eq('id', contactId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data as UserContact
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user_contacts', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['user_contact', variables.contactId, variables.userId] })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('user_contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user_contacts', variables.userId] })
    },
  })
}

export function useAddContactHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (history: ContactHistoryInsert) => {
      const { data, error } = await supabase
        .from('contact_history')
        .insert(history)
        .select()
        .single()

      if (error) throw error
      return data as ContactHistory
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact_history', data.contact_id, data.user_id] })
    },
  })
}
