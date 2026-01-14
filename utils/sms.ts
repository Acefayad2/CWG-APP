import * as Linking from 'expo-linking'
import * as SMS from 'expo-sms'
import * as Clipboard from 'expo-clipboard'
import { Alert } from 'react-native'

export interface Contact {
  id: string
  name: string
  phoneNumbers?: Array<{ number: string; label: string }>
}

/**
 * Replaces name placeholders in script text with the contact's name
 * Supports: {{name}}, [Name], {name}, <name>, [name], <Name>, ___
 */
export function personalizeScript(scriptText: string, contactName: string): string {
  let personalizedText = scriptText
  
  // Replace various placeholder formats with the contact's name
  const placeholders = [
    /{{name}}/gi,
    /\[Name\]/g,
    /\[name\]/g,
    /{name}/gi,
    /<name>/gi,
    /<Name>/g,
    /___+/g, // Match one or more underscores (e.g., ___, ____, etc.)
  ]
  
  placeholders.forEach(placeholder => {
    personalizedText = personalizedText.replace(placeholder, contactName)
  })
  
  return personalizedText
}

export async function sendScriptToContacts(scriptText: string, contacts: Contact[]) {
  const phoneNumbers = contacts
    .flatMap(contact => contact.phoneNumbers || [])
    .map(pn => pn.number)
    .filter(Boolean)

  if (phoneNumbers.length === 0) {
    Alert.alert('Error', 'No valid phone numbers found')
    return
  }

  // Personalize script with the first contact's name (since SMS typically goes to one recipient)
  const firstContactName = contacts[0]?.name || 'there'
  const personalizedScript = personalizeScript(scriptText, firstContactName)

  try {
    // Try using expo-sms first
    const isAvailable = await SMS.isAvailableAsync()
    
    if (isAvailable && phoneNumbers.length === 1) {
      // Single recipient - use SMS API
      await SMS.sendSMSAsync(phoneNumbers, personalizedScript)
    } else if (isAvailable && phoneNumbers.length > 1) {
      // Multiple recipients - iOS limitation, try to open composer
      // On iOS, SMS API only supports one recipient at a time
      const url = `sms:${phoneNumbers[0]}?body=${encodeURIComponent(personalizedScript)}`
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
        // Copy remaining numbers to clipboard for manual entry
        if (phoneNumbers.length > 1) {
          await Clipboard.setStringAsync(phoneNumbers.slice(1).join(', '))
          Alert.alert(
            'Multiple Recipients',
            `Opened SMS composer for first contact. Additional phone numbers copied to clipboard: ${phoneNumbers.slice(1).join(', ')}`
          )
        }
      }
    } else {
      // Fallback: copy to clipboard and open SMS app
      await Clipboard.setStringAsync(personalizedScript)
      const url = `sms:${phoneNumbers[0]}`
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
        Alert.alert(
          'SMS Composer Opened',
          'Script text has been copied to clipboard. Paste it into the message field.'
        )
      } else {
        Alert.alert('Error', 'SMS is not available on this device')
      }
    }
  } catch (error) {
    console.error('Error sending SMS:', error)
    // Fallback: copy to clipboard
    await Clipboard.setStringAsync(personalizedScript)
    Alert.alert(
      'SMS Composer',
      'Script text copied to clipboard. Please paste it into your SMS app.',
      [{ text: 'OK' }]
    )
  }
}
