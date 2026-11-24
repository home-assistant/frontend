import { ContextProvider } from "@lit/context";
import { mdiCodeBraces, mdiFormTextbox, mdiStarFourPoints } from "@mdi/js";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { css, html, nothing } from "lit";
import { classMap } from "lit/directives/class-map";
import type { StyleInfo } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { getStorage } from "../../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import { deepEqual } from "../../../../common/util/deep-equal";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import "../../../../components/ha-yaml-editor";
import { fetchAITaskPreferences } from "../../../../data/ai_task";
import type { HomeAssistant } from "../../../../types";
import { SIDEBAR_DEFAULT_WIDTH } from "../ha-manual-editor-mixin";
import { CONTENT_MIN_WIDTH, SIDEBAR_MIN_WIDTH } from "../styles";
import type { AiEditorConfig, AiEditorKind } from "./automation-ai-agent";
import {
  AUTOMATION_DIFF_LAYOUT,
  automationDiffContext,
  diffAutomationConfigs,
  SCRIPT_DIFF_LAYOUT,
  type AutomationDiff,
} from "./automation-ai-diff";
import {
  loadAiSession,
  saveAiSession,
  type AutomationAiPanelState,
} from "./automation-ai-session";
import { countConfigLineChanges } from "./automation-ai-stats";
import type { HaAutomationAiPanel } from "./ha-automation-ai-panel";
import type { HaAutomationAiSidebar } from "./ha-automation-ai-sidebar";

/** What the AI needs from the automation or script editor it is in. */
export interface AiEditorHooks<TConfig extends AiEditorConfig> {
  kind: AiEditorKind;
  hass(): HomeAssistant | undefined;
  config(): TConfig | undefined;
  /** The id of the saved config, to keep the AI per config. */
  id(): string | null | undefined;
  narrow(): boolean;
  readOnly(): boolean;
  /** Invalid YAML isn't the config the AI would get. */
  yamlErrors(): boolean;
  yamlMode(): boolean;
  /** Puts a config of the AI in the editor, as one undo step. */
  commit(config: TConfig): void;
  closeRowSidebar(): void;
  confirmUnsavedChanged(): Promise<boolean>;
  toggleYamlMode(): void;
  /** Whether the AI would create the config rather than edit it. */
  isEmpty(config: TConfig): boolean;
}

type Host = ReactiveControllerHost & HTMLElement & { renderRoot: ParentNode };

// Shared with the sidebar of a row, which takes the same place
const WIDTH_KEY = "automation-sidebar-width";

const withoutId = (config?: AiEditorConfig) => {
  if (!config) {
    return undefined;
  }
  const { id: _id, ...rest } = config as AiEditorConfig & { id?: string };
  return rest;
};

/**
 * @summary The AI of the automation and the script editor: its button, its
 * sidebar, the changes it made and the conversation, kept per config for the
 * browser tab. The editor renders its parts and tells it what happens.
 */
export class AiEditorController<
  TConfig extends AiEditorConfig,
