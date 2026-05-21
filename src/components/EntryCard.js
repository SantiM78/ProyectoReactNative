import { useEffect } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { styles } from '../styles/styles';
import { getLocationLabel } from '../utils/location';

export function EntryCard({ entry, index, onOpen }) {
  // Cada tarjeta entra con una animacion suave, una despues de la otra.
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
      {/* Al tocar una tarjeta, abrimos la foto en detalle. */}
      <Pressable style={styles.entryPressable} onPress={onOpen}>
        <Image source={{ uri: entry.uri }} style={styles.entryImage} />
        <View style={styles.entryInfo}>
          <View style={[styles.moodDot, { backgroundColor: entry.moodColor }]} />
          <View style={styles.entryTextBlock}>
            {/* Datos cortos para reconocer rapido la captura. */}
            <Text style={styles.entryTitle}>{entry.mood}</Text>
            <Text style={styles.entryMeta}>{entry.createdAt}</Text>
            <Text style={styles.entryMeta} numberOfLines={1}>
              {getLocationLabel(entry)}
            </Text>
            <Text style={styles.entryHint} numberOfLines={1}>
              {entry.description ? entry.description : 'Toca para abrir y agregar descripcion'}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
