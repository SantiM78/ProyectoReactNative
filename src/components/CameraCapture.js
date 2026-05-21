import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import Animated from 'react-native-reanimated';

import { styles } from '../styles/styles';

export function CameraCapture({
  cameraRef,
  captureButtonStyle,
  isCapturing,
  selectedMood,
  onClose,
  onTakePhoto,
}) {
  return (
    <View style={styles.cameraScreen}>
      {/* Vista real de la camara del celular. */}
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <SafeAreaView style={styles.cameraOverlay}>
        {/* Barra superior: cerrar camara y ver el estado elegido. */}
        <View style={styles.cameraTopBar}>
          <Pressable style={styles.ghostButton} onPress={onClose}>
            <Text style={styles.ghostButtonText}>Cerrar</Text>
          </Pressable>
          <Text style={styles.cameraMood}>{selectedMood.label}</Text>
        </View>

        {/* Boton grande para tomar la foto. Si esta guardando, muestra cargando. */}
        <Animated.View style={[styles.shutterOuter, captureButtonStyle]}>
          <Pressable style={styles.shutter} onPress={onTakePhoto} disabled={isCapturing}>
            {isCapturing ? (
              <ActivityIndicator color="#111827" />
            ) : (
              <View style={styles.shutterCore} />
            )}
          </Pressable>
        </Animated.View>
      </SafeAreaView>
      <StatusBar style="light" />
    </View>
  );
}
