import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { EntryCard } from '../components/EntryCard';
import { Metric } from '../components/Metric';
import { PhotoDetailModal } from '../components/PhotoDetailModal';
import { moodOptions } from '../constants/app';
import { styles } from '../styles/styles';
import { getLocationLabel } from '../utils/location';

export function HomeScreen({
  accentStyle,
  captureButtonStyle,
  descriptionDraft,
  entries,
  heroStyle,
  lastEntry,
  moodIndex,
  onChangeDescription,
  onClearLog,
  onCloseEntry,
  onOpenCamera,
  onOpenEntry,
  onSaveDescription,
  onSelectMood,
  selectedEntry,
  stats,
}) {
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
                  onSelectMood(index);
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
            <Pressable style={styles.primaryAction} onPress={onOpenCamera}>
              <Text style={styles.primaryActionText}>Abrir camara</Text>
            </Pressable>
          </Animated.View>
          <Pressable style={styles.secondaryAction} onPress={onClearLog}>
            <Text style={styles.secondaryActionText}>Limpiar</Text>
          </Pressable>
        </View>

        {lastEntry ? (
          <Pressable style={styles.previewPanel} onPress={() => onOpenEntry(lastEntry)}>
            <Image source={{ uri: lastEntry.uri }} style={styles.previewImage} />
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>Ultima captura</Text>
              <Text style={styles.previewText}>{lastEntry.createdAt}</Text>
              <Text style={styles.previewText}>{lastEntry.mood}</Text>
              <Text style={styles.previewText}>{getLocationLabel(lastEntry)}</Text>
              <Text style={styles.previewHint}>
                {lastEntry.description ? lastEntry.description : 'Toca para agregar descripcion'}
              </Text>
            </View>
          </Pressable>
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
          <EntryCard
            key={entry.id}
            entry={entry}
            index={index}
            onOpen={() => onOpenEntry(entry)}
          />
        ))}
      </ScrollView>

      <PhotoDetailModal
        entry={selectedEntry}
        descriptionDraft={descriptionDraft}
        onChangeDescription={onChangeDescription}
        onClose={onCloseEntry}
        onSave={onSaveDescription}
      />
    </SafeAreaView>
  );
}
