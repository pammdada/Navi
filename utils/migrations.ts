import { LEGACY_KEYS, defaultValues, migrateLegacyPreferences } from './preferences';
import { accessibilityPreferences, type AccessibilityPreferences } from './storage';

/**
 * Limpia las claves antiguas sin uso (idioma, velocidadLectura, volumen, mostrarAyuda) y completa los
 * campos nuevos de los ajustes guardados. Solo escribe si hay algo que cambiar, y es seguro ejecutarla varias veces.
 */
export async function migrateStorage(): Promise<void> {
  const raw = await browser.storage.sync.get([...LEGACY_KEYS, 'accessibility-preferences']);
  const stored = (raw['accessibility-preferences'] ?? null) as Partial<AccessibilityPreferences> | null;
  const legacyKeys = LEGACY_KEYS.filter((key) => key in raw);
  const migrated = migrateLegacyPreferences(stored, raw);

  const missingFields = stored ? Object.keys(defaultValues).some((key) => !(key in stored)) : false;
  const inconsistent = stored ? migrated.highContrast !== stored.highContrast || migrated.colorVisionMode !== stored.colorVisionMode : false;
  const adoptsLegacyValues = !stored && legacyKeys.length > 0;

  if (missingFields || inconsistent || adoptsLegacyValues) await accessibilityPreferences.setValue(migrated);
  if (legacyKeys.length) await browser.storage.sync.remove([...legacyKeys]);
}
