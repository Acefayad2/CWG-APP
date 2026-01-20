import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/queries/auth'
import { useProfile, useUpdateProfile } from '@/lib/queries/auth'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { CommonStyles } from '@/constants/Styles'

export default function ProfileScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session, isLoading: sessionLoading } = useSession()
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile(session?.user?.id)
  const updateProfile = useUpdateProfile()
  
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Force refetch profile when component mounts and session is available
  useEffect(() => {
    if (session?.user?.id && !profileLoading) {
      // Try direct fetch first, then refetch query
      const fetchProfileDirectly = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (error) {
            console.error('Direct profile fetch error:', error)
          } else {
            console.log('Direct profile fetch success:', data)
            // Update cache with direct fetch result
            queryClient.setQueryData(['profile', session.user.id], data)
          }
        } catch (err) {
          console.error('Direct profile fetch exception:', err)
        }
        
        // Also try refetch
        refetchProfile().catch(err => {
          console.error('Profile refetch error:', err)
        })
      }
      
      fetchProfileDirectly()
    }
  }, [session?.user?.id])

  // Log profile data for debugging
  useEffect(() => {
    if (profile) {
      console.log('Profile loaded:', { full_name: profile.full_name, role: profile.role, id: profile.id })
    }
    if (profileError) {
      console.error('Profile error:', profileError)
    }
    if (!profile && !profileLoading && session?.user?.id) {
      console.warn('Profile is null but session exists:', session.user.id)
    }
  }, [profile, profileError, profileLoading, session?.user?.id])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    
    try {
      // Sign out from Supabase first
      await supabase.auth.signOut()
      
      // Clear all cached queries
      queryClient.clear()
      queryClient.setQueryData(['session'], null)
      queryClient.setQueryData(['profile'], null)
      queryClient.setQueryData(['pending_users'], null)
      
      // Navigate to login
      router.dismissAll()
      router.replace('/(auth)/login')
    } catch (error) {
      console.error('Sign out error:', error)
      // Even on error, clear everything and navigate
      queryClient.clear()
      queryClient.setQueryData(['session'], null)
      router.dismissAll()
      router.replace('/(auth)/login')
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleEditProfile = () => {
    setEditName(profile?.full_name || '')
    setShowEditModal(true)
  }

  const handleSaveProfile = async () => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'Session not available')
      return
    }

    const trimmedName = editName.trim()
    if (!trimmedName) {
      Alert.alert('Error', 'Name cannot be empty')
      return
    }

    try {
      const updated = await updateProfile.mutateAsync({
        userId: session.user.id,
        updates: {
          full_name: trimmedName,
        },
      })
      
      console.log('Profile updated:', updated)
      
      // Force refetch to ensure UI updates
      await refetchProfile()
      
      setShowEditModal(false)
      Alert.alert('Success', 'Profile updated successfully')
    } catch (error: any) {
      console.error('Update profile error:', error)
      Alert.alert('Error', error.message || 'Failed to update profile')
    }
  }

  if (sessionLoading || profileLoading) {
    return (
      <View style={[CommonStyles.centered, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  // Show error if profile failed to load
  if (profileError) {
    // Extract error message properly
    let errorMessage = 'Unknown error'
    if (profileError instanceof Error) {
      errorMessage = profileError.message
    } else if (typeof profileError === 'object' && profileError !== null) {
      // Handle Supabase error objects
      if ('message' in profileError) {
        errorMessage = String(profileError.message)
      } else if ('code' in profileError) {
        errorMessage = `Error code: ${profileError.code}`
      } else {
        errorMessage = JSON.stringify(profileError)
      }
    } else {
      errorMessage = String(profileError)
    }

    return (
      <View style={[CommonStyles.centered, { backgroundColor: Colors.background, padding: 20 }]}>
        <Text style={{ color: Colors.error, marginBottom: 10, textAlign: 'center', fontSize: 16, fontWeight: '600' }}>
          Failed to load profile
        </Text>
        <Text style={{ color: Colors.textSecondary, marginBottom: 20, fontSize: 12, textAlign: 'center' }}>
          {errorMessage}
        </Text>
        <TouchableOpacity
          style={[CommonStyles.button, CommonStyles.buttonPrimary, { marginBottom: 10 }]}
          onPress={async () => {
            try {
              await refetchProfile()
            } catch (err) {
              console.error('Retry failed:', err)
            }
          }}
        >
          <Text style={CommonStyles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.full_name || 'U')[0].toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.email}>{session?.user?.email}</Text>
          <View style={[styles.roleBadge, isAdmin && styles.roleBadgeAdmin]}>
            <Text style={[styles.roleText, isAdmin && styles.roleTextAdmin]}>
              {profile?.role?.toUpperCase() || 'USER'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
            activeOpacity={0.8}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Tools</Text>
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/admin/scripts')}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Manage Scripts</Text>
                  <Text style={styles.menuItemSubtitle}>Create and manage admin scripts</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/admin/resources')}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Upload Resources</Text>
                  <Text style={styles.menuItemSubtitle}>Upload images, videos, and PDFs</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/admin/approvals')}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>User Approvals</Text>
                  <Text style={styles.menuItemSubtitle}>Review and approve new user signups</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={[styles.menuItem, isSigningOut && styles.menuItemDisabled]}
              onPress={handleSignOut}
              activeOpacity={0.7}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <ActivityIndicator color={Colors.error} size="small" />
              ) : (
                <Text style={styles.signOutText}>Sign Out</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textLight}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSaveProfile}
                  disabled={updateProfile.isPending}
                  activeOpacity={0.8}
                >
                  {updateProfile.isPending ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.modalButtonTextSave}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.borderLight,
    marginBottom: 16,
  },
  roleBadgeAdmin: {
    backgroundColor: Colors.primaryLight + '30',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  roleTextAdmin: {
    color: Colors.primary,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  editButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 60,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  menuArrow: {
    fontSize: 24,
    color: Colors.textLight,
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
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
    maxWidth: Platform.OS === 'web' ? '90%' : 400,
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
  modalButtonSave: {
    backgroundColor: Colors.primary,
  },
  modalButtonTextCancel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
})
