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
