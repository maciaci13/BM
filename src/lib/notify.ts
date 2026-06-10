import { Alert, Platform } from 'react-native';

// React Native's Alert is a no-op on web, which silently swallows errors.
// This helper falls back to window.alert in the browser so messages are visible.
export function notify(message: string, title = '') {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(title ? `${title}\n\n${message}` : message);
    return;
  }
  Alert.alert(title, message);
}
