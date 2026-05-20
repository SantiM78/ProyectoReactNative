# Bitacora Sensorial

Aplicacion movil desarrollada con **React Native + Expo** para registrar evidencias visuales en una bitacora local. La app permite tomar fotografias, guardarlas dentro del almacenamiento interno del dispositivo, asociarles una ubicacion aproximada por barrio/localidad y agregar una descripcion opcional.

El objetivo del proyecto es demostrar el uso de funcionalidades nativas del telefono, animaciones con React Native Reanimated y una estructura de codigo organizada por buenas practicas.

## Tecnologias Utilizadas

- React Native
- Expo SDK
- Expo Camera
- Expo File System
- Expo Location
- Expo Haptics
- AsyncStorage
- React Native Reanimated

## Funcionalidades Nativas

La aplicacion integra 4 funcionalidades nativas:

1. Camara
2. Almacenamiento interno
3. Ubicacion
4. Vibracion / Haptics

## 1. Camara

La camara se usa para capturar evidencias visuales desde la camara trasera del dispositivo.

Archivo principal:

```text
App.js
src/components/CameraCapture.js
```

Uso del permiso de camara:

```js
const [cameraPermission, requestCameraPermission] = useCameraPermissions();

const ensurePermissions = async () => {
  const cameraStatus =
    cameraPermission?.granted || (await requestCameraPermission())?.granted;

  if (!cameraStatus) {
    Alert.alert('Permiso requerido', 'La camara es obligatoria para capturar evidencias.');
    return false;
  }

  return true;
};
```

Vista de camara:

```js
<CameraView ref={cameraRef} style={styles.camera} facing="back" />
```

Captura de foto:

```js
const photo = await cameraRef.current.takePictureAsync({ quality: 0.78 });
```

Con esto la app abre la camara, toma una fotografia y obtiene la ruta temporal de la imagen.

## 2. Almacenamiento Interno

Las fotos se guardan en el almacenamiento interno de la aplicacion usando `expo-file-system`. Los metadatos de cada registro se guardan con `AsyncStorage`.

Archivo:

```text
App.js
src/constants/app.js
```

Constantes principales:

```js
export const STORAGE_KEY = '@bitacora_sensorial/entries';
export const ALBUM_DIR = `${FileSystem.documentDirectory}bitacora-sensorial/`;
export const MAX_ENTRIES = 12;
```

Creacion de carpeta interna:

```js
const folder = await FileSystem.getInfoAsync(ALBUM_DIR);

if (!folder.exists) {
  await FileSystem.makeDirectoryAsync(ALBUM_DIR, { intermediates: true });
}
```

Copia de la foto al almacenamiento interno:

```js
const fileName = `captura-${Date.now()}.jpg`;
const savedUri = `${ALBUM_DIR}${fileName}`;

await FileSystem.copyAsync({
  from: photo.uri,
  to: savedUri,
});
```

Persistencia de registros:

```js
const persistEntries = async (nextEntries) => {
  setEntries(nextEntries);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
};
```

Lectura de registros guardados:

```js
const loadEntries = useCallback(async () => {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  setEntries(saved ? JSON.parse(saved) : []);
}, []);
```

## 3. Ubicacion por Barrio o Localidad

La app solicita permiso de ubicacion y obtiene la ubicacion actual del dispositivo. Luego usa geocodificacion inversa para convertir las coordenadas en un nombre entendible, como barrio, localidad, ciudad o pais.

Archivos:

```text
App.js
src/utils/location.js
```

Permiso de ubicacion:

```js
const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

const locationStatus =
  locationPermission?.granted || (await requestLocationPermission())?.granted;
```

Obtencion de ubicacion:

```js
const current = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,
});

const location = {
  latitude: current.coords.latitude,
  longitude: current.coords.longitude,
};
```

Conversion a barrio/localidad:

```js
const resolvePlaceName = async (coords) => {
  try {
    const [address] = await Location.reverseGeocodeAsync(coords);
    return address ? buildPlaceName(address) : '';
  } catch (error) {
    return '';
  }
};
```

