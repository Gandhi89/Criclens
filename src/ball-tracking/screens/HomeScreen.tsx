import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalibrateForm } from '../components/CalibrateForm';

type HomeScreenProps = {
  onStartTracking: () => void;
};

export function HomeScreen({ onStartTracking }: HomeScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    try {
      const { Camera } = await import('react-native-vision-camera');
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Camera access',
          'Camera permission is required to track the ball. Please enable it in Settings.',
          [{ text: 'OK' }],
        );
        return false;
      }
      return true;
    } catch {
      setHasPermission(false);
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { Camera } = await import('react-native-vision-camera');
        const status = await Camera.getCameraPermissionStatus();
        setHasPermission(status === 'granted');
      } catch {
        setHasPermission(false);
      }
    })();
  }, []);

  const handleStartTracking = async () => {
    if (hasPermission) {
      onStartTracking();
      return;
    }
    const granted = await requestCameraPermission();
    if (granted) onStartTracking();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>Criclens</Text>
      <Text style={styles.subtitle}>Set calibration, then start tracking to see ball speed.</Text>
      <CalibrateForm />
      <TouchableOpacity
        style={[styles.button, (!hasPermission && hasPermission !== null) && styles.buttonDisabled]}
        onPress={handleStartTracking}
        disabled={isRequesting}
      >
        {isRequesting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Start tracking</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
