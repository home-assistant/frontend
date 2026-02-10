---
name: keyboard-shortcuts
description: Register safe keyboard shortcuts with ShortcutManager. Use when handling focused inputs, text selection, and non-latin keyboard fallback behavior.
---

### Keyboard Shortcuts (ShortcutManager)

The `ShortcutManager` class provides a unified way to register keyboard shortcuts with automatic input field protection.

**Key Features:**

- Automatically blocks shortcuts when input fields are focused
- Prevents shortcuts during text selection (configurable via `allowWhenTextSelected`)
- Supports both character-based and KeyCode-based shortcuts (for non-latin keyboards)

**Implementation:**

- **Class definition**: `src/common/keyboard/shortcuts.ts`
- **Real-world example**: `src/state/quick-bar-mixin.ts` - Global shortcuts (e, c, d, m, a, Shift+?) with non-latin keyboard fallbacks
