import { useCallback, useEffect, useState } from 'react';
import { identifyCommand } from '@/utils/speech/commands';
import { isSpeechRecognitionSupported, startSpeechRecognition } from '@/utils/speech/recognition';
import { speakWithPreferences as speak, stopSpeaking } from '@/utils/speech/synthesis';
import { bridgeErrorMessage, sendToPage } from '@/utils/page-bridge';
import { accessibilityPreferences, defaultPreferences, userProfile, type AccessibilityPreferences } from '@/utils/storage';
import { NaviLogo } from '@/components/NaviLogo';
import type { PageSummary } from '@/utils/dom-analyzer';
import { CaptionsToggle } from './components/CaptionsToggle';
import { CommandFeedback } from './components/CommandFeedback';
import { QuickActions } from './components/QuickActions';
import { SummaryCard } from './components/SummaryCard';
import { TextReader } from './components/TextReader';
import { VoiceAssistant } from './components/VoiceAssistant';

const micErrors: Record<string, string> = {
  'not-allowed': 'Falta el permiso del micrófono. Se abrió el Centro Navi: pulsa "Hablar ahora" ahí y permite el micrófono; después vuelve a intentarlo aquí.',
  'no-speech': 'No te escuché. Acércate al micrófono e inténtalo otra vez.',
  'audio-capture': 'No encontré un micrófono. Revisa que esté conectado.',
  network: 'El reconocimiento de voz necesita conexión a internet.',
};

export default function SidePanel() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [summary, setSummary] = useState<PageSummary | null>(null);
  const [feedback, setFeedback] = useState('Listo para ayudarte en UTP Class.');
  const [listening, setListening] = useState(false);
  const [userName, setUserName] = useState('');
  const voiceSupported = isSpeechRecognitionSupported();
  useEffect(() => { void accessibilityPreferences.getValue().then((value) => setPreferences({ ...defaultPreferences, ...value })); return accessibilityPreferences.watch((value) => setPreferences({ ...defaultPreferences, ...value })); }, []);
  useEffect(() => { void userProfile.getValue().then((profile) => setUserName(profile.name)); return userProfile.watch((profile) => setUserName(profile.name)); }, []);
  const updatePreferences = useCallback(async (updates: Partial<AccessibilityPreferences>) => { const next = { ...preferences, ...updates }; await accessibilityPreferences.setValue(next); setPreferences(next); }, [preferences]);
  const requestSummary = useCallback(async (): Promise<PageSummary | null> => {
    try { const page = await sendToPage<PageSummary>({ type: 'NAVI_GET_PAGE_SUMMARY' }); setSummary(page); return page; }
    catch (error) { setSummary(null); setFeedback(bridgeErrorMessage(error)); return null; }
  }, []);
  const readPage = useCallback(async () => {
    const page = await requestSummary(); if (!page) return;
    if (!page.mainText.trim()) { setFeedback('No encontré texto para leer en esta página. Espera a que termine de cargar e inténtalo otra vez.'); return; }
    speak(`${page.title}. ${page.mainText}`, preferences, () => setFeedback('Terminé de leer la página.'));
    setFeedback(`Leyendo: ${page.title}.`);
  }, [preferences, requestSummary]);
  const changeCaptions = useCallback(async (enabled: boolean) => {
    await updatePreferences({ captionsEnabled: enabled });
    try { const result = await sendToPage<{ message: string }>({ type: 'NAVI_APPLY_CAPTIONS', enabled }); setFeedback(result.message); }
    catch (error) { setFeedback(bridgeErrorMessage(error)); }
  }, [updatePreferences]);
  const executeVoiceCommand = useCallback(async (transcript: string) => {
    const command = identifyCommand(transcript);
    if (command === 'read') { void readPage(); return; }
    if (command === 'stop') { stopSpeaking(); setFeedback('Lectura detenida.'); return; }
    if (command === 'contrast') { await updatePreferences({ highContrast: !preferences.highContrast }); setFeedback('Contraste actualizado.'); return; }
    if (command === 'simplified') { await updatePreferences({ simplifiedMode: !preferences.simplifiedMode }); setFeedback('Modo simplificado actualizado.'); return; }
    if (command === 'increaseText') { await updatePreferences({ fontSize: preferences.fontSize === 'x-large' ? 'normal' : preferences.fontSize === 'normal' ? 'large' : 'x-large' }); setFeedback('Tamaño de letra actualizado.'); return; }
    if (command === 'summary') { const page = await requestSummary(); if (page) speak(`${page.title}. Hay ${page.headings.length} secciones y ${page.links.length} enlaces.`, preferences); return; }
    if (command === 'navigate') { try { const result = await sendToPage<{ found: boolean }>({ type: 'NAVI_NAVIGATE', command: transcript }); setFeedback(result.found ? 'Navegando a la sección solicitada.' : 'No encontré esa sección en esta página.'); } catch (error) { setFeedback(bridgeErrorMessage(error)); } return; }
    setFeedback('No reconocí el comando. Prueba con “leer página” o “ir a tareas”.'); speak('No reconocí el comando. Prueba con leer página o ir a tareas.', preferences);
  }, [preferences, readPage, requestSummary, updatePreferences]);
  const listen = useCallback(async () => {
    try { (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((track) => track.stop()); }
    catch { setFeedback(micErrors['not-allowed'] ?? ''); void browser.tabs.create({ url: browser.runtime.getURL('/options.html#/voz') }); return; }
    startSpeechRecognition((transcript) => { setListening(false); setFeedback(`Escuché: ${transcript}`); void executeVoiceCommand(transcript); }, (status, detail) => { setListening(status === 'listening'); if (status === 'error') setFeedback(micErrors[detail ?? ''] ?? 'No se pudo reconocer la voz. Inténtalo otra vez.'); if (status === 'unsupported') setFeedback(detail ?? 'No se pudo reconocer la voz.'); });
  }, [executeVoiceCommand]);
  const nextFontSize = () => void updatePreferences({ fontSize: preferences.fontSize === 'x-large' ? 'normal' : preferences.fontSize === 'normal' ? 'large' : 'x-large' });
  return <main className="navi-panel"><header className="navi-header"><NaviLogo size={46} decorative /><div><h1>Navi</h1><p>{userName ? `Hola, ${userName} · ` : ''}Accesibilidad para UTP Class</p></div></header><CommandFeedback message={feedback} /><QuickActions highContrast={preferences.highContrast} simplifiedMode={preferences.simplifiedMode} onRead={() => void readPage()} onContrast={() => void updatePreferences({ highContrast: !preferences.highContrast })} onSimplified={() => void updatePreferences({ simplifiedMode: !preferences.simplifiedMode })} onFontIncrease={nextFontSize} /><TextReader onRead={() => void readPage()} onStop={stopSpeaking} /><VoiceAssistant listening={listening} supported={voiceSupported} onListen={() => void listen()} /><section className="navi-card"><h2>Contenido multimedia</h2><CaptionsToggle enabled={preferences.captionsEnabled} onChange={(enabled) => void changeCaptions(enabled)} /></section><SummaryCard summary={summary} /><a className="navi-settings-link" href="/options.html#/configuracion" target="_blank">Abrir el Centro Navi</a></main>;
}
