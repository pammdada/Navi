import { useCallback, useEffect, useState } from 'react';
import { identifyCommand } from '@/utils/speech/commands';
import { isSpeechRecognitionSupported, startSpeechRecognition } from '@/utils/speech/recognition';
import { speak, stopSpeaking } from '@/utils/speech/synthesis';
import { accessibilityPreferences, defaultPreferences, type AccessibilityPreferences } from '@/utils/storage';
import type { PageSummary } from '@/utils/dom-analyzer';
import { CaptionsToggle } from './components/CaptionsToggle';
import { CommandFeedback } from './components/CommandFeedback';
import { QuickActions } from './components/QuickActions';
import { SummaryCard } from './components/SummaryCard';
import { TextReader } from './components/TextReader';
import { VoiceAssistant } from './components/VoiceAssistant';

const getActiveTab = async (): Promise<number | undefined> => (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id;

export default function SidePanel() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [summary, setSummary] = useState<PageSummary | null>(null);
  const [feedback, setFeedback] = useState('Listo para ayudarte en UTP Class.');
  const [listening, setListening] = useState(false);
  const voiceSupported = isSpeechRecognitionSupported();
  useEffect(() => { void accessibilityPreferences.getValue().then(setPreferences); return accessibilityPreferences.watch((value) => setPreferences(value)); }, []);
  const updatePreferences = useCallback(async (updates: Partial<AccessibilityPreferences>) => { const next = { ...preferences, ...updates }; await accessibilityPreferences.setValue(next); setPreferences(next); }, [preferences]);
  const requestSummary = useCallback(async (): Promise<PageSummary | null> => {
    const tabId = await getActiveTab(); if (!tabId) return null;
    try { const page = await browser.tabs.sendMessage(tabId, { type: 'NAVI_GET_PAGE_SUMMARY' }) as PageSummary; setSummary(page); return page; }
    catch { setFeedback('Abre una página de UTP Class para utilizar Navi.'); return null; }
  }, []);
  const readPage = useCallback(async () => { const page = await requestSummary(); if (!page) return; speak(`${page.title}. ${page.headings.length ? `Secciones: ${page.headings.join('. ')}.` : ''} ${page.mainText}`, preferences); setFeedback('Leyendo el contenido principal de la página.'); }, [preferences, requestSummary]);
  const changeCaptions = useCallback(async (enabled: boolean) => {
    await updatePreferences({ captionsEnabled: enabled }); const tabId = await getActiveTab(); if (!tabId) return;
    try { const result = await browser.tabs.sendMessage(tabId, { type: 'NAVI_APPLY_CAPTIONS', enabled }) as { message: string }; setFeedback(result.message); }
    catch { setFeedback('No fue posible configurar subtítulos fuera de UTP Class.'); }
  }, [updatePreferences]);
  const executeVoiceCommand = useCallback(async (transcript: string) => {
    const command = identifyCommand(transcript);
    if (command === 'read') { void readPage(); return; }
    if (command === 'stop') { stopSpeaking(); setFeedback('Lectura detenida.'); return; }
    if (command === 'contrast') { await updatePreferences({ highContrast: !preferences.highContrast }); setFeedback('Contraste actualizado.'); return; }
    if (command === 'simplified') { await updatePreferences({ simplifiedMode: !preferences.simplifiedMode }); setFeedback('Modo simplificado actualizado.'); return; }
    if (command === 'increaseText') { await updatePreferences({ fontSize: preferences.fontSize === 'x-large' ? 'normal' : preferences.fontSize === 'normal' ? 'large' : 'x-large' }); setFeedback('Tamaño de letra actualizado.'); return; }
    if (command === 'summary') { const page = await requestSummary(); if (page) speak(`${page.title}. Hay ${page.headings.length} secciones y ${page.links.length} enlaces.`, preferences); return; }
    if (command === 'navigate') { const tabId = await getActiveTab(); const result = tabId ? await browser.tabs.sendMessage(tabId, { type: 'NAVI_NAVIGATE', command: transcript }) as { found: boolean } : { found: false }; setFeedback(result.found ? 'Navegando a la sección solicitada.' : 'No encontré esa sección en esta página.'); return; }
    setFeedback('No reconocí el comando. Prueba con “leer página” o “ir a tareas”.'); speak('No reconocí el comando. Prueba con leer página o ir a tareas.', preferences);
  }, [preferences, readPage, requestSummary, updatePreferences]);
  const listen = useCallback(() => { startSpeechRecognition((transcript) => { setListening(false); setFeedback(`Escuché: ${transcript}`); void executeVoiceCommand(transcript); }, (status, detail) => { setListening(status === 'listening'); if (status === 'error' || status === 'unsupported') setFeedback(detail ?? 'No se pudo reconocer la voz.'); }); }, [executeVoiceCommand]);
  const nextFontSize = () => void updatePreferences({ fontSize: preferences.fontSize === 'x-large' ? 'normal' : preferences.fontSize === 'normal' ? 'large' : 'x-large' });
  return <main className="navi-panel"><header className="navi-header"><div className="navi-logo" aria-hidden="true">N</div><div><h1>Navi</h1><p>Accesibilidad para UTP Class</p></div></header><CommandFeedback message={feedback} /><QuickActions highContrast={preferences.highContrast} simplifiedMode={preferences.simplifiedMode} onRead={() => void readPage()} onContrast={() => void updatePreferences({ highContrast: !preferences.highContrast })} onSimplified={() => void updatePreferences({ simplifiedMode: !preferences.simplifiedMode })} onFontIncrease={nextFontSize} /><TextReader onRead={() => void readPage()} onStop={stopSpeaking} /><VoiceAssistant listening={listening} supported={voiceSupported} onListen={listen} /><section className="navi-card"><h2>Contenido multimedia</h2><CaptionsToggle enabled={preferences.captionsEnabled} onChange={(enabled) => void changeCaptions(enabled)} /></section><SummaryCard summary={summary} /><a className="navi-settings-link" href="/options.html" target="_blank">Abrir configuración de accesibilidad</a></main>;
}
