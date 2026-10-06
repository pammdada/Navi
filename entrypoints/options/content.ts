import {
  AudioLines,
  Brain,
  Captions,
  Contrast,
  Ear,
  Eye,
  Hand,
  HeartHandshake,
  ListOrdered,
  MessageSquareText,
  Mic,
  Palette,
  ScreenShare,
  Sparkles,
  Type,
  Zap,
  ZoomIn,
  type LucideIcon,
} from 'lucide-react';
import type { NeedProfile } from '@/utils/storage';
import type { RouteId } from './routes';

export interface Feature {
  title: string;
  description: string;
  route: RouteId;
  icon: LucideIcon;
}

/** Las 9 funciones de la propuesta de solución. */
export const features: Feature[] = [
  { title: 'Lectura en voz alta', description: 'Navi lee el contenido de tus cursos por ti.', route: 'lectura', icon: AudioLines },
  { title: 'Voz a texto', description: 'Habla y Navi escribe lo que dices.', route: 'voz', icon: MessageSquareText },
  { title: 'Alto contraste', description: 'Colores fuertes para distinguir mejor el texto.', route: 'lectura', icon: Contrast },
  { title: 'Tamaño de letra', description: 'Agranda el texto hasta que leas cómodo.', route: 'lectura', icon: Type },
  { title: 'Comandos de voz', description: 'Di "ir a cursos" o crea tus propias frases.', route: 'voz', icon: Mic },
  { title: 'Accesos rápidos', description: 'Activa varios ajustes con un solo clic.', route: 'inicio', icon: Zap },
  { title: 'Lectores de pantalla', description: 'Compatible con NVDA, JAWS y Narrador.', route: 'ayuda', icon: ScreenShare },
  { title: 'Modo simplificado', description: 'Menos elementos, solo lo esencial.', route: 'configuracion', icon: Sparkles },
  { title: 'Subtítulos automáticos', description: 'Texto en los videos de tus clases.', route: 'multimedia', icon: Captions },
  { title: 'Lectura guiada', description: 'Lee sección por sección y resalta lo que lee.', route: 'lectura', icon: ListOrdered },
  { title: 'Lupa de lectura', description: 'Amplía solo la zona que quieres leer.', route: 'lectura', icon: ZoomIn },
  { title: 'Colores para daltonismo', description: 'Paletas que no dependen del rojo, verde o azul.', route: 'configuracion', icon: Palette },
];

export const needIcons: Record<NeedProfile, LucideIcon> = {
  visual: Eye,
  auditiva: Ear,
  motora: Hand,
  cognitiva: Brain,
  mayor: HeartHandshake,
};

export const audiences: { need: NeedProfile; title: string; description: string }[] = [
  { need: 'visual', title: 'Personas con discapacidad visual', description: 'Lectura en voz alta, letra grande y alto contraste.' },
  { need: 'auditiva', title: 'Personas con discapacidad auditiva', description: 'Subtítulos y avisos siempre visibles en texto.' },
  { need: 'motora', title: 'Personas con discapacidad motora', description: 'Control por voz y botones grandes, todo con teclado.' },
  { need: 'cognitiva', title: 'Personas con dificultades cognitivas leves', description: 'Pantallas sencillas, pasos cortos y lenguaje claro.' },
  { need: 'mayor', title: 'Adultos mayores', description: 'Pocas opciones a la vez y ayuda siempre a mano.' },
];

export const utpSteps = [
  'Fija Navi en la barra del navegador: pulsa el ícono de rompecabezas y luego el alfiler junto a Navi.',
  'Entra a UTP Class (class.utp.edu.pe) e inicia sesión como siempre.',
  'Pulsa el ícono de Navi: se abrirá el panel lateral con todas las herramientas.',
  'Pulsa "Leer" para escuchar la página, o "Hablar" y di "leer página".',
];

