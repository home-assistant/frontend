# Migration Plan: Overflow Menus to `ha-dropdown`

This document outlines the step-by-step migration plan for converting all overflow menus from the legacy `ha-button-menu` and `ha-md-button-menu` components to the new `ha-dropdown` component.

## Overview

### Current Status (as of Dec 4, 2025)
- **PR #28293** (Merged): Migrated automation/script editors and related components
- **PR #28300** (Merged): Migrated Lovelace card edit mode components
- **PR #28337** (Open): Migrating logs, QR scanner, data table labels

### Migration Pattern

The migration follows these patterns:

**Component Replacements:**
- `ha-button-menu` → `ha-dropdown`
- `ha-md-button-menu` → `ha-dropdown`
- `ha-list-item` → `ha-dropdown-item`
- `ha-md-menu-item` → `ha-dropdown-item`
- `ha-md-divider` or `<li divider>` → `<wa-divider>`

**Attribute/Event Changes:**
- `slot="graphic"` or `slot="start"` → `slot="icon"`
- `@click` handlers → Use `value` attribute and `@wa-select` event handler
- `.clickAction` → Use `value` attribute and switch in handler
- `class="warning"` → `variant="danger"`
- `positioning`, `anchor-corner`, `menu-corner` → `placement="bottom-end"`

**Import Changes:**
- Remove: `import "../../../components/ha-button-menu"`, `import "../../../components/ha-list-item"`
- Remove: `import "../../../components/ha-md-button-menu"`, `import "../../../components/ha-md-menu-item"`, `import "../../../components/ha-md-divider"`
- Add: `import "../../../components/ha-dropdown"`, `import "../../../components/ha-dropdown-item"`
- Add: `import type { HaDropdownItem } from "../../../components/ha-dropdown-item"`
- Add: `import "@home-assistant/webawesome/dist/components/divider/divider"` (for dividers)

### Reference PRs
- #28293 - Initial migration (automations/scripts) ✅ Merged
- #28300 - Migration of Lovelace card edit mode components ✅ Merged
- #28337 - Migration of logs, QR scanner, data table labels (Open)

---

## Phase 1: Migrate `ha-button-menu` + `ha-list-item` (~44 files remaining)

