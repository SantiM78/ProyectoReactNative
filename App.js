import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const STORAGE_KEY = '@bitacora_sensorial/entries';
const ALBUM_DIR = `${FileSystem.documentDirectory}bitacora-sensorial/`;

const moodOptions = [
  { label: 'Enfoque', color: '#31a36b' },
  { label: 'Energia', color: '#f59e0b' },
  { label: 'Calma', color: '#2563eb' },
];

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function EntryCard({ entry, index }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(index * 80, withTiming(1, { duration: 520 }));
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [18, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.96, 1]) },
    ],
  }));

  return (
    <Animated.View style={[styles.entryCard, animatedStyle]}>
      <Image source={{ uri: entry.uri }} style={styles.entryImage} />
      <View style={styles.entryInfo}>
        <View style={[styles.moodDot, { backgroundColor: entry.moodColor }]} />
        <View style={styles.entryTextBlock}>
          <Text style={styles.entryTitle}>{entry.mood}</Text>
          <Text style={styles.entryMeta}>{entry.createdAt}</Text>
          <Text style={styles.entryMeta}>
            {entry.location
              ? `${entry.location.latitude.toFixed(4)}, ${entry.location.longitude.toFixed(4)}`
              : 'Ubicacion no disponible'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function App() {
  const cameraRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [entries, setEntries] = useState([]);
  const [moodIndex, setMoodIndex] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const intro = useSharedValue(0);
  const pulse = useSharedValue(1);
  const accent = useSharedValue(0);

  const selectedMood = moodOptions[moodIndex];
  const lastEntry = entries[0];

  const stats = useMemo(
    () => ({
      captures: entries.length,
      located: entries.filter((entry) => entry.location).length,
      moods: new Set(entries.map((entry) => entry.mood)).size,
    }),
    [entries]
  );

  useEffect(() => {
    intro.value = withTiming(1, { duration: 800 });
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      true
    );
  }, [intro, pulse]);

  useEffect(() => {
    accent.value = withSpring(moodIndex, { damping: 14, stiffness: 120 });
  }, [accent, moodIndex]);

  const loadEntries = useCallback(async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    setEntries(saved ? JSON.parse(saved) : []);
  }, []);

  useEffect(() => {
    loadEntries().catch(() => {
      Alert.alert('Almacenamiento', 'No se pudo leer la bitacora guardada.');
    });
  }, [loadEntries]);

  const persistEntries = async (nextEntries) => {
    setEntries(nextEntries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
  };

  const ensurePermissions = async () => {
    const cameraStatus =
      cameraPermission?.granted || (await requestCameraPermission())?.granted;
    const locationStatus =
      locationPermission?.granted || (await requestLocationPermission())?.granted;

    if (!cameraStatus) {
      Alert.alert('Permiso requerido', 'La camara es obligatoria para capturar evidencias.');
      return false;
    }

    if (!locationStatus) {
      Alert.alert('Ubicacion opcional', 'La captura se guardara sin coordenadas.');
    }

    return true;
  };

  const openCamera = async () => {
    const canOpen = await ensurePermissions();
    if (canOpen) {
      await Haptics.selectionAsync();
      setIsCameraOpen(true);
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.78 });

      const folder = await FileSystem.getInfoAsync(ALBUM_DIR);
      if (!folder.exists) {
        await FileSystem.makeDirectoryAsync(ALBUM_DIR, { intermediates: true });
      }

      const fileName = `captura-${Date.now()}.jpg`;
      const savedUri = `${ALBUM_DIR}${fileName}`;
      await FileSystem.copyAsync({ from: photo.uri, to: savedUri });

      let location = null;
      if (locationPermission?.granted) {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        location = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
      }

      const entry = {
        id: fileName,
        uri: savedUri,
        mood: selectedMood.label,
        moodColor: selectedMood.color,
        location,
        createdAt: new Intl.DateTimeFormat('es-CO', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date()),
      };

      await persistEntries([entry, ...entries].slice(0, 12));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsCameraOpen(false);
    } catch (error) {
      Alert.alert('Captura fallida', 'No se pudo guardar la foto en almacenamiento interno.');
    } finally {
      setIsCapturing(false);
    }
  };

  const clearLog = async () => {
    await Haptics.selectionAsync();
    Alert.alert('Limpiar bitacora', 'Se eliminaran los registros guardados en la app.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpiar',
        style: 'destructive',
        onPress: async () => {
          await persistEntries([]);
          const folder = await FileSystem.getInfoAsync(ALBUM_DIR);
          if (folder.exists) {
            await FileSystem.deleteAsync(ALBUM_DIR, { idempotent: true });
          }
        },
      },
    ]);
  };

  const heroStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: interpolate(intro.value, [0, 1], [28, 0]) }],
  }));

  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const accentStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      accent.value,
      [0, 1, 2],
      moodOptions.map((mood) => mood.color)
    ),
    transform: [{ translateX: interpolate(accent.value, [0, 1, 2], [0, 96, 192]) }],
  }));

  if (isCameraOpen) {
    return (
      <View style={styles.cameraScreen}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <SafeAreaView style={styles.cameraOverlay}>
          <View style={styles.cameraTopBar}>
            <Pressable style={styles.ghostButton} onPress={() => setIsCameraOpen(false)}>
              <Text style={styles.ghostButtonText}>Cerrar</Text>
            </Pressable>
            <Text style={styles.cameraMood}>{selectedMood.label}</Text>
          </View>

          <Animated.View style={[styles.shutterOuter, captureButtonStyle]}>
            <Pressable style={styles.shutter} onPress={takePhoto} disabled={isCapturing}>
              {isCapturing ? <ActivityIndicator color="#111827" /> : <View style={styles.shutterCore} />}
            </Pressable>
          </Animated.View>
        </SafeAreaView>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, heroStyle]}>
          <Text style={styles.kicker}>Proyecto React Native</Text>
          <Text style={styles.title}>Bitacora Sensorial</Text>
          <Text style={styles.subtitle}>
            Captura evidencias con camara, guardalas internamente y agrega contexto del
            dispositivo para una sustentacion completa.
          </Text>
        </Animated.View>

        <View style={styles.metricsRow}>
          <Metric label="capturas" value={stats.captures} />
          <Metric label="ubicadas" value={stats.located} />
          <Metric label="estados" value={stats.moods} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Estado de la evidencia</Text>
          <View style={styles.segmented}>
            <Animated.View style={[styles.segmentIndicator, accentStyle]} />
            {moodOptions.map((mood, index) => (
              <Pressable
                key={mood.label}
                style={styles.segment}
                onPress={async () => {
                  setMoodIndex(index);
                  await Haptics.selectionAsync();
                }}
              >
                <Text style={[styles.segmentText, moodIndex === index && styles.segmentTextActive]}>
                  {mood.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.actionRow}>
          <Animated.View style={[styles.primaryActionWrap, captureButtonStyle]}>
            <Pressable style={styles.primaryAction} onPress={openCamera}>
              <Text style={styles.primaryActionText}>Abrir camara</Text>
            </Pressable>
          </Animated.View>
          <Pressable style={styles.secondaryAction} onPress={clearLog}>
            <Text style={styles.secondaryActionText}>Limpiar</Text>
          </Pressable>
        </View>

        {lastEntry ? (
          <View style={styles.previewPanel}>
            <Image source={{ uri: lastEntry.uri }} style={styles.previewImage} />
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>Ultima captura</Text>
              <Text style={styles.previewText}>{lastEntry.createdAt}</Text>
              <Text style={styles.previewText}>{lastEntry.mood}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aun no hay evidencias</Text>
            <Text style={styles.emptyText}>
              La primera foto activa camara, almacenamiento interno, ubicacion y haptics.
            </Text>
          </View>
        )}

        <View style={styles.entriesHeader}>
          <Text style={styles.sectionTitle}>Registros guardados</Text>
          <Text style={styles.counter}>{entries.length}/12</Text>
        </View>

        {entries.map((entry, index) => (
          <EntryCard key={entry.id} entry={entry} index={index} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f7f3',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  hero: {
    paddingTop: 18,
    gap: 8,
  },
  kicker: {
    color: '#2f6f4e',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#16211b',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#52605a',
    fontSize: 16,
    lineHeight: 23,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    minHeight: 78,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dde6dd',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  metricValue: {
    color: '#172019',
    fontSize: 24,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#6d7771',
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  panel: {
    gap: 12,
  },
  sectionTitle: {
    color: '#172019',
    fontSize: 18,
    fontWeight: '900',
  },
  segmented: {
    height: 48,
    width: 288,
    borderRadius: 8,
    backgroundColor: '#e1e9e1',
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  segmentIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 88,
    height: 40,
    borderRadius: 7,
  },
  segment: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    color: '#506057',
    fontSize: 13,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryActionWrap: {
    flex: 1,
  },
  primaryAction: {
    height: 56,
    borderRadius: 8,
    backgroundColor: '#172019',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryAction: {
    height: 56,
    minWidth: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bdcabc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    color: '#243028',
    fontSize: 15,
    fontWeight: '800',
  },
  previewPanel: {
    backgroundColor: '#172019',
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 230,
  },
  previewCopy: {
    padding: 16,
    gap: 4,
  },
  previewTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  previewText: {
    color: '#c8d6ce',
    fontSize: 14,
  },
  emptyState: {
    minHeight: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccd9ca',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 6,
  },
  emptyTitle: {
    color: '#18251d',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    color: '#66726b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  entriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  counter: {
    color: '#68746d',
    fontWeight: '800',
  },
  entryCard: {
    flexDirection: 'row',
    minHeight: 104,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dde6dd',
    overflow: 'hidden',
  },
  entryImage: {
    width: 104,
    height: 104,
  },
  entryInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    alignItems: 'center',
  },
  moodDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  entryTextBlock: {
    flex: 1,
    gap: 3,
  },
  entryTitle: {
    color: '#172019',
    fontSize: 16,
    fontWeight: '900',
  },
  entryMeta: {
    color: '#66726b',
    fontSize: 12,
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 20,
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ghostButton: {
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ghostButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  cameraMood: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowRadius: 8,
  },
  shutterOuter: {
    alignSelf: 'center',
    marginBottom: 18,
  },
  shutter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: '#172019',
  },
});
