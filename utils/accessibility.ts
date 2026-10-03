import type { AccessibilityPreferences } from './storage';

export function applyAccessibilityPreferences(preferences: AccessibilityPreferences): void {
  const root = document.documentElement;
  root.classList.toggle('navi-high-contrast', preferences.highContrast);
  root.classList.toggle('navi-simplified-mode', preferences.simplifiedMode);
  root.dataset.naviFontSize = preferences.fontSize;
}
