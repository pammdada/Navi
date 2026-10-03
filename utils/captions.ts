export interface CaptionResult { available: boolean; activated: number; message: string; }
export function setCaptions(enabled: boolean): CaptionResult {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video'));
  let activated = 0;
  videos.forEach((video) => Array.from(video.textTracks).forEach((track) => {
    if (track.kind === 'captions' || track.kind === 'subtitles') { track.mode = enabled ? 'showing' : 'hidden'; activated += 1; }
  }));
  if (!videos.length) return { available: false, activated: 0, message: 'No se detectó contenido multimedia en esta página.' };
  if (!activated) return { available: false, activated: 0, message: 'El video no incluye pistas de subtítulos que puedan activarse.' };
  return { available: true, activated, message: enabled ? 'Subtítulos activados.' : 'Subtítulos desactivados.' };
}
