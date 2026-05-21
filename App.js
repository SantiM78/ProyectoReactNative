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
  // Referencias y permisos que necesita la app para hablar con el celular.
  const cameraRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  // Estados principales: fotos guardadas, pantalla actual y texto de la descripcion.
  const [entries, setEntries] = useState([]);
  const [moodIndex, setMoodIndex] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');

  // Valores animados para darle movimiento a la pantalla.
  const intro = useSharedValue(0);
  const pulse = useSharedValue(1);
  const accent = useSharedValue(0);

  // Datos calculados para mostrar lo que el usuario esta viendo.
  const selectedMood = moodOptions[moodIndex];
  const lastEntry = entries[0];
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId);

  // Numeritos del resumen superior: capturas, ubicadas y estados usados.
  const stats = useMemo(
    () => ({
      captures: entries.length,
      located: entries.filter((entry) => entry.placeName).length,
      moods: new Set(entries.map((entry) => entry.mood)).size,
    }),
    [entries]
  );

  // Arranca las animaciones iniciales cuando abre la app.
  useEffect(() => {
    intro.value = withTiming(1, { duration: 800 });
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      true
    );
  }, [intro, pulse]);

  // Mueve el selector de estado cada vez que cambias entre Enfoque, Energia o Calma.
  useEffect(() => {
    accent.value = withSpring(moodIndex, { damping: 14, stiffness: 120 });
  }, [accent, moodIndex]);

  // Carga la bitacora guardada en el telefono.
  const loadEntries = useCallback(async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    setEntries(saved ? JSON.parse(saved) : []);
  }, []);

  // Apenas abre la app, intenta traer las fotos guardadas antes.
  useEffect(() => {
    loadEntries().catch(() => {
      Alert.alert('Almacenamiento', 'No se pudo leer la bitacora guardada.');
    });
  }, [loadEntries]);

  // Guarda la lista completa en memoria local para que no se pierda al cerrar.
  const persistEntries = async (nextEntries) => {
    setEntries(nextEntries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
  };

  // Convierte las coordenadas en un nombre mas bonito, como barrio o ciudad.
  const resolvePlaceName = async (coords) => {
    try {
      const [address] = await Location.reverseGeocodeAsync(coords);
      return address ? buildPlaceName(address) : '';
    } catch (error) {
      return '';
    }
  };

  // Abre una foto guardada para verla grande y escribirle descripcion.
  const openEntry = async (entry) => {
    await Haptics.selectionAsync();
    setSelectedEntryId(entry.id);
    setDescriptionDraft(entry.description || '');
  };

  // Cierra el detalle y limpia el texto temporal.
  const closeEntry = () => {
    setSelectedEntryId(null);
    setDescriptionDraft('');
  };

  // Guarda la descripcion opcional dentro del registro seleccionado.
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

  // Revisa permisos antes de abrir la camara.
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

  // Abre la camara solo si los permisos necesarios estan listos.
  const openCamera = async () => {
    const canOpen = await ensurePermissions();
    if (canOpen) {
      await Haptics.selectionAsync();
      setIsCameraOpen(true);
    }
  };

  // Toma la foto, la guarda en almacenamiento interno y crea el registro.
  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.78 });

      // Si la carpeta de la bitacora no existe, la creamos.
      const folder = await FileSystem.getInfoAsync(ALBUM_DIR);
      if (!folder.exists) {
        await FileSystem.makeDirectoryAsync(ALBUM_DIR, { intermediates: true });
      }

      const fileName = `captura-${Date.now()}.jpg`;
      const savedUri = `${ALBUM_DIR}${fileName}`;
      await FileSystem.copyAsync({ from: photo.uri, to: savedUri });

      // Si hay permiso de ubicacion, buscamos el barrio/localidad.
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

      // Este es el objeto que representa una foto dentro de la bitacora.
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

      // Agrega la captura al inicio y mantiene solo las ultimas entradas.
      await persistEntries([entry, ...entries].slice(0, MAX_ENTRIES));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsCameraOpen(false);
    } catch (error) {
      Alert.alert('Captura fallida', 'No se pudo guardar la foto en almacenamiento interno.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Borra todas las fotos/registros guardados por la app.
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

  // Animacion de entrada del encabezado.
  const heroStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: interpolate(intro.value, [0, 1], [28, 0]) }],
  }));

  // Animacion de pulso para el boton de camara y el obturador.
  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Animacion del selector: cambia color y posicion.
  const accentStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      accent.value,
      [0, 1, 2],
      moodOptions.map((mood) => mood.color)
    ),
    transform: [{ translateX: interpolate(accent.value, [0, 1, 2], [0, 96, 192]) }],
  }));

  // Cuando la camara esta abierta, mostramos solo esa pantalla.
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

  // Pantalla principal de la bitacora.
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
