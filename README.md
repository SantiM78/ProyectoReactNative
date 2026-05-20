# Bitacora Sensorial

Aplicacion React Native con Expo para registrar evidencias visuales en una bitacora local.

## Funcionalidades nativas

- Camara: captura fotografias desde la camara trasera.
- Almacenamiento interno: guarda imagenes en `FileSystem.documentDirectory` y metadatos en `AsyncStorage`.
- Ubicacion: convierte las coordenadas en barrio, localidad o ciudad con geocodificacion inversa.
- Haptics/vibracion: confirma seleccion, apertura de camara y captura exitosa.

## Gestion de fotos

- Cada foto guardada se puede abrir desde la lista o desde la ultima captura.
- Cada registro permite guardar una descripcion opcional de hasta 180 caracteres.
- La descripcion se guarda localmente y puede dejarse vacia sin bloquear la captura.

## Animaciones con React Native Reanimated

- Entrada animada del encabezado con opacidad y desplazamiento.
- Boton principal y obturador con pulso continuo.
- Selector de estado con interpolacion de color y desplazamiento.
- Registros guardados con aparicion escalonada, escala y movimiento.

## Comandos

```bash
npm install
npm start
```

Para probar en celular:

1. Instala Expo Go en Android o iOS.
2. Conecta el celular y el PC a la misma red Wi-Fi.
3. Ejecuta `npm start`.
4. Escanea el QR que muestra Expo.

Para instalar una build Android local se necesita Android Studio, Android SDK y `adb` configurado:

```bash
npx expo run:android
```

Si prefieres compilar con Expo en la nube:

```bash
npx eas build -p android --profile preview
```