Utilidad para armar el nombre del lugar:

```js
export function buildPlaceName(address) {
  const neighborhood = address.district || address.subregion || address.name;
  const locality = address.city || address.region;
  const country = address.country;

  return [neighborhood, locality, country].filter(Boolean).join(', ');
}
```

Si no se puede resolver el lugar, la app muestra:

```text
Barrio o localidad no disponible
```

## 4. Haptics / Vibracion

La app usa `expo-haptics` para dar retroalimentacion fisica al usuario en acciones importantes.

Archivo:

```text
App.js
```

Ejemplo al abrir la camara:

```js
await Haptics.selectionAsync();
setIsCameraOpen(true);
```

Ejemplo al tomar una foto:

```js
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

Ejemplo al guardar correctamente:

```js
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

Esto mejora la experiencia porque el usuario recibe una confirmacion tactil cuando interactua con la app.

## Gestion de Fotos

Cada foto tomada se guarda como un registro de bitacora. El usuario puede abrir cualquier foto guardada, verla en detalle y agregar una descripcion opcional.

Archivos:

```text
src/components/EntryCard.js
src/components/PhotoDetailModal.js
src/screens/HomeScreen.js
```

Tarjeta de foto guardada:

```js
<EntryCard
  key={entry.id}
  entry={entry}
  index={index}
  onOpen={() => onOpenEntry(entry)}
/>
```

Modal de detalle:

```js
<PhotoDetailModal
  entry={selectedEntry}
  descriptionDraft={descriptionDraft}
  onChangeDescription={onChangeDescription}
  onClose={onCloseEntry}
  onSave={onSaveDescription}
/>
```

Descripcion opcional:

```js
<TextInput
  style={styles.descriptionInput}
  value={descriptionDraft}
  onChangeText={onChangeDescription}
  multiline
  maxLength={DESCRIPTION_LIMIT}
  placeholder="Ej: Evidencia tomada durante la practica..."
/>
```

Guardado de descripcion:

```js
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
```

La descripcion puede quedar vacia. No es obligatoria para guardar la foto.

## Animaciones con React Native Reanimated

La aplicacion incluye varias animaciones con `react-native-reanimated`.

### 1. Entrada del encabezado

El encabezado aparece con opacidad y desplazamiento vertical.

```js
const intro = useSharedValue(0);

useEffect(() => {
  intro.value = withTiming(1, { duration: 800 });
}, [intro]);

const heroStyle = useAnimatedStyle(() => ({
  opacity: intro.value,
  transform: [{ translateY: interpolate(intro.value, [0, 1], [28, 0]) }],
}));
```

Uso:

```js
<Animated.View style={[styles.hero, heroStyle]}>
  <Text style={styles.title}>Bitacora Sensorial</Text>
</Animated.View>
```

### 2. Pulso del boton principal y obturador

El boton de abrir camara y el obturador tienen una animacion de pulso continuo.

```js
const pulse = useSharedValue(1);

useEffect(() => {
  pulse.value = withRepeat(
    withSequence(
      withTiming(1.08, { duration: 900 }),
      withTiming(1, { duration: 900 })
    ),
    -1,
    true
  );
}, [pulse]);

const captureButtonStyle = useAnimatedStyle(() => ({
  transform: [{ scale: pulse.value }],
}));
```

### 3. Interpolacion de color en selector de estado

El selector cambia de posicion y color segun el estado elegido.

```js
const accent = useSharedValue(0);

useEffect(() => {
  accent.value = withSpring(moodIndex, { damping: 14, stiffness: 120 });
}, [accent, moodIndex]);

const accentStyle = useAnimatedStyle(() => ({
  backgroundColor: interpolateColor(
    accent.value,
    [0, 1, 2],
    moodOptions.map((mood) => mood.color)
  ),
  transform: [{ translateX: interpolate(accent.value, [0, 1, 2], [0, 96, 192]) }],
}));
```

### 4. Aparicion animada de registros

Cada registro aparece con opacidad, escala y desplazamiento.

```js
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
```

## Estructura del Proyecto