> implements ReactiveController {
  /** Whether an AI task entity for data generation is set up. */
  public available = false;

  /** Whether the AI works on a request. */
  public busy = false;

  /** The config before and after the last change of the AI. */
  public change?: { before: TConfig; after: TConfig };

  /** Whether the editor shows the last change of the AI instead of the config. */
  public showChanges = false;

  /** Whether the AI sidebar is open; closed, it keeps its conversation. */
  public sidebarOpen = false;

  // The AI shows once it was opened, and keeps its conversation
  private _loaded = false;

  private _preferencesRequested = false;

  // The id a new config got saved as, which the editor switches to next
  private _savedAs?: string;

  // The config the editor had when the change of the AI was last checked
  private _seenConfig?: TConfig;

  // The editor leaves room for the sheet so it doesn't cover the last rows
  private _sheetHeight = 0;

  // On narrow screens its sheet hides the AI sheet, on wide ones the AI
  // collapses below it
  private _rowSidebarOpen = false;

  // The AI finished while the user didn't see it, until they do
  private _unseenResult = false;

  // The conversation as the AI last reported it, kept per config
  private _panelState?: AutomationAiPanelState;

  private _restoredState?: AutomationAiPanelState;

  private _unsubscribeWidth?: () => void;

  // The rows show their marks only while the user looks at the changes
  private _diffProvider: ContextProvider<typeof automationDiffContext>;

  private _diff = memoizeOne((before?: TConfig, after?: TConfig) =>
    before && after
      ? diffAutomationConfigs(
          before,
          after,
          this._hooks.kind === "script"
            ? SCRIPT_DIFF_LAYOUT
            : AUTOMATION_DIFF_LAYOUT
        )
      : undefined
  );

  private _lineChanges = memoizeOne((before?: TConfig, after?: TConfig) =>
    before && after
      ? countConfigLineChanges(withoutId(before), withoutId(after))
      : undefined
  );

  // The YAML editor hides the id. Kept per argument, so the editor only gets a
  // new value when the config changes.
  private _yaml = memoizeOne(withoutId);

  private _originalYaml = memoizeOne(withoutId);

  constructor(
    private _host: Host,
    private _hooks: AiEditorHooks<TConfig>
  ) {
    _host.addController(this);
    this._diffProvider = new ContextProvider(_host, {
      context: automationDiffContext,
    });
  }

  public hostConnected() {
    const storage = getStorage("localStorage");
    this._setWidth(storage.getValue<number>(WIDTH_KEY));
    this._unsubscribeWidth = storage.subscribeChanges(WIDTH_KEY, (_, value) =>
      this._setWidth(value as number | undefined)
    );
  }

  // Without a render, the width changes on every move while resizing
  private _setWidth(widthPx?: number) {
    this._host.style.setProperty(
      "--sidebar-dynamic-width",
      `${widthPx ?? SIDEBAR_DEFAULT_WIDTH}px`
    );
  }

  public hostDisconnected() {
    this._unsubscribeWidth?.();
    this._unsubscribeWidth = undefined;
    // The editor goes away, so would the answer of a running request
    this._abandonRequest();
  }

  public hostUpdate() {
    if (this._unseenResult && this._visible) {
      this._unseenResult = false;
    }
    this._checkChange();
    this._diffProvider.setValue(
      this.showChanges
        ? this._diff(this.change?.before, this.change?.after)
        : undefined
    );
    const hass = this._hooks.hass();
    if (
      !this._preferencesRequested &&
      hass &&
      isComponentLoaded(hass.config, "ai_task")
    ) {
      this._preferencesRequested = true;
      fetchAITaskPreferences(hass.callWS)
        .then((prefs) => {
          this.available = !!prefs.gen_data_entity_id;
          this._host.requestUpdate();
        })
        // Without its preferences, the editor has no AI
        .catch(() => undefined);
    }
  }

  /** Whether editing is locked, while the AI works or its changes show. */
  public get active(): boolean {
    return this.busy || this.showChanges;
  }

  /** The changes the editor shows, with the removed rows put back. */
  public get diff(): AutomationDiff | undefined {
    return this._diffProvider.value;
  }

  /** Whether the AI sidebar is open next to the editor. */
  public get sidebarBeside(): boolean {
    return this.sidebarOpen && !this._hooks.narrow();
  }

  /** The room the editor leaves for the AI sheet on narrow screens. */
  public get sheetSpace(): string | undefined {
    return this.sidebarOpen && this._hooks.narrow() && !this._sheetHidden
      ? `${this._sheetHeight}px`
      : undefined;
  }

  /** The custom properties the page of the editor needs. */
  public get pageStyle(): StyleInfo {
    return { "--general-sheet-space": this.sheetSpace };
  }

  /** Whether the menu button shows that the AI has an unseen result. */
  public get menuUnseen(): boolean {
    return this._hooks.narrow() && this._unseenResult;
  }

  private get _sheetHidden(): boolean {
    return this._hooks.narrow() && this._rowSidebarOpen;
  }

  // Open, and not below the sidebar of a row or hidden by its sheet
  private get _visible(): boolean {
    return this.sidebarOpen && !this._rowSidebarOpen;
  }

  /** What the AI button offers, if it shows. */
  public get action(): "create" | "edit" | undefined {
    const config = this._hooks.config();
    if (
      !this.available ||
      this._hooks.readOnly() ||
      this._hooks.yamlErrors() ||
      !config
    ) {
      return undefined;
    }
    return this._hooks.isEmpty(config) ? "create" : "edit";
  }

  private _actionLabel() {
    return this._hooks
      .hass()!
      .localize(
        `ui.panel.config.automation.editor.ai.${this.action === "create" ? "create" : "menu"}`
      );
  }

  /** The name of the config in the header, marked while its changes show. */
  public renderAlias(defaultName: string) {
    const mark = this.diff?.settings.alias;
    if (!mark) {
      return nothing;
    }
    const alias =
      mark === "removed" ? this.diff?.before.alias : this.diff?.config.alias;
    return html`<span slot="header" class="ai-alias diff-${mark}"
      >${alias || defaultName}</span
    >`;
  }

  /**
   * The buttons of the toolbar: the switch to YAML while the menu hides, and
   * the AI button on wide screens, which are in the menu on narrow ones.
   */
  public renderToolbarButtons(showButton: boolean) {
    const hass = this._hooks.hass()!;
    const yamlMode = this._hooks.yamlMode();
    const label = this._actionLabel();
    return html`${
      this.active
        ? html`<ha-icon-button
            slot="toolbar-icon"
            .label=${hass.localize(
              `ui.panel.config.automation.editor.edit_${yamlMode ? "ui" : "yaml"}`
            )}
            .path=${yamlMode ? mdiFormTextbox : mdiCodeBraces}
            @click=${this._hooks.toggleYamlMode}
          ></ha-icon-button>`
        : nothing
    }${
      this.available && showButton && !this._hooks.narrow()
        ? html`<ha-icon-button
              slot="toolbar-icon"
              id="button-ai"
              class=${classMap({
                "ai-active": this.sidebarBeside,
                "ai-working": this.busy,
                "ai-unseen": this._unseenResult,
              })}
              .label=${
                this._unseenResult
                  ? `${label} (${hass.localize("ui.panel.config.automation.editor.ai.new_result")})`
                  : label
              }
              .path=${mdiStarFourPoints}
              .disabled=${!this.action && !this.sidebarBeside}
              @click=${this._toggle}
            ></ha-icon-button>
            <ha-tooltip placement="bottom" for="button-ai"
              >${label}</ha-tooltip
            >`
        : nothing
    }`;
  }

  /** The entry of the menu on narrow screens, which selects `ai_edit`. */
  public renderMenuItem(showItem: boolean) {
    if (!this.available || !showItem || !this._hooks.narrow()) {
      return nothing;
    }
    return html`<ha-dropdown-item value="ai_edit" .disabled=${!this.action}>
      ${this._actionLabel()}
      <ha-svg-icon slot="icon" .path=${mdiStarFourPoints}></ha-svg-icon>
    </ha-dropdown-item>`;
  }

  /** The YAML editor, or the changes of the AI while editing is locked. */
  public renderYamlEditor(editor: unknown) {
    if (!this.active) {
      return editor;
    }
    return html`<ha-yaml-editor
      .value=${this._yaml(
        this.showChanges ? this.change?.after : this._hooks.config()
      )}
      .original=${
        this.showChanges ? this._originalYaml(this.change?.before) : undefined
      }
      auto-update
      read-only
      disable-fullscreen
    ></ha-yaml-editor>`;
  }

  /**
   * The AI sidebar, lined up like the editor, so it sits where the sidebar of
   * a row does. It stays while closed, so the AI keeps its conversation.
   */
  public renderSidebar() {
    if (!this._loaded) {
      return nothing;
    }
    const narrow = this._hooks.narrow();
    const changes = !!this._diff(this.change?.before, this.change?.after)
      ?.hasChanges;
    return html`<div
      class=${classMap({
        "ai-sidebar-positioner": true,
        yaml: this._hooks.yamlMode(),
      })}
    >
      <ha-automation-ai-sidebar
        .narrow=${narrow}
        .open=${this.sidebarOpen}
        .suspended=${this._sheetHidden}
        .collapsed=${this.sidebarBeside && this._rowSidebarOpen}
        .changes=${changes}
        .showingChanges=${this.showChanges}
        .canClear=${this._canClear}
        ?hidden=${!narrow && !this.sidebarOpen}
        @ai-sidebar-closed=${this.close}
        @ai-sidebar-expand=${this._hooks.closeRowSidebar}
        @ai-sidebar-resized=${this._resized}
        @ai-clear-conversation=${this._clear}
        @ai-open-settings=${this._openSettings}
        @ai-toggle-changes=${this._toggleChanges}
        @bottom-sheet-resized=${this._sheetResized}
      >
        <ha-automation-ai-panel
          .hass=${this._hooks.hass()}
          .kind=${this._hooks.kind}
          .config=${this._hooks.config()}
          .changes=${changes}
          .showingChanges=${this.showChanges}
          .lineChanges=${this._lineChanges(
            this.change?.before,
            this.change?.after
          )}
          .restoredState=${this._restoredState}
          @ai-request-started=${this._requestStarted}
          @ai-request-finished=${this._requestFinished}
          @ai-state-changed=${this._stateChanged}
        ></ha-automation-ai-panel>
      </ha-automation-ai-sidebar>
    </div>`;
  }

  private get _canClear(): boolean {
    const panel = this._panelState;
    return (
      !this.busy &&
      !!(
        panel?.turns.length ||
        panel?.interrupted ||
        panel?.error ||
        this.change
      )
    );
  }

  public open = async () => {
    await this._load();
    // It takes the place of the sidebar of a row
    this._hooks.closeRowSidebar();
    this.sidebarOpen = true;
    this._persist();
    this._host.requestUpdate();
    await this._host.updateComplete;
    this._sidebar?.expand();
    this._panel?.focusPrompt();
  };

  public close = () => {
    this.sidebarOpen = false;
    // Nothing to switch back with while the sidebar is closed
    this.showChanges = false;
    this._persist();
    this._host.requestUpdate();
  };

  private _toggle = () => {
    if (this.sidebarOpen && !this._rowSidebarOpen) {
      this.close();
      return;
    }
    this.open();
  };

  /** The editor opened or closed the sidebar of a row. */
  public rowSidebarChanged(open: boolean) {
    this._rowSidebarOpen = open;
    this._host.requestUpdate();
  }

  /**
   * The editor shows another config now. A new one that got saved keeps its
   * AI under its id, another one brings its own back.
   */
  public idChanged(oldId: string | null | undefined) {
    const id = this._hooks.id();
    if (oldId === id) {
      return;
    }
    if (!oldId && id && id === this._savedAs) {
      this._savedAs = undefined;
      this._persist();
      return;
    }
    this._abandonRequest(oldId);
    if (!this._loaded && !this.change && !this.sidebarOpen) {
      // The AI wasn't used, so nothing of the editor needs to change
      this._restore();
      return;
    }
    this._loaded = false;
    this.sidebarOpen = false;
    this._panelState = undefined;
    this._restoredState = undefined;
    this._reset();
    this._restore();
  }

  /** A new config gets this id, maybe in a new editor. */
  public saveAs(id: string) {
    this._savedAs = id;
    this._persist(id);
  }

  /** The user discarded the unsaved changes, so the change of the AI too. */
  public discarded() {
    this._abandonRequest();
    this.change = undefined;
    this._persist();
    this._loaded = false;
    this.sidebarOpen = false;
    this._reset();
  }

  /** Undo or redo replaced the config, the change of the AI no longer fits. */
  public undoRedoApplied() {
    this.showChanges = false;
    this.change = undefined;
    this._persist();
    this._host.requestUpdate();
  }

  // The user edited the config since the AI changed it, so its change no
  // longer shows what happened. Only checked when the config changes, a
  // restored change waits for its config to load.
  private _checkChange() {
    const config = this._hooks.config();
    if (config === this._seenConfig) {
      return;
    }
    this._seenConfig = config;
    if (!this.change || !config || this.busy || config === this.change.after) {
      return;
    }
    if (deepEqual(config, this.change.after)) {
      this.change = { ...this.change, after: config };
      return;
    }
    this.change = undefined;
    this.showChanges = false;
    this._persist();
  }

  // Its answer would land in a config it wasn't for. Kept as interrupted
  // under the config it was for, right away, the editor may show another one
  // when the panel would report it.
  private _abandonRequest(id = this._hooks.id()) {
    const panel = this._panel;
    // A new config without an id has nothing to keep it under
    if (panel?.abandon() && id) {
      this._panelState = panel.state;
      this._persist(id);
    }
    this.busy = false;
  }

  private async _load() {
    await Promise.all([
      import("./ha-automation-ai-panel"),
      import("./ha-automation-ai-sidebar"),
    ]);
    this._loaded = true;
  }

  private get _sidebar(): HaAutomationAiSidebar | null {
    return this._host.renderRoot.querySelector("ha-automation-ai-sidebar");
  }

  private get _panel(): HaAutomationAiPanel | null {
    return this._host.renderRoot.querySelector("ha-automation-ai-panel");
  }

  private get _sessionKey(): string | undefined {
    const id = this._hooks.id();
    return id ? `${this._hooks.kind}.${id}` : undefined;
  }

  // Keeps the AI of a saved config for when the user comes back
  private _persist(id?: string) {
    const key = id ? `${this._hooks.kind}.${id}` : this._sessionKey;
    if (!key || !this._loaded) {
      return;
    }
    saveAiSession(key, {
      panel: this._panelState,
      change: this.change,
      open: this.sidebarOpen,
    });
  }

  private async _restore() {
    const key = this._sessionKey;
    const session = key ? loadAiSession(key) : undefined;
    if (!session) {
      return;
    }
    await this._load();
    // The user moved on to another config meanwhile
    if (this._sessionKey !== key) {
      this._loaded = false;
      return;
    }
    this.change = session.change as
      { before: TConfig; after: TConfig } | undefined;
    this._panelState = session.panel;
    this._restoredState = session.panel;
    this.sidebarOpen = session.open;
    this._host.requestUpdate();
  }

  private _reset() {
    this._hooks.closeRowSidebar();
    this.busy = false;
    this.showChanges = false;
    this.change = undefined;
    this._host.requestUpdate();
  }

  private _requestStarted = () => {
    this._hooks.closeRowSidebar();
    this.showChanges = false;
    this.busy = true;
    this._host.requestUpdate();
  };

  private _requestFinished = (
    ev: HASSDomEvent<HASSDomEvents["ai-request-finished"]>
  ) => {
    // From a panel of a config the editor no longer shows
    if (ev.target !== this._panel) {
      return;
    }
    this.busy = false;
    this._unseenResult = !this._visible;
    this._host.requestUpdate();
    const config = ev.detail.config as TConfig | undefined;
    const current = this._hooks.config();
    if (!config || !current) {
      return;
    }
    this.change = { before: current, after: config };
    // One history entry, so one undo takes back all changes of the AI
    this._hooks.commit(config);
    this._persist();
  };

  private _stateChanged = (
    ev: HASSDomEvent<HASSDomEvents["ai-state-changed"]>
  ) => {
    if (ev.target !== this._panel) {
      return;
    }
    this._panelState = ev.detail.state;
    this._persist();
    this._host.requestUpdate();
  };

  private _toggleChanges = () => {
    this._hooks.closeRowSidebar();
    this.showChanges = !this.showChanges && !!this.change;
    this._host.requestUpdate();
  };

  private _clear = () => {
    this._panel?.clear();
    // The changes belong to the conversation, they stay in the config
    this.showChanges = false;
    this.change = undefined;
    this._persist();
    this._host.requestUpdate();
  };

  private _openSettings = async () => {
    if (await this._hooks.confirmUnsavedChanged()) {
      navigate("/config/ai");
    }
  };

  private _resized = (
    ev: HASSDomEvent<HASSDomEvents["ai-sidebar-resized"]>
  ) => {
    // Subscribed above, so this sidebar and the one of a row follow
    getStorage("localStorage").setValue(
      WIDTH_KEY,
      Math.max(SIDEBAR_MIN_WIDTH, ev.detail.widthPx ?? SIDEBAR_DEFAULT_WIDTH)
    );
  };

  private _sheetResized = (
    ev: HASSDomEvent<HASSDomEvents["bottom-sheet-resized"]>
  ) => {
    this._sheetHeight = ev.detail.height;
    this._host.requestUpdate();
  };
}

