import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CameraCapture } from './src/components/CameraCapture';
import { ALBUM_DIR, MAX_ENTRIES, moodOptions, STORAGE_KEY } from './src/constants/app';
import { HomeScreen } from './src/screens/HomeScreen';
import { buildPlaceName } from './src/utils/location';

export default function App() {
  const cameraRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [entries, setEntries] = useState([]);
  const [moodIndex, setMoodIndex] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');

  const intro = useSharedValue(0);
  const pulse = useSharedValue(1);
  const accent = useSharedValue(0);

  const selectedMood = moodOptions[moodIndex];
  const lastEntry = entries[0];
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId);

  const stats = useMemo(
    () => ({
      captures: entries.length,
      located: entries.filter((entry) => entry.placeName).length,
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

  const resolvePlaceName = async (coords) => {
    try {
      const [address] = await Location.reverseGeocodeAsync(coords);
      return address ? buildPlaceName(address) : '';
    } catch (error) {
      return '';
    }
  };

  const openEntry = async (entry) => {
    await Haptics.selectionAsync();
    setSelectedEntryId(entry.id);
    setDescriptionDraft(entry.description || '');
  };

  const closeEntry = () => {
    setSelectedEntryId(null);
    setDescriptionDraft('');
  };

  const saveDescription = async () => {
    if (!selectedEntry) {
      return;
    }

    const cleanDescription = descriptionDraft.trim();
    const nextEntries = entries.map((entry) =>
      entry.id === selectedEntry.id ? { ...entry, description: cleanDescription } : entry
    );

    await persistEntries(nextEntries);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeEntry();
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
      Alert.alert('Ubicacion opcional', 'La captura se guardara sin barrio o localidad.');
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
      let placeName = '';
      if (locationPermission?.granted) {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        location = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        placeName = await resolvePlaceName(location);
      }

      const entry = {
        id: fileName,
        uri: savedUri,
        mood: selectedMood.label,
        moodColor: selectedMood.color,
        location,
        placeName,
        description: '',
        createdAt: new Intl.DateTimeFormat('es-CO', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date()),
      };

      await persistEntries([entry, ...entries].slice(0, MAX_ENTRIES));
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
      <CameraCapture
        cameraRef={cameraRef}
        captureButtonStyle={captureButtonStyle}
        isCapturing={isCapturing}
        selectedMood={selectedMood}
        onClose={() => setIsCameraOpen(false)}
        onTakePhoto={takePhoto}
      />
    );
  }

  return (
    <HomeScreen
      accentStyle={accentStyle}
      captureButtonStyle={captureButtonStyle}
      descriptionDraft={descriptionDraft}
      entries={entries}
      heroStyle={heroStyle}
      lastEntry={lastEntry}
      moodIndex={moodIndex}
      onChangeDescription={setDescriptionDraft}
      onClearLog={clearLog}
      onCloseEntry={closeEntry}
      onOpenCamera={openCamera}
      onOpenEntry={openEntry}
      onSaveDescription={saveDescription}
      onSelectMood={setMoodIndex}
      selectedEntry={selectedEntry}
      stats={stats}
    />
  );
}
