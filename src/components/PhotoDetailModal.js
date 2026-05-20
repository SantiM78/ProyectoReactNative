import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DESCRIPTION_LIMIT } from '../constants/app';
import { styles } from '../styles/styles';
import { getLocationLabel } from '../utils/location';

export function PhotoDetailModal({
  entry,
  descriptionDraft,
  onChangeDescription,
  onClose,
  onSave,
}) {
  return (
    <Modal visible={!!entry} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <View style={styles.detailSheet}>
          {entry ? (
            <>
              <Image source={{ uri: entry.uri }} style={styles.detailImage} />
              <ScrollView
                contentContainerStyle={styles.detailBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailHeader}>
                  <View>
                    <Text style={styles.detailTitle}>{entry.mood}</Text>
                    <Text style={styles.detailMeta}>{entry.createdAt}</Text>
                  </View>
                  <Pressable style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>Cerrar</Text>
                  </Pressable>
                </View>

                <View style={styles.placeBox}>
                  <Text style={styles.placeLabel}>Barrio o localidad</Text>
                  <Text style={styles.placeText}>{getLocationLabel(entry)}</Text>
                </View>

                <Text style={styles.inputLabel}>Descripcion opcional</Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={descriptionDraft}
                  onChangeText={onChangeDescription}
                  multiline
                  maxLength={DESCRIPTION_LIMIT}
                  placeholder="Ej: Evidencia tomada durante la practica..."
                  placeholderTextColor="#87918a"
                  textAlignVertical="top"
                />
                <Text style={styles.characterCounter}>
                  {descriptionDraft.length}/{DESCRIPTION_LIMIT}
                </Text>

                <Pressable style={styles.saveButton} onPress={onSave}>
                  <Text style={styles.saveButtonText}>Guardar descripcion</Text>
                </Pressable>
              </ScrollView>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