/** The styles of the parts of the AI the editor renders. */
export const aiEditorStyles = css`
  :host {
    --ai-sidebar-collapsed-height: 64px;
  }
  /* As wide as the sidebar of a row, see manualEditorStyles */
  hass-subpage {
    --ai-sidebar-width: min(
      max(var(--sidebar-dynamic-width), ${SIDEBAR_MIN_WIDTH}px),
      100vw - ${CONTENT_MIN_WIDTH}px - var(--ha-sidebar-width, 0px),
      var(--ha-automation-editor-max-width) -
        ${CONTENT_MIN_WIDTH}px - var(--ha-sidebar-width, 0px)
    );
    /* Where the sidebar of a row ends, see manualEditorStyles */
    --ai-sidebar-bottom: calc(
      81px - var(--header-height) - 16px + var(--safe-area-inset-top, 0px)
    );
  }
  /* Replaced by the YAML switch while the AI works or its changes show, the
     rest of the menu would change the config */
  ha-dropdown[hidden] {
    display: none;
  }
  /* Room for the AI sidebar on the right, the visual editor makes it inside,
     like for the sidebar of a row */
  .yaml-mode.ai-sidebar {
    margin-inline-end: calc(var(--ai-sidebar-width) + var(--ha-space-4));
  }
  /* Lined up like the visual editor, so the fixed sidebar below lands at its
     end, like the sidebar of a row, see manualEditorStyles */
  .ai-sidebar-positioner {
    display: flex;
    justify-content: flex-end;
    height: 0;
    max-width: var(--ha-automation-editor-max-width);
    margin: 0 auto;
    padding: 0 12px;
  }
  .ai-sidebar-positioner.yaml {
    max-width: none;
  }
  ha-automation-ai-sidebar:not([narrow]) {
    position: fixed;
    top: calc(var(--header-height) + 16px);
    width: var(--ai-sidebar-width);
    height: calc(-81px + 100vh - var(--safe-area-inset-top, 0px));
    height: calc(-81px + 100dvh - var(--safe-area-inset-top, 0px));
    z-index: 1;
  }
  /* Only its header, below the sidebar of a row */
  ha-automation-ai-sidebar[collapsed]:not([narrow]) {
    top: auto;
    bottom: var(--ai-sidebar-bottom);
    height: var(--ai-sidebar-collapsed-height);
  }
  ha-automation-ai-sidebar[hidden] {
    display: none;
  }
  /* The AI button while the AI sidebar is open */
  ha-icon-button.ai-active {
    color: var(--primary-color);
    background-color: var(--ha-color-fill-primary-normal-resting);
    border-radius: var(--ha-border-radius-circle);
  }
  /* Shines while the AI works, also when its sidebar is closed */
  ha-icon-button.ai-working {
    animation: ai-shine 1.8s ease-in-out infinite;
  }
  @keyframes ai-shine {
    0%,
    55%,
    100% {
      filter: drop-shadow(0 0 0 rgba(var(--rgb-primary-color), 0));
      transform: scale(1) rotate(0deg);
    }
    80% {
      filter: drop-shadow(0 0 8px rgba(var(--rgb-primary-color), 0.9));
      transform: scale(1.15) rotate(45deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    ha-icon-button.ai-working {
      animation: none;
      filter: drop-shadow(0 0 6px rgba(var(--rgb-primary-color), 0.9));
    }
  }
  /* The AI has a result the user didn't see yet */
  ha-icon-button.ai-unseen {
    position: relative;
  }
  ha-icon-button.ai-unseen::after {
    content: "";
    position: absolute;
    top: 8px;
    inset-inline-end: 8px;
    width: 8px;
    height: 8px;
    border-radius: var(--ha-border-radius-circle);
    background-color: var(--accent-color);
    box-shadow: 0 0 0 2px
      var(--app-header-background-color, var(--primary-background-color));
    pointer-events: none;
  }
  .ai-alias {
    padding: 0 var(--ha-space-2);
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    border-radius: var(--ha-border-radius-sm);
    background-color: var(--ha-color-fill-warning-normal-resting);
    color: var(--ha-color-on-warning-normal);
  }
  .ai-alias.diff-added {
    background-color: var(--ha-color-fill-success-normal-resting);
    color: var(--ha-color-on-success-normal);
  }
  .ai-alias.diff-removed {
    background-color: var(--ha-color-fill-danger-normal-resting);
    color: var(--ha-color-on-danger-normal);
    text-decoration: line-through;
  }
`;
