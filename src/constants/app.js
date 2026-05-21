import * as FileSystem from 'expo-file-system/legacy';

// Llaves y rutas donde la app guarda su informacion local.
export const STORAGE_KEY = '@bitacora_sensorial/entries';
export const ALBUM_DIR = `${FileSystem.documentDirectory}bitacora-sensorial/`;

// Limites sencillos para que la bitacora no crezca sin control.
export const MAX_ENTRIES = 12;
export const DESCRIPTION_LIMIT = 180;

// Estados que el usuario puede escoger antes de tomar la foto.
export const moodOptions = [
  { label: 'Enfoque', color: '#31a36b' },
  { label: 'Energia', color: '#f59e0b' },
  { label: 'Calma', color: '#2563eb' },
];
