import type { ReadingPlan } from './reading-plan.ts';

/** continuous = "Leer": avanza sola por toda la página. stepped = "Guía": lee una sección y espera. */
export type ReaderMode = 'continuous' | 'stepped';
export type ReaderStatus = 'idle' | 'playing' | 'paused';

export interface ReaderState {
  status: ReaderStatus;
  mode: ReaderMode;
  sectionIndex: number;
  sectionCount: number;
  sectionTitle: string;
  /** Mensaje corto para mostrar y anunciar, por ejemplo "Sección 2 de 5: Actividades". */
  message: string;
}

export interface ReaderDeps {
  /** Lee el texto en voz alta y llama a onEnd cuando termina (no debe llamarlo si se canceló). */
  speak: (text: string, onEnd: () => void) => void;
  stopSpeaking: () => void;
  /** Resalta el elemento de la página que se está leyendo; null quita el resaltado. */
  highlight: (elementId: string | null) => void;
  onChange: (state: ReaderState) => void;
}

interface Step { text: string; elementId: string | null; }

export const idleState: ReaderState = { status: 'idle', mode: 'continuous', sectionIndex: 0, sectionCount: 0, sectionTitle: '', message: '' };

export class GuidedReader {
  private steps: Step[][];
  private token = 0;
  private section = 0;
  private step = 0;
  private mode: ReaderMode = 'continuous';
  private status: ReaderStatus = 'idle';
  private message = '';
  private waitingForNext = false;

  private plan: ReadingPlan;
  private deps: ReaderDeps;

  constructor(plan: ReadingPlan, deps: ReaderDeps) {
    this.plan = plan;
    this.deps = deps;
    const units = new Map(plan.units.map((unit) => [unit.id, unit]));
    this.steps = plan.sections.map((section, index) => {
      const ids = [...section.unitIds];
      const first = units.get(ids[0] ?? '');
      const headingUnit = first?.type === 'heading' ? first : null;
      if (headingUnit) ids.shift();
      const announcement: Step = { text: `Sección ${index + 1} de ${plan.sections.length}: ${section.title}.`, elementId: headingUnit?.elementId ?? null };
      return [announcement, ...ids.map((id) => units.get(id)!).filter(Boolean).map((unit) => ({ text: unit.text, elementId: unit.elementId }))];
    });
  }

  get isEmpty(): boolean {
    return this.plan.units.length === 0;
  }

  get state(): ReaderState {
    const section = this.plan.sections[this.section];
    return {
      status: this.status,
      mode: this.mode,
      sectionIndex: this.section,
      sectionCount: this.plan.sections.length,
      sectionTitle: section?.title ?? '',
      message: this.message,
    };
  }

  private emit() {
    this.deps.onChange(this.state);
  }

  private sectionMessage() {
    return `Sección ${this.section + 1} de ${this.plan.sections.length}: ${this.plan.sections[this.section]?.title ?? ''}`;
  }

  start(mode: ReaderMode, fromSection = 0): boolean {
    if (this.isEmpty) return false;
    this.mode = mode;
    this.section = Math.min(Math.max(fromSection, 0), this.plan.sections.length - 1);
    this.step = 0;
    this.play();
    return true;
  }

  private play() {
    this.token += 1;
    this.status = 'playing';
    this.waitingForNext = false;
    this.message = this.sectionMessage();
    this.emit();
    this.runStep(this.token);
  }

  private runStep(token: number) {
    const step = this.steps[this.section]?.[this.step];
    if (!step) return this.finish();
    this.deps.highlight(step.elementId);
    this.deps.speak(step.text, () => {
      if (token === this.token) this.advance(token);
    });
  }

  private advance(token: number) {
    const sectionSteps = this.steps[this.section] ?? [];
    if (this.step + 1 < sectionSteps.length) {
      this.step += 1;
      return this.runStep(token);
    }
    if (this.section + 1 >= this.plan.sections.length) return this.finish();
    if (this.mode === 'continuous') {
      this.section += 1;
      this.step = 0;
      this.message = this.sectionMessage();
      this.emit();
      return this.runStep(token);
    }
    this.status = 'paused';
    this.waitingForNext = true;
    this.message = 'Fin de la sección. Pulsa Siguiente para continuar.';
    this.deps.highlight(null);
    this.emit();
  }

  private finish() {
    this.token += 1;
    this.status = 'idle';
    this.message = 'Terminé de leer la página.';
    this.deps.highlight(null);
    this.emit();
  }

  pause() {
    if (this.status !== 'playing') return;
    this.token += 1;
    this.deps.stopSpeaking();
    this.status = 'paused';
    this.message = `En pausa · ${this.sectionMessage()}`;
    this.emit();
  }

  resume() {
    if (this.status !== 'paused') return;
    if (this.waitingForNext) return this.next();
    this.play();
  }

  playPause() {
    if (this.status === 'playing') this.pause();
    else if (this.status === 'paused') this.resume();
  }

  next() {
    if (this.status === 'idle') return;
    if (this.section + 1 >= this.plan.sections.length) {
      this.message = 'Esta es la última sección.';
      return this.emit();
    }
    this.deps.stopSpeaking();
    this.section += 1;
    this.step = 0;
    this.play();
  }

  /** Si ya avanzaste dentro de la sección, vuelve a su inicio; si estás al inicio, va a la sección anterior. */
  previous() {
    if (this.status === 'idle') return;
    this.deps.stopSpeaking();
    if (this.step <= 1 && this.section > 0) this.section -= 1;
    this.step = 0;
    this.play();
  }

  stop() {
    const wasActive = this.status !== 'idle';
    this.token += 1;
    this.deps.stopSpeaking();
    this.deps.highlight(null);
    this.status = 'idle';
    this.message = wasActive ? 'Lectura detenida.' : '';
    this.emit();
  }
}
