import * as FileSystem from 'expo-file-system/legacy';

export const STORAGE_KEY = '@bitacora_sensorial/entries';
export const ALBUM_DIR = `${FileSystem.documentDirectory}bitacora-sensorial/`;
export const MAX_ENTRIES = 12;
export const DESCRIPTION_LIMIT = 180;

export const moodOptions = [
  { label: 'Enfoque', color: '#31a36b' },
  { label: 'Energia', color: '#f59e0b' },
  { label: 'Calma', color: '#2563eb' },
];
