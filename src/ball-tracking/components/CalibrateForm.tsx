import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CALIBRATION_KEY = '@criclens/calibration';

export interface CalibrationState {
  distanceToCreaseM: string;
  manualMetersPerPixel: string;
}

const defaultState: CalibrationState = {
  distanceToCreaseM: '20',
  manualMetersPerPixel: '',
};

export function getMetersPerPixelFromCalibration(
  distanceM: number,
  frameWidthPx: number,
  horizontalFovRad: number,
): number {
  if (distanceM <= 0 || frameWidthPx <= 0) return 0;
  return (2 * distanceM * Math.tan(horizontalFovRad / 2)) / frameWidthPx;
}

export async function loadCalibration(): Promise<CalibrationState> {
  try {
    const raw = await AsyncStorage.getItem(CALIBRATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CalibrationState;
      return {
        distanceToCreaseM: String(parsed.distanceToCreaseM ?? defaultState.distanceToCreaseM),
        manualMetersPerPixel: String(parsed.manualMetersPerPixel ?? ''),
      };
    }
  } catch (_) {}
  return defaultState;
}

export async function saveCalibration(state: CalibrationState): Promise<void> {
  try {
    await AsyncStorage.setItem(CALIBRATION_KEY, JSON.stringify(state));
  } catch (_) {}
}

export function CalibrateForm(): React.JSX.Element {
  const [distanceToCreaseM, setDistanceToCreaseM] = useState(defaultState.distanceToCreaseM);
  const [manualMetersPerPixel, setManualMetersPerPixel] = useState(defaultState.manualMetersPerPixel);

  useEffect(() => {
    loadCalibration().then(set => {
      setDistanceToCreaseM(set.distanceToCreaseM);
      setManualMetersPerPixel(set.manualMetersPerPixel);
    });
  }, []);

  const persist = useCallback((next: CalibrationState) => {
    saveCalibration(next);
  }, []);

  const handleDistanceChange = (text: string) => {
    setDistanceToCreaseM(text);
    persist({ distanceToCreaseM: text, manualMetersPerPixel });
  };

  const handleManualChange = (text: string) => {
    setManualMetersPerPixel(text);
    persist({ distanceToCreaseM, manualMetersPerPixel: text });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Distance to crease (m)</Text>
      <TextInput
        style={styles.input}
        value={distanceToCreaseM}
        onChangeText={handleDistanceChange}
        keyboardType="decimal-pad"
        placeholder="e.g. 20"
        placeholderTextColor="#999"
      />
      <Text style={[styles.label, styles.labelTop]}>Or manual: meters per pixel (optional)</Text>
      <TextInput
        style={styles.input}
        value={manualMetersPerPixel}
        onChangeText={handleManualChange}
        keyboardType="decimal-pad"
        placeholder="e.g. 0.02"
        placeholderTextColor="#999"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  labelTop: {
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
  },
});
