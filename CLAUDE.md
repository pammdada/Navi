# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Navi is a browser accessibility extension (WXT + React 19 + TypeScript) for UTP Class (`class.utp.edu.pe`). It adds a side panel with guided text-to-speech reading, a reading magnifier, Spanish voice commands (built-in and personal), high contrast and color-blind palettes, font sizing, a simplified layout mode, caption toggling and a local page summary (optional AI summary). UI text, comments, and voice commands are in Spanish (`es-PE`).

## Commands

```bash
npm run dev            # Dev mode (Chrome) with hot reload
npm run dev:firefox    # Dev mode in Firefox
npm run compile        # Type-check only (tsc --noEmit) — the main verification step
npm test               # Unit tests for the pure modules (Node test runner)
npm run build          # Production build to .output/
npm run zip            # Package for store upload
```

Tests: `npm test` runs `tests/*.test.ts` with Node's built-in runner (no extra dependencies) against the pure modules. There is no linter. `npm install` runs `wxt prepare`, which generates `.wxt/` (types and auto-imports); rerun it if `browser`, `defineContentScript`, `storage`, etc. stop resolving. Browser behaviour (panel ↔ content script) has only been verified in a simulated harness, not in a real Chrome with a logged-in UTP Class session.

## Architecture

WXT discovers entrypoints by filename under `entrypoints/`; the manifest (permissions, host permissions) lives in `wxt.config.ts`. Globals like `browser`, `defineBackground`, `defineContentScript` are auto-imported; `storage` comes from `#imports`. `@/` is the project-root alias.

- **`entrypoints/background.ts`** — makes the toolbar icon open the side panel, runs `migrateStorage` (legacy keys → preferences) and opens the options page (onboarding) on install. There is deliberately **no popup**: a `default_popup` stops `openPanelOnActionClick` from working, so `wxt.config.ts` declares a bare `action` instead.
- **`entrypoints/sidepanel/`** — short, visual panel: `SidePanel.tsx` (layout + wiring), `hooks.ts` (`usePreferences`, `useGuidedReading`, stored values), `components.tsx` (`PanelButton`, `ReaderBar`, `SummaryCard` incl. the opt-in AI summary flow). Styled with Tailwind via the shared `styles/navi-ui.css`; the panel applies the user's contrast/size preferences to itself too.
- **`entrypoints/utp-content.content.ts`** — content script on UTP Class. Applies preferences, runs the DOM enhancer (`utils/page-enhancer.ts`: main landmark, skip link, accessible names, status icons/labels for color-blind palettes, re-run on SPA changes) and answers a **closed set** of messages from the panel (`NAVI_PING`, `NAVI_GET_READING_PLAN`, `NAVI_HIGHLIGHT_UNIT`, `NAVI_CLEAR_READING`, `NAVI_APPLY_CAPTIONS`, `NAVI_TOGGLE_LENS`). There is intentionally no message that clicks or navigates. Guarded by `window.__naviContentLoaded`.
- **`entrypoints/options/`** — the "Centro Navi": onboarding, then a sidebar app (Inicio, Lectura, Voz, Mis comandos, Multimedia, Configuración, Ayuda) routed by hash (`routes.ts`). `state.tsx` autosaves with undo toasts. Shared styles in `styles/navi-ui.css`.
- **`components/NaviLogo.tsx`** — shared SVG logo. **`utils/profiles.ts`** — needs profiles → preference presets.

### Pure vs. browser modules

Logic that must be testable lives in modules with no browser/WXT imports: `preferences.ts`, `color-vision.ts`, `reading-plan.ts`, `guided-reader.ts`, `command-runner.ts`, `speech/commands.ts`, `navigation.ts`, `status-labels.ts`, `ai-summary.ts`. They import each other with explicit `.ts` extensions (so Node can run them) and only `import type` from `storage.ts` (which pulls `#imports`). Everything touching `browser`, the DOM or `storage` stays in the other files. Node's type stripping rejects parameter properties and enums, so don't use them in the pure modules.

### Data flow

