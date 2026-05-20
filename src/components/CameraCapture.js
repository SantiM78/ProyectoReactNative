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
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <SafeAreaView style={styles.cameraOverlay}>
        <View style={styles.cameraTopBar}>
          <Pressable style={styles.ghostButton} onPress={onClose}>
            <Text style={styles.ghostButtonText}>Cerrar</Text>
          </Pressable>
          <Text style={styles.cameraMood}>{selectedMood.label}</Text>
        </View>

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
