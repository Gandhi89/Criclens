import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Worklets } from 'react-native-worklets-core';
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useObjectDetector } from 'vision-camera-plugin-object-detector';
import {
  getMetersPerPixelFromCalibration,
  loadCalibration,
} from '../components/CalibrateForm';

const DEFAULT_H_FOV_RAD = (60 * Math.PI) / 180;
const MAX_POSITIONS = 15;
const MIN_DELTA_MS = 16;

type Position = { x: number; y: number; t: number };

type BallTrackingScreenProps = {
  onBack: () => void;
};

export function BallTrackingScreen({ onBack }: BallTrackingScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const device = useCameraDevice('back');
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [metersPerPixel, setMetersPerPixel] = useState<number>(0);
  const metersPerPixelRef = useRef<number>(0);
  const positionsRef = useRef<Position[]>([]);
  const frameSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const calibrationLoadedRef = useRef(false);

  const { detectObjects } = useObjectDetector({
    enableClassification: true,
    enableMultipleObjects: true,
  });

  useEffect(() => {
    if (calibrationLoadedRef.current) return;
    calibrationLoadedRef.current = true;
    loadCalibration().then(cal => {
      const manual = parseFloat(cal.manualMetersPerPixel);
      if (Number.isFinite(manual) && manual > 0) {
        setMetersPerPixel(manual);
        metersPerPixelRef.current = manual;
      }
    });
  }, []);

  const onDetected = useCallback(
    (objects: Array<{ bounds: { x: number; y: number; width: number; height: number } }>, frameWidth: number, frameHeight: number) => {
      if (objects.length === 0) return;
      const first = objects[0];
      const centerX = first.bounds.x + first.bounds.width / 2;
      const centerY = first.bounds.y + first.bounds.height / 2;
      const t = Date.now();

      if (frameWidth > 0 && frameHeight > 0) {
        frameSizeRef.current = { width: frameWidth, height: frameHeight };
        if (metersPerPixelRef.current === 0) {
          loadCalibration().then(cal => {
            const dist = parseFloat(cal.distanceToCreaseM);
            if (Number.isFinite(dist) && dist > 0) {
              const mpx = getMetersPerPixelFromCalibration(dist, frameWidth, DEFAULT_H_FOV_RAD);
              setMetersPerPixel(mpx);
              metersPerPixelRef.current = mpx;
            }
          });
        }
      }

      const positions = positionsRef.current;
      positions.push({ x: centerX, y: centerY, t });
      if (positions.length > MAX_POSITIONS) positions.shift();

      if (positions.length >= 2) {
        const a = positions[positions.length - 2];
        const b = positions[positions.length - 1];
        const dtMs = b.t - a.t;
        if (dtMs >= MIN_DELTA_MS) {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distPx = Math.sqrt(dx * dx + dy * dy);
          const speedPxPerSec = (distPx / dtMs) * 1000;
          const mpx = metersPerPixelRef.current || 0;
          if (mpx > 0) {
            const speedMs = speedPxPerSec * mpx;
            const kmh = speedMs * 3.6;
            setSpeedKmh(Math.round(kmh * 10) / 10);
          } else {
            setSpeedKmh(null);
          }
        }
      }
    },
    [],
  );

  const onDetectedWorklet = Worklets.createRunOnJS(onDetected);

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      const objs = detectObjects(frame);
      const width = frame.width;
      const height = frame.height;
      const bounds = objs.map((o: { bounds: { x: number; y: number; width: number; height: number } }) => ({ bounds: o.bounds }));
      onDetectedWorklet(bounds, width, height);
    },
    [detectObjects, onDetectedWorklet],
  );

  if (device == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No camera device</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.speedContainer}>
          <Text style={styles.speedLabel}>Speed</Text>
          <Text style={styles.speedValue}>
            {speedKmh != null ? `${speedKmh} km/h` : '--'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  speedContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
  },
  speedLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  speedValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
});