La aplicacion fue organizada para separar responsabilidades y evitar que todo quede en un solo archivo.

```text
ProyectoReactNative/
  App.js
  README.md
  app.json
  babel.config.js
  package.json
  src/
    components/
      CameraCapture.js
      EntryCard.js
      Metric.js
      PhotoDetailModal.js
    constants/
      app.js
    screens/
      HomeScreen.js
    styles/
      styles.js
    utils/
      location.js
```

### App.js

Controla la logica principal:

- Permisos de camara y ubicacion.
- Captura de fotos.
- Guardado en almacenamiento interno.
- Persistencia de registros.
- Estado global de la pantalla.
- Animaciones principales.

### src/components

Contiene componentes reutilizables:

- `CameraCapture.js`: pantalla de camara y boton obturador.
- `EntryCard.js`: tarjeta de cada registro guardado.
- `Metric.js`: tarjetas de conteo.
- `PhotoDetailModal.js`: modal para abrir foto y editar descripcion.

### src/screens

Contiene las pantallas principales:

- `HomeScreen.js`: pantalla principal de la bitacora.

### src/styles

Contiene estilos centralizados:

- `styles.js`: todos los estilos creados con `StyleSheet.create`.

En React Native no se usa CSS tradicional como en web. La buena practica es separar los estilos en un archivo de `StyleSheet`.

### src/constants

Contiene valores fijos:

```js
export const STORAGE_KEY = '@bitacora_sensorial/entries';
export const MAX_ENTRIES = 12;
export const DESCRIPTION_LIMIT = 180;
```

### src/utils

Contiene funciones auxiliares:

- `getLocationLabel`: muestra el nombre del barrio/localidad.
- `buildPlaceName`: construye el nombre de ubicacion desde la respuesta de geocodificacion.

## Flujo de Uso

1. El usuario abre la app.
2. Selecciona un estado: Enfoque, Energia o Calma.
3. Toca el boton "Abrir camara".
4. La app solicita permisos de camara y ubicacion.
5. El usuario toma una foto.
6. La app guarda la imagen en almacenamiento interno.
7. La app obtiene la ubicacion y la convierte a barrio/localidad.
8. El registro aparece en la lista.
9. El usuario puede abrir la foto y agregar una descripcion opcional.

## Instalacion

Instalar dependencias:

```bash
npm install
```

Iniciar el proyecto:

```bash
npm start
```

Tambien se puede ejecutar:

```bash
npx expo start
```

## Probar en Celular con Expo Go

1. Instala Expo Go en Android o iOS.
2. Conecta el celular y el computador a la misma red Wi-Fi.
3. Ejecuta:

```bash
npm start
```

4. Escanea el QR con Expo Go.

Si la red no permite conexion local, usa tunnel:

```bash
npx expo start --tunnel
```

Si no hay Wi-Fi disponible, puedes activar hotspot en el celular, conectar el computador a ese hotspot y abrir Expo con LAN.

## Compilar para Android

Para compilar localmente se necesita Android Studio, Android SDK y `adb` configurado.

```bash
npx expo run:android
```

Para compilar en la nube con EAS:

```bash
npx eas build -p android --profile preview
```

## Comandos de Verificacion

Revisar salud del proyecto:

```bash
npx expo-doctor
```

Generar bundle Android de prueba:

```bash
npx expo export --platform android
```

## Criterios de Evaluacion Cubiertos

### Creatividad de la herramienta

La app funciona como una bitacora sensorial para registrar evidencias visuales con estado emocional o contextual.

### Animaciones e interpolacion

Incluye animaciones de entrada, pulso, aparicion escalonada e interpolacion de color.

### Diseno

La interfaz usa tarjetas, paneles limpios, colores por estado y un modal para detalle de fotografia.

### Complejidad de la herramienta

Integra camara, almacenamiento interno, ubicacion, vibracion, persistencia local, modal de detalle, descripcion opcional y animaciones.

### Sustentacion

El proyecto esta organizado por carpetas y el README explica cada funcionalidad con fragmentos de codigo.
