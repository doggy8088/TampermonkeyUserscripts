# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a collection of Tampermonkey userscripts (browser extensions) created by Will Huang to enhance web browsing experience and productivity. The userscripts improve UI/UX on various websites including ChatGPT, Azure DevOps, Facebook, Microsoft Learn, GitHub, and many others.

## Repository Structure

### Main Directories
- `src/` - Production-ready userscripts (.user.js files)
- `dev/` - Development workspace with source files and build tools
- `scripts/` - Utility scripts 
- `images/` - Documentation images
- `tasks/` - Task-related files

### Development Structure
The `dev/` directory contains specialized build environments:
- `dev/ChatGPTVoiceInput/` - Voice input functionality for ChatGPT
- `dev/Readability/` - Text processing and translation tools
- `dev/dom-to-image/` - DOM screenshot functionality

## Build System

### For Complex Scripts (in dev/ subdirectories)

Each complex userscript has its own build environment using esbuild:

**ChatGPT Voice Input:**
```bash
cd dev/ChatGPTVoiceInput
npm run build
```

**Readability Tools:**
```bash
cd dev/Readability
npm run build
```

**DOM to Image:**
```bash
cd dev/dom-to-image
npm run build
```

### Build Process
The build process combines:
1. Source JavaScript files (`.user.src.js`)
2. Header files (`.user.header.txt`) containing userscript metadata
3. esbuild bundling for external dependencies
4. Output to `dist/` directory and copying to `src/` for distribution

## Userscript Architecture

### Standard Structure
Each userscript follows this pattern:
1. **Header Section** - Tampermonkey metadata with @name, @version, @match, etc.
2. **Main Function** - Wrapped in IIFE for scope isolation
3. **Event Listeners** - Keyboard shortcuts and DOM interactions
4. **Utility Functions** - Site-specific logic and enhancements

### Key Features
- **Keyboard Shortcuts** - Most scripts use Alt+key combinations
- **Site-Specific Logic** - Pattern matching for different websites
- **DOM Manipulation** - Direct modification of webpage elements
- **Cross-Site Compatibility** - Many scripts work across multiple domains

### Development Patterns
- Use `document.addEventListener('keydown', ...)` for keyboard shortcuts
- Check for excluded targets (input, textarea, etc.) to avoid conflicts
- Implement site-specific logic with hostname detection
- Use `location.hostname` and `location.href` for URL manipulation

## Common Development Commands

### Installing Dependencies
```bash
cd dev/[project-name]
npm install
```

### Building Individual Scripts
```bash
cd dev/[project-name]
npm run build
```

### Building with Minification
```bash
cd dev/[project-name]
npm run build:prod
```

## Script Categories

### AI/Chat Enhancements
- ChatGPT voice input, hotkeys, translation tools
- Gemini integration scripts
- Claude punctuation fixes

### Developer Tools
- Azure DevOps enhancements (hotkeys, dark mode, wiki improvements)
- GitHub tools (dark mode switcher, documentation hotkeys)
- Microsoft Learn navigation improvements

### General Productivity
- Language switcher for websites
- Reading mode enhancements
- Tracking token removal
- URL copying utilities

## Testing and Deployment

### Manual Testing
1. Build the script using appropriate npm command
2. Copy from `dist/` to `src/` (done automatically by build process)
3. Install in Tampermonkey for testing
4. Test on target websites

### Version Management
- Version numbers are managed in header files
- Update version in `.user.header.txt` files before building
- Build process automatically includes version in final output

## Notes for Development

- All scripts are designed to be non-intrusive and safe
- Focus on improving user experience without breaking website functionality
- Use defensive programming - check for element existence before manipulation
- Maintain compatibility across different browser versions
- Follow existing code patterns when adding new functionality