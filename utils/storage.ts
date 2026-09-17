// utils/storage.ts
import { storage } from '#imports';

export const idioma = storage.defineItem<string>('sync:idioma', {
  fallback: 'es',
});

// Aprovecha de definir aquí TODAS las preferencias del usuario juntas
export const velocidadLectura = storage.defineItem<number>('sync:velocidadLectura', {
  fallback: 1, // 1 = velocidad normal
});

export const volumen = storage.defineItem<number>('sync:volumen', {
  fallback: 1,
});

export const mostrarAyudaComandos = storage.defineItem<boolean>('sync:mostrarAyuda', {
  fallback: true,
});