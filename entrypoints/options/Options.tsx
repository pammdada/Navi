import { AccessibilityButton } from './components/AccessibilityButton';
import { AppShell } from './components/AppShell';
import { StatusToast } from './components/StatusToast';
import { Onboarding } from './onboarding/Onboarding';
import { useHashRoute, type RouteId } from './routes';
import { NaviProvider, useNavi } from './state';
import { CommandsView } from './views/CommandsView';
import { HelpView } from './views/HelpView';
import { HomeView } from './views/HomeView';
import { MediaView } from './views/MediaView';
import { ReadingView } from './views/ReadingView';
import { SettingsView } from './views/SettingsView';
import { VoiceView } from './views/VoiceView';

const views: Record<RouteId, () => React.JSX.Element> = {
  inicio: HomeView,
  lectura: ReadingView,
  voz: VoiceView,
  comandos: CommandsView,
  multimedia: MediaView,
  configuracion: SettingsView,
  ayuda: HelpView,
};

function CentroNavi() {
  const { ready, profile } = useNavi();
  const [route] = useHashRoute();

  if (!ready) {
    return (
      <p role="status" className="grid min-h-dvh place-items-center text-xl font-bold">
        Cargando Navi…
      </p>
    );
  }

  const View = views[route];
  return (
    <>
      {profile.onboardingCompleted ? (
        <AppShell route={route}>
          <View key={route} />
        </AppShell>
      ) : (
        <Onboarding />
      )}
      <StatusToast />
      <AccessibilityButton />
    </>
  );
}

export default function Options() {
  return (
    <NaviProvider>
      <CentroNavi />
    </NaviProvider>
  );
}