### PR 1: Config Logs & System Components
**Status:** Partially covered by PR #28337 (pending merge)
**Files (3):**
1. `src/panels/config/logs/ha-config-logs.ts` - Log provider selection *(in PR #28337)*
2. `src/panels/config/logs/error-log-card.ts` - Error log menu
3. `src/panels/config/logs/system-log-card.ts` - System log menu

### PR 2: Config Backup (Part 1)
**Files (3):**
1. `src/panels/config/backup/ha-config-backup-backups.ts`
2. `src/panels/config/backup/ha-config-backup-details.ts`
3. `src/panels/config/backup/ha-config-backup-overview.ts`

### PR 3: Config Backup (Part 2)
**Files (2):**
1. `src/panels/config/backup/ha-config-backup-settings.ts`
2. `src/panels/config/backup/ha-config-backup-location.ts`

### PR 4: Config Areas
**Files (2):**
1. `src/panels/config/areas/ha-config-area-page.ts`
2. `src/panels/config/areas/ha-config-areas-dashboard.ts`

### PR 5: Config Cloud
**Files (2):**
1. `src/panels/config/cloud/login/cloud-login-panel.ts`
2. `src/panels/config/cloud/account/cloud-account.ts`

### PR 6: Config Voice Assistants
**Files (3):**
1. `src/panels/config/voice-assistants/dialog-voice-assistant-pipeline-detail.ts`
2. `src/panels/config/voice-assistants/assist-pref.ts`
3. `src/panels/config/voice-assistants/ha-config-voice-assistants-expose.ts`

### PR 7: Config Scene & Network
**Files (2):**
1. `src/panels/config/scene/ha-scene-editor.ts`
2. `src/panels/config/network/supervisor-network.ts`

### PR 8: Config Dashboard & Updates
**Files (2):**
1. `src/panels/config/dashboard/ha-config-dashboard.ts`
2. `src/panels/config/core/ha-config-section-updates.ts`

### PR 9: Config Integrations (Part 1)
**Files (3):**
1. `src/panels/config/integrations/ha-config-flow-card.ts`
2. `src/panels/config/integrations/ha-config-integrations-dashboard.ts`
3. `src/panels/config/integrations/integration-panels/thread/thread-config-panel.ts`

### PR 10: Config Repairs & Devices
**Files (2):**
1. `src/panels/config/repairs/ha-config-repairs-dashboard.ts`
2. `src/panels/config/devices/ha-config-device-page.ts`

### PR 11: Config Automation Triggers & Conditions
**Files (2):**
1. `src/panels/config/automation/trigger/types/ha-automation-trigger-webhook.ts`
2. `src/panels/config/automation/trigger/types/ha-automation-trigger-persistent_notification.ts`

### PR 12: Config Automation Main Components
**Files (2):**
1. `src/panels/config/automation/trigger/ha-automation-trigger.ts`
2. `src/panels/config/automation/condition/ha-automation-condition.ts`

### PR 13: Lovelace Main & Edit Modes
**Files (3):**
1. `src/panels/lovelace/hui-root.ts`
2. `src/panels/lovelace/components/hui-badge-edit-mode.ts`
3. `src/panels/lovelace/components/hui-section-edit-mode.ts`

### PR 14: Lovelace Energy & Editors (Part 1)
**Files (3):**
1. `src/panels/lovelace/components/hui-energy-period-selector.ts`
2. `src/panels/lovelace/editor/view-header/hui-dialog-edit-view-header.ts`
3. `src/panels/lovelace/editor/view-editor/hui-dialog-edit-view.ts`

### PR 15: Lovelace Editors (Part 2)
**Files (3):**
1. `src/panels/lovelace/editor/dashboard-strategy-editor/dialogs/dialog-dashboard-strategy-editor.ts`
2. `src/panels/lovelace/editor/config-elements/hui-card-features-editor.ts`
3. `src/panels/lovelace/editor/section-editor/hui-dialog-edit-section.ts`

### PR 16: Lovelace Editors (Part 3)
**Files (2):**
1. `src/panels/lovelace/editor/card-editor/hui-card-layout-editor.ts`
2. `src/panels/lovelace/editor/conditions/ha-card-condition-editor.ts`

### PR 17: Lovelace Conditions
**Files (1):**
1. `src/panels/lovelace/editor/conditions/ha-card-conditions-editor.ts`

### PR 18: Media Browser & Player
**Files (3):**
1. `src/panels/media-browser/ha-bar-media-player.ts`
2. `src/panels/media-browser/ha-panel-media-browser.ts`
3. `src/components/media-player/dialog-media-player-browse.ts`

### PR 19: Calendar & History
**Files (2):**
1. `src/panels/calendar/ha-panel-calendar.ts`
2. `src/panels/history/ha-panel-history.ts`

### PR 20: Components (Part 1)
**Status:** Partially covered by PR #28337 (pending merge)
**Files (3):**
1. `src/components/ha-qr-scanner.ts` *(in PR #28337)*
2. `src/components/data-table/ha-data-table-labels.ts` *(in PR #28337)*
3. `src/components/ha-filter-categories.ts`

### PR 21: Components (Part 2)
**Files (2):**
1. `src/components/ha-form/ha-form-optional_actions.ts`
2. `src/components/media-player/ha-media-player-browse.ts` (Note: check if still using old component)

### PR 22: Todo Panel & Developer Tools
**Files (2):**
1. `src/panels/todo/ha-panel-todo.ts`
2. `src/panels/developer-tools/ha-panel-developer-tools.ts`

### PR 23: Dialogs (Part 1)
**Files (2):**
1. `src/dialogs/more-info/ha-more-info-dialog.ts`
2. `src/dialogs/voice-command-dialog/ha-voice-command-dialog.ts`

---

## Phase 2: Migrate `ha-md-button-menu` + `ha-md-menu-item` (20 files)

### PR 24: Form & Layout Components
**Files (2):**
1. `src/components/ha-form/ha-form-multi_select.ts`
2. `src/layouts/hass-tabs-subpage-data-table.ts`

### PR 25: Overflow Menu Components
**Files (2):**
1. `src/components/ha-icon-overflow-menu.ts`
2. `src/panels/profile/ha-refresh-tokens-card.ts`

### PR 26: Config Lovelace & Scene Dashboard
**Files (2):**
1. `src/panels/config/lovelace/dashboards/ha-config-lovelace-dashboards.ts`
2. `src/panels/config/scene/ha-scene-dashboard.ts`

### PR 27: Config Helpers & Entities
**Files (2):**
1. `src/panels/config/helpers/ha-config-helpers.ts`
2. `src/panels/config/entities/ha-config-entities.ts`

### PR 28: Config Automation & Script Pickers
**Files (2):**
1. `src/panels/config/automation/ha-automation-picker.ts`
2. `src/panels/config/script/ha-script-picker.ts`

### PR 29: Config Integrations (Part 1)
**Files (3):**
1. `src/panels/config/integrations/ha-config-entry-device-row.ts`
2. `src/panels/config/integrations/ha-config-sub-entry-row.ts`
3. `src/panels/config/integrations/ha-integration-overflow-menu.ts`

### PR 30: Config Integrations (Part 2)
**Files (2):**
1. `src/panels/config/integrations/ha-config-entry-row.ts`
2. `src/panels/config/integrations/ha-config-integration-page.ts`

### PR 31: Config Devices Dashboard
**Files (2):**
1. `src/panels/config/devices/ha-config-devices-dashboard.ts`
2. `src/panels/config/devices/ha-config-device-page.ts` (if needed for md-button-menu)

### PR 32: Developer Tools & Dialogs
**Files (3):**
1. `src/panels/developer-tools/statistics/developer-tools-statistics.ts`
2. `src/dialogs/more-info/controls/more-info-media_player.ts`
3. `src/dialogs/sidebar/dialog-edit-sidebar.ts`

### PR 33: Voice Assistant Setup Dialog
**Files (1):**
1. `src/dialogs/voice-assistant-setup/voice-assistant-setup-dialog.ts`

---

## Phase 3: Cleanup & Deprecation

### PR 34: Mark Legacy Components as Deprecated
**Files:**
1. `src/components/ha-button-menu.ts` - Add deprecation notice
2. `src/components/ha-md-button-menu.ts` - Add deprecation notice
3. `src/components/ha-list-item.ts` - Add deprecation notice (for menu usage)
4. `src/components/ha-md-menu-item.ts` - Add deprecation notice

---

## Notes

### Files Already Migrated (PRs #28293, #28300 - Merged into dev)
- `src/panels/config/automation/ha-automation-editor.ts`
- `src/panels/config/automation/ha-automation-trace.ts`
- `src/panels/config/automation/action/ha-automation-action-row.ts`
- `src/panels/config/automation/condition/ha-automation-condition-row.ts`
- `src/panels/config/automation/trigger/ha-automation-trigger-row.ts`
- `src/panels/config/automation/option/ha-automation-option-row.ts`
- `src/panels/config/automation/sidebar/*.ts` (all sidebar components)
- `src/panels/config/script/ha-script-editor.ts`
- `src/panels/config/script/ha-script-trace.ts`
- `src/panels/config/script/ha-script-field-row.ts`
- `src/panels/lovelace/components/hui-card-options.ts`
- `src/panels/lovelace/components/hui-card-edit-mode.ts`
- `src/panels/lovelace/cards/hui-todo-list-card.ts`

### Files in PR #28337 (Pending Merge)
- `src/components/ha-qr-scanner.ts`
- `src/components/data-table/ha-data-table-labels.ts`
- `src/panels/config/logs/ha-config-logs.ts`

### Special Considerations

1. **Dividers**: Replace `<li divider role="separator">` or `<ha-md-divider>` with `<wa-divider>` and import `@home-assistant/webawesome/dist/components/divider/divider`

2. **Styling**: `ha-dropdown` itself cannot be styled directly. Style the trigger element instead for positioning like absolute positioning.

3. **Event Handling**: The `@wa-select` event provides `ev.detail.item.value` which should be used with a switch statement in the handler function.

4. **Disabled State**: Use `.disabled=${condition}` on `ha-dropdown-item`.

5. **Danger Variant**: Replace `class="warning"` with `variant="danger"`.

6. **activatable Mode**: Files using `activatable` mode on `ha-button-menu` (for checkable items) may need special handling - these might not be overflow menus and may need to remain as-is or use a different component.

### Estimated Timeline
- Phase 1: ~23 PRs (47 files)
- Phase 2: ~10 PRs (20 files)
- Phase 3: 1 PR (cleanup)
- **Total: ~34 PRs**

Each PR should be reviewed and merged before starting the next to avoid conflicts.
