# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Navi is a browser accessibility extension (WXT + React 19 + TypeScript) for UTP Class (`class.utp.edu.pe`). It adds a side panel with text-to-speech page reading, Spanish voice commands, high contrast, font sizing, a simplified layout mode, and toggling of available video caption tracks. UI text, comments, and voice commands are in Spanish (`es-PE`).

## Commands

```bash
npm run dev            # Dev mode (Chrome) with hot reload
npm run dev:firefox    # Dev mode in Firefox
npm run compile        # Type-check only (tsc --noEmit) — the main verification step
npm run build          # Production build to .output/
npm run zip            # Package for store upload
```

There is no test suite or linter configured. `npm install` runs `wxt prepare`, which generates `.wxt/` (types and auto-imports); rerun it if `browser`, `defineContentScript`, `storage`, etc. stop resolving.

## Architecture

WXT discovers entrypoints by filename under `entrypoints/`; the manifest (permissions, host permissions) lives in `wxt.config.ts`. Globals like `browser`, `defineBackground`, `defineContentScript` are auto-imported; `storage` comes from `#imports`. `@/` is the project-root alias.

- **`entrypoints/background.ts`** — makes the toolbar icon open the side panel and opens the options page (onboarding) on install. There is deliberately **no popup**: a `default_popup` stops `openPanelOnActionClick` from working, so `wxt.config.ts` declares a bare `action` instead.
- **`entrypoints/sidepanel/`** — the main UI. `SidePanel.tsx` holds all state and logic (preferences, voice command dispatch, summary requests); the `components/` are presentational and receive callbacks via props.
- **`entrypoints/utp-content.content.ts`** — content script injected on UTP Class pages. Applies preferences, starts the DOM enhancer (`utils/page-enhancer.ts`: main landmark, skip link, accessible names/alt text, re-run on SPA changes via `MutationObserver`) and answers messages from the side panel. Guarded by `window.__naviContentLoaded` because the panel can inject it again.
- **`entrypoints/options/`** — the "Centro Navi": 5-step onboarding (name, needs profile, adjustments) and, once completed, a sidebar app with Inicio / Lectura / Voz / Multimedia / Configuración / Ayuda routed by hash (`routes.ts`). State lives in `state.tsx` (autosave with undo toasts). Styled with Tailwind (`options.css`); the side panel still uses plain CSS.
- **`components/NaviLogo.tsx`** — shared SVG logo; **`utils/profiles.ts`** — needs profiles → preference presets.

### Data flow

1. **Preferences** are a single object, `accessibilityPreferences` (`sync:accessibility-preferences`) in `utils/storage.ts`. The side panel and options page write it; the content script `watch`es it and calls `applyAccessibilityPreferences`, which only toggles classes/data-attributes on `<html>` (`navi-high-contrast`, `navi-simplified-mode`, `navi-reduce-motion`, `data-navi-font-size`). Font size is applied with CSS `zoom` on UTP Class (changing `html` font-size does nothing on sites that use px). The onboarding profile (name, needs) is `userProfile` (`sync:user-profile`). The actual page styling lives in `styles/utp-content.css` (heavy use of `!important` to override UTP Class styles). The other storage items in that file (`idioma`, `velocidadLectura`, `volumen`, `mostrarAyudaComandos`) are currently unused.
2. **Side panel → page** communication goes through `sendToPage` in `utils/page-bridge.ts`, which targets the active UTP Class tab and, if the content script is missing (tab opened before install/reload), injects script + CSS and retries. Message types `NAVI_GET_PAGE_SUMMARY`, `NAVI_APPLY_CAPTIONS`, `NAVI_NAVIGATE` (typed as `ContentRequest` in the content script). Adding a page capability means adding a message type there and a handler in `SidePanel.tsx`. It throws `PageBridgeError` when the active tab is not UTP Class; callers show `bridgeErrorMessage`.
3. **Voice**: speech recognition and synthesis (Web Speech API) run in the side panel, not the page (`utils/speech/`). `identifyCommand` maps a transcript to a `VoiceCommand` via Spanish regexes; `executeVoiceCommand` in `SidePanel.tsx` dispatches it. New commands require changes in both places.
4. **Page analysis** (`utils/dom-analyzer.ts`) extracts title/headings/links/main text for reading and summaries, and finds navigation targets by keyword (cursos, tareas, calificaciones, anuncios). UTP Class is an SPA behind SSO (`sso.utp.edu.pe`) that may not declare `<main>`, so `findMainContainer` falls back to descending toward the child holding most non-link text. Selectors are generic rather than tied to UTP Class markup (the authenticated DOM was never inspected). Speech is split into short chunks (`splitIntoChunks`) because Chrome cuts long utterances. `utils/captions.ts` sets the `mode` of existing `captions`/`subtitles` text tracks on page `<video>` elements.
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