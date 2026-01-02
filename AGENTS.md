# Repository Guidelines

## Project Structure & Module Organization
- Core userscripts live in `src/*.user.js`; each file is self-contained and shipped as-is to Tampermonkey.
- Feature-specific build sources sit under `dev/<script>/` (for example, `dev/Readability` and `dev/ChatGPTVoiceInput`) with `*.user.src.js` plus headers; build outputs are copied back into `src/`.
- Supporting assets and release notes live in `images/` and `docs/`. Keep docs close to the feature folder they describe.

## Build, Test, and Development Commands
- Simple edits: modify the target file in `src/` and keep the metadata block intact.
- Build pipelines (per subfolder):
  - `cd dev/Readability && npm install && npm run build` to bundle the Readability-based context-menu scripts and sync them into `src/`.
  - `cd dev/ChatGPTVoiceInput && npm install && npm run build` for the voice input script.
  - `cd dev/dom-to-image && npm install && npm run build` for the DOM snapshot helper.
- After a build, verify the generated `*.user.js` appears in `src/` and retains the expected version header.

## Coding Style & Naming Conventions
- `.editorconfig` enforces LF endings, UTF-8, trimmed whitespace, and `indent_size = 4` for `*.js` (Makefiles and batch files use tabs). Markdown keeps trailing spaces when needed.
- Userscript files follow `PascalCase.user.js` with a `// ==UserScript==` metadata block; keep fields minimal and aligned to Tampermonkey’s schema.
- Prefer `const`/`let`, early returns, and small helpers over deep nesting; avoid introducing dependencies unless scoped to a `dev/` build.
- Keep comments brief and practical, focusing on browser quirks, selectors, and shortcut mappings.

## Script Style Guide (Observed in `src`)
- Wrap each userscript in an IIFE and place `'use strict';` at the top of the wrapper.
- Keep the metadata block intact; include only needed `@grant` entries, add `@run-at` when timing matters, and keep `@match` scopes tight.
- Use 4-space indentation, semicolons, and blank lines between logical sections.
- Prefer `const` for constants and DOM handles, `let` for mutable state; some legacy scripts use `var`, so stay consistent within a given file.
- Keep helpers small and focused (`debounce`, `waitForElement`, `simulateClick`, `shouldIgnoreEvent`) and rely on early returns to avoid deep nesting.
- Hotkey handlers should ignore typing contexts (`input`, `textarea`, `[contenteditable]`), avoid modifier collisions, and call `preventDefault()` when taking over shortcuts.
- DOM queries should be defensive: check for null, use optional chaining, and short-circuit when elements are missing.
- For SPA pages, use `MutationObserver` plus URL change checks (often with debounce) or dispatch custom `locationchange` events via `history` overrides.
- When parsing DOM or JSON that might fail, wrap in `try/catch` and fail quietly; keep console logging purposeful or commented out.
- CSS injection is typically done with `GM_addStyle` and template literals; keep class names/regexes as constants and toggle via a root class when needed.
- If a `src` file is a bundled output (large wrapper/codegen), edit the matching `dev/` source and rebuild instead of formatting the bundle.

## Userscript Header Pattern (Observed in `src`)
- Every script includes these fields in order: `@name`, `@version`, `@description`, `@license`, `@homepage`, `@homepageURL`, `@website`, `@source`, `@namespace`, `@author`.
- `@source` and `@namespace` both point to the raw GitHub URL for the same file under `src/`.
- `@homepage`, `@homepageURL`, and `@website` are consistently set to the author’s sites; keep them unchanged unless ownership changes.
- Add one or more `@match` lines (and `@exclude` when needed) after the core fields; keep patterns minimal and specific.
- Optional lines appear after the match block: `@run-at` (when timing matters), then `@icon`, and then `@require`/`@grant` as needed; if no GM APIs are used, omit `@grant` or use `@grant        none`.
- If a script does not need GM APIs, always include `@grant        none` to make the intent explicit.
- Align header values to the same column using spaces for readability.

Template:
```js
// ==UserScript==
// @name         <Site>: <Short title>
// @version      0.1.0
// @description  <One-line summary of behavior>
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/<Script>.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/<Script>.user.js
// @author       Will Huang
// @match        https://example.com/*
// @exclude      https://example.com/ignore/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=example.com
// @require      https://cdn.example.com/library.js
// @grant        GM_setClipboard
// ==/UserScript==
```

## Testing Guidelines
- No automated test suite; perform manual checks in the target site with the script enabled in Tampermonkey (Developer Mode on).
- Validate hotkeys, DOM mutations, and content scripts in multiple pages/states; confirm console is clean of errors.
- When changing networked scripts (e.g., Gemini/GPT helpers), dry-run with fake keys or mock responses before using real tokens.

## Commit & Pull Request Guidelines
- Commit messages: concise, imperative, and scoped (e.g., `Add safety check for empty selection`, `Build Readability bundle`); avoid noisy churn from generated files unless the build is part of the change.
- Pull requests: include a short summary, linked issue (if any), before/after notes, and screenshots or GIFs for UI-visible tweaks; list manual test URLs and browsers used.

## Security & Configuration Tips
- Do not commit API keys or site tokens; if a script needs credentials, document how to inject them at runtime (local storage or Tampermonkey config) and keep defaults benign.
- Limit `@match` patterns to the minimum necessary scope and avoid wildcarding sensitive domains.