1. **Preferences** are one object, `accessibilityPreferences` (`sync:accessibility-preferences`). `colorVisionMode` (`standard | high-contrast | red-green-safe | blue-yellow-safe`) and `highContrast` must never contradict: **always write through `mergePreferences` / read through `normalizePreferences`** (`utils/preferences.ts`). `userProfile` (`sync:user-profile`) holds name/needs; `customCommands` (`local:custom-commands`) holds personal voice phrases; `aiSummarySettings` (`local:ai-summary-settings`) holds the optional AI server URL. The content script `watch`es preferences and `applyAccessibilityPreferences` toggles classes/data-attributes on `<html>`; the look lives in `styles/utp-content.css`. **Color-blind palettes are not CSS overrides**: `utils/page-colors.ts` reads the real computed colors (text, backgrounds, borders, SVG fill/stroke) and, via `color-vision.ts`, rotates only the hues that type of vision confuses (rg: green→200°; by: blue/cyan→330°) in OKLCH while keeping each color's relative luminance, so WCAG contrast is unchanged. Never force `color` on links/buttons (that produced blue-on-red buttons at 1.4:1 contrast). Writes are inline `!important` and fully reversible (`restore`); new SPA nodes are re-scanned. Target hues were picked by measuring pairs under Machado-2009 simulation (see `tests/color-vision.test.ts`). Limits: images, video, canvas charts and hover colors on recolored elements are not handled. Font size uses CSS `zoom` (html font-size does nothing on px sites). `voiceEnabled` disables the mic in the panel; `captionsEnabled` is applied by the content script from any screen.
2. **Panel → page** goes through `sendToPage` (`utils/page-bridge.ts`): it pings first and injects script + CSS **only when the ping fails**, then sends the real message. `openSafeRoute` opens fixed URLs only.
3. **Safe navigation** (`utils/navigation.ts`): the only destinations are the entries of `safeRoutes`. Only `courses` is `verified`. "Tareas", "Notas" and "Anuncios" stay disabled (button shows "Próximamente", voice replies that the route isn't validated) until someone tests the real authenticated UTP Class, writes the URL in `safeRoutes` and flips `verified: true`. Never navigate by clicking elements found on the page, and never let voice or custom commands submit/delete/confirm anything.
4. **Voice & commands**: recognition/synthesis run in the side panel (`utils/speech/`). `commandCatalog` + `resolveVoiceCommand` map a transcript to a `VoiceCommand` (custom phrases first); `runCommand` (`utils/command-runner.ts`) executes it against a `CommandContext` and returns the short status message. Custom commands may only pick actions from `customActionOptions`; `validateCustomCommand` rejects phrases that collide with built-ins ("Detener" must always work). Add a command = add it to `CommandAction`, `commandCatalog`, `runAction` and (if allowed for users) `customActionOptions`.
5. **Reading**: the content script turns the main content into a `ReadingPlan` of `ReadingUnit`s grouped in sections (`utils/page-reader.ts` + `reading-plan.ts`; menus, hidden text, repeated controls and duplicates are skipped). `GuidedReader` (panel side, no DOM) plays it unit by unit: *Leer* = continuous, *Guía* = stops after each section; prev/next move by section; the page highlights the current block via `data-navi-reading-active`. `UTP Class` is an SPA behind SSO (`sso.utp.edu.pe`) and the authenticated DOM was never inspected, so `findMainContainer` uses generic heuristics.
6. **Lupa** (`utils/page-lens.ts`) lives in a Shadow DOM so site CSS can't break it; it tells the panel when it closes (`NAVI_LENS_CLOSED`).
7. **Summaries**: the local summary (`createLocalSummary`) is always available and sends nothing anywhere. The AI summary (`utils/ai-summary.ts`, backend contract in `docs/ai-summary-backend.md`) is off until the user sets an HTTPS server URL; it shows the exact payload, asks permission (`optional_host_permissions`) only on consent, validates the JSON strictly and renders it as plain text. The extension must never contain an API key.

### UX
<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>
"""