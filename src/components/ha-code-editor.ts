import type {
  Completion,
  CompletionContext,
  CompletionInfo,
  CompletionResult,
  CompletionSource,
} from "@codemirror/autocomplete";
import { undo, undoDepth, redo, redoDepth } from "@codemirror/commands";
import type { Extension, TransactionSpec } from "@codemirror/state";
import type { EditorView, KeyBinding, ViewUpdate } from "@codemirror/view";
import {
  mdiArrowExpand,
  mdiArrowCollapse,
  mdiContentCopy,
  mdiUndo,
  mdiRedo,
} from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, ReactiveElement, html, render } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { getEntityContext } from "../common/entity/context/get_entity_context";
import { copyToClipboard } from "../common/util/copy-clipboard";
import type { HomeAssistant } from "../types";
import { showToast } from "../util/toast";
import type { CompletionItem } from "./ha-code-editor-completion-items";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-icon-button-group";
import "./ha-code-editor-completion-items";
import "./ha-icon-button-toolbar";
import type { HaIconButtonToolbar } from "./ha-icon-button-toolbar";

declare global {
  interface HASSDomEvents {
    "editor-save": undefined;
  }
}

const saveKeyBinding: KeyBinding = {
  key: "Mod-s",
  run: (view: EditorView) => {
    fireEvent(view.dom, "editor-save");
    return true;
  },
};

const renderIcon = (completion: Completion) => {
  const icon = document.createElement("ha-icon");
  icon.icon = completion.label;
  return icon;
};

@customElement("ha-code-editor")
export class HaCodeEditor extends ReactiveElement {
  public codemirror?: EditorView;

  @property() public mode = "yaml";

  public hass?: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ attribute: "read-only", type: Boolean }) public readOnly = false;

  @property({ type: Boolean }) public linewrap = false;

  @property({ type: Boolean, attribute: "autocomplete-entities" })
  public autocompleteEntities = false;

  @property({ type: Boolean, attribute: "autocomplete-icons" })
  public autocompleteIcons = false;

  @property({ type: Boolean }) public error = false;

  @property({ type: Boolean, attribute: "disable-fullscreen" })
  public disableFullscreen = false;

  @property({ type: Boolean, attribute: "has-toolbar" })
  public hasToolbar = true;

  @state() private _value = "";

  @state() private _isFullscreen = false;

  @state() private _canUndo = false;

  @state() private _canRedo = false;

  @state() private _canCopy = false;

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  private _loadedCodeMirror?: typeof import("../resources/codemirror");

  private _editorToolbar?: HaIconButtonToolbar;

  private _iconList?: Completion[];

  public set value(value: string) {
    this._value = value;
  }

  public get value(): string {
    return this.codemirror ? this.codemirror.state.doc.toString() : this._value;
  }

  public get hasComments(): boolean {
    if (!this.codemirror || !this._loadedCodeMirror) {
      return false;
    }
    const className = this._loadedCodeMirror.highlightingFor(
      this.codemirror.state,
      [this._loadedCodeMirror.tags.comment]
    );
    return !!this.renderRoot.querySelector(`span.${className}`);
  }

  public connectedCallback() {
    super.connectedCallback();
    // Force update on reconnection so editor is recreated
    if (this.hasUpdated) {
      this.requestUpdate();
    }
    this.addEventListener("keydown", stopPropagation);
    this.addEventListener("keydown", this._handleKeyDown);
    // This is unreachable as editor will not exist yet,
    // but focus should not behave like this for good a11y.
    // (@steverep to fix in autofocus PR)
    if (!this.codemirror) {
      return;
    }
    if (this.autofocus !== false) {
      this.codemirror.focus();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", stopPropagation);
    this.removeEventListener("keydown", this._handleKeyDown);
    this._updateFullscreenState(false);
    this.updateComplete.then(() => {
      this.codemirror!.destroy();
      delete this.codemirror;
    });
  }

  // Ensure CodeMirror module is loaded before any update
  protected override async scheduleUpdate() {
    this._loadedCodeMirror ??= await import("../resources/codemirror");
    super.scheduleUpdate();
  }

  protected update(changedProps: PropertyValues): void {
    super.update(changedProps);
    if (!this.codemirror) {
      this._createCodeMirror();
      return;
    }
    const transactions: TransactionSpec[] = [];
    if (changedProps.has("mode")) {
      transactions.push({
        effects: [
          this._loadedCodeMirror!.langCompartment!.reconfigure(this._mode),
          this._loadedCodeMirror!.foldingCompartment.reconfigure(
            this._getFoldingExtensions()
          ),
        ],
      });
    }
    if (changedProps.has("readOnly")) {
      transactions.push({
        effects: this._loadedCodeMirror!.readonlyCompartment!.reconfigure(
          this._loadedCodeMirror!.EditorView!.editable.of(!this.readOnly)
        ),
      });
      this._updateToolbarButtons();
    }
    if (changedProps.has("linewrap")) {
      transactions.push({
        effects: this._loadedCodeMirror!.linewrapCompartment!.reconfigure(
          this.linewrap ? this._loadedCodeMirror!.EditorView.lineWrapping : []
        ),
      });
    }
    if (changedProps.has("_value") && this._value !== this.value) {
      transactions.push({
        changes: {
          from: 0,
          to: this.codemirror.state.doc.length,
          insert: this._value,
        },
      });
    }
    if (transactions.length > 0) {
      this.codemirror.dispatch(...transactions);
    }
    if (changedProps.has("hasToolbar")) {
      this._updateToolbar();
    }
    if (changedProps.has("error")) {
      this.classList.toggle("error-state", this.error);
    }
    if (changedProps.has("_isFullscreen")) {
      this.classList.toggle("fullscreen", this._isFullscreen);
      this._updateToolbarButtons();
    }
    if (
      changedProps.has("_canCopy") ||
      changedProps.has("_canUndo") ||
      changedProps.has("_canRedo")
    ) {
      this._updateToolbarButtons();
    }
    if (changedProps.has("disableFullscreen")) {
      this._updateFullscreenState();
    }
  }

  private get _mode() {
    return this._loadedCodeMirror!.langs[this.mode];
  }

  private _createCodeMirror() {
    if (!this._loadedCodeMirror) {
      throw new Error("Cannot create editor before CodeMirror is loaded");
    }
    const extensions: Extension[] = [
      this._loadedCodeMirror.lineNumbers(),
      this._loadedCodeMirror.history(),
      this._loadedCodeMirror.drawSelection(),
      this._loadedCodeMirror.EditorState.allowMultipleSelections.of(true),
      this._loadedCodeMirror.rectangularSelection(),
      this._loadedCodeMirror.crosshairCursor(),
      this._loadedCodeMirror.highlightSelectionMatches(),
      this._loadedCodeMirror.highlightActiveLine(),
      this._loadedCodeMirror.indentationMarkers({
        thickness: 0,
        activeThickness: 1,
        colors: {
          activeLight: "var(--secondary-text-color)",
          activeDark: "var(--secondary-text-color)",
        },
      }),
      this._loadedCodeMirror.keymap.of([
        ...this._loadedCodeMirror.defaultKeymap,
        ...this._loadedCodeMirror.searchKeymap,
        ...this._loadedCodeMirror.historyKeymap,
        ...this._loadedCodeMirror.tabKeyBindings,
        saveKeyBinding,
      ]),
      this._loadedCodeMirror.langCompartment.of(this._mode),
      this._loadedCodeMirror.haTheme,
      this._loadedCodeMirror.haSyntaxHighlighting,
      this._loadedCodeMirror.readonlyCompartment.of(
        this._loadedCodeMirror.EditorView.editable.of(!this.readOnly)
      ),
      this._loadedCodeMirror.linewrapCompartment.of(
        this.linewrap ? this._loadedCodeMirror.EditorView.lineWrapping : []
      ),
      this._loadedCodeMirror.EditorView.updateListener.of(this._onUpdate),
      this._loadedCodeMirror.foldingCompartment.of(
        this._getFoldingExtensions()
      ),
    ];

    if (!this.readOnly) {
      const completionSources: CompletionSource[] = [];
      if (this.autocompleteEntities && this.hass) {
        completionSources.push(this._entityCompletions.bind(this));
      }
      if (this.autocompleteIcons) {
        completionSources.push(this._mdiCompletions.bind(this));
      }
      if (completionSources.length > 0) {
        extensions.push(
          this._loadedCodeMirror.autocompletion({
            override: completionSources,
            maxRenderedOptions: 10,
          })
        );
      }
    }

    // Create the code editor
    this.codemirror = new this._loadedCodeMirror.EditorView({
      state: this._loadedCodeMirror.EditorState.create({
        doc: this._value,
        extensions,
      }),
      parent: this.renderRoot,
    });
    this._canCopy = this._value.length > 0;

    // Update the toolbar. Creating it if required
    this._updateToolbar();
  }

  private _fullscreenLabel(): string {
    if (this._isFullscreen)
      return (
        this.hass?.localize("ui.components.yaml-editor.exit_fullscreen") ||
        "Exit fullscreen"
      );
    return (
      this.hass?.localize("ui.components.yaml-editor.enter_fullscreen") ||
      "Enter fullscreen"
    );
  }

  private _fullscreenIcon(): string {
    return this._isFullscreen ? mdiArrowCollapse : mdiArrowExpand;
  }

  private _createEditorToolbar(): HaIconButtonToolbar {
    // Create the editor toolbar element
    const editorToolbar = document.createElement("ha-icon-button-toolbar");
    editorToolbar.classList.add("code-editor-toolbar");
    editorToolbar.items = [];
    return editorToolbar;
  }

  private _updateToolbar() {
    // Show/Hide the toolbar if we have one.
    this.classList.toggle("hasToolbar", this.hasToolbar);

    // Update fullscreen state. Handles toolbar and fullscreen mode being disabled.
    this._updateFullscreenState();

    // If we don't have a toolbar, nothing to update
    if (!this.hasToolbar) {
      return;
    }

    // If we don't yet have the toolbar, create it.
    if (!this._editorToolbar) {
      this._editorToolbar = this._createEditorToolbar();
    }

    // Ensure all toolbar buttons are correctly configured.
    this._updateToolbarButtons();

    // Render the toolbar. This must be placed as a child of the code
    // mirror element to ensure it doesn't affect the positioning and
    // size of codemirror.
    this.codemirror?.dom.appendChild(this._editorToolbar);
  }

  private _updateToolbarButtons() {
    // Re-render all toolbar items.
    if (!this._editorToolbar) return;

    this._editorToolbar.items = [
      {
        id: "undo",
        disabled: !this._canUndo,
        label: this.hass?.localize("ui.common.undo") || "Undo",
        path: mdiUndo,
        action: (e: Event) => this._handleUndoClick(e),
      },
      {
        id: "redo",
        disabled: !this._canRedo,
        label: this.hass?.localize("ui.common.redo") || "Redo",
        path: mdiRedo,
        action: (e: Event) => this._handleRedoClick(e),
      },
      {
        id: "copy",
        disabled: !this._canCopy,
        label:
          this.hass?.localize("ui.components.yaml-editor.copy_to_clipboard") ||
          "Copy to Clipboard",
        path: mdiContentCopy,
        action: (e: Event) => this._handleClipboardClick(e),
      },
      {
        id: "fullscreen",
        disabled: this.disableFullscreen,
        label: this._fullscreenLabel(),
        path: this._fullscreenIcon(),
        action: (e: Event) => this._handleFullscreenClick(e),
      },
    ];
  }

  private _updateFullscreenState(
    fullscreen: boolean = this._isFullscreen
  ): boolean {
    // Update the current fullscreen state based on selected value. If fullscreen
    // is disabled, or we have no toolbar, ensure we are not in fullscreen mode.
    this._isFullscreen =
      fullscreen && !this.disableFullscreen && this.hasToolbar;
    // Return whether successfully in requested state
    return this._isFullscreen === fullscreen;
  }

  private _handleClipboardClick = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (this.value) {
      await copyToClipboard(this.value);
      showToast(this, {
        message:
          this.hass?.localize("ui.common.copied_clipboard") ||
          "Copied to clipboard",
      });
    }
  };

  private _handleUndoClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (!this.codemirror) {
      return;
    }
    undo(this.codemirror);
  };

  private _handleRedoClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (!this.codemirror) {
      return;
    }
    redo(this.codemirror);
  };

  private _handleFullscreenClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    this._updateFullscreenState(!this._isFullscreen);
  };

  private _handleKeyDown = (e: KeyboardEvent) => {
    if (
      (e.key === "Escape" &&
        this._isFullscreen &&
        this._updateFullscreenState(false)) ||
      (e.key === "F11" && this._updateFullscreenState(true))
    ) {
      // If we successfully performed the action, stop it propagating further.
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private _renderInfo = (completion: Completion): CompletionInfo => {
    const key = completion.label;
    const context = getEntityContext(this.hass!.states[key], this.hass!);

    const completionInfo = document.createElement("div");
    completionInfo.classList.add("completion-info");

    const formattedState = this.hass!.formatEntityState(this.hass!.states[key]);

    const completionItems: CompletionItem[] = [
      {
        label: this.hass!.localize(
          "ui.components.entity.entity-state-picker.state"
        ),
        value: formattedState,
        subValue:
          // If the state exactly matches the formatted state, don't show the raw state
          this.hass!.states[key].state === formattedState
            ? undefined
            : this.hass!.states[key].state,
      },
    ];

    if (context.device && context.device.name) {
      completionItems.push({
        label: this.hass!.localize("ui.components.device-picker.device"),
        value: context.device.name,
      });
    }

    if (context.area && context.area.name) {
      completionItems.push({
        label: this.hass!.localize("ui.components.area-picker.area"),
        value: context.area.name,
      });
    }

    if (context.floor && context.floor.name) {
      completionItems.push({
        label: this.hass!.localize("ui.components.floor-picker.floor"),
        value: context.floor.name,
      });
    }

    render(
      html`
        <ha-code-editor-completion-items
          .items=${completionItems}
        ></ha-code-editor-completion-items>
      `,
      completionInfo
    );

    return completionInfo;
  };

  private _getStates = memoizeOne((states: HassEntities): Completion[] => {
    if (!states) {
      return [];
    }

    const options = Object.keys(states).map((key) => ({
      type: "variable",
      label: key,
      detail: states[key].attributes.friendly_name,
      info: this._renderInfo,
    }));

    return options;
  });

  private _entityCompletions(
    context: CompletionContext
  ): CompletionResult | null | Promise<CompletionResult | null> {
    // Check for YAML mode and entity-related fields
    if (this.mode === "yaml") {
      const currentLine = context.state.doc.lineAt(context.pos);
      const lineText = currentLine.text;

      // Properties that commonly contain entity IDs
      const entityProperties = [
        "entity_id",
        "entity",
        "entities",
        "badges",
        "devices",
        "lights",
        "light",
        "group_members",
        "scene",
        "zone",
        "zones",
      ];

      // Create regex pattern for all entity properties
      const propertyPattern = entityProperties.join("|");
      const entityFieldRegex = new RegExp(
        `^\\s*(-\\s+)?(${propertyPattern}):\\s*`
      );

      // Check if we're in an entity field (single entity or list item)
      const entityFieldMatch = lineText.match(entityFieldRegex);
      const listItemMatch = lineText.match(/^\s*-\s+/);

      if (entityFieldMatch) {
        // Calculate the position after the entity field
        const afterField = currentLine.from + entityFieldMatch[0].length;

        // If cursor is after the entity field, show all entities
        if (context.pos >= afterField) {
          const states = this._getStates(this.hass!.states);

          if (!states || !states.length) {
            return null;
          }

          // Find what's already typed after the field
          const typedText = context.state.sliceDoc(afterField, context.pos);

          // Filter states based on what's typed
          const filteredStates = typedText
            ? states.filter((entityState) =>
                entityState.label
                  .toLowerCase()
                  .startsWith(typedText.toLowerCase())
              )
            : states;

          return {
            from: afterField,
            options: filteredStates,
            validFor: /^[a-z_]*\.?\w*$/,
          };
        }
      } else if (listItemMatch) {
        // Check if this is a list item under an entity_id field
        const lineNumber = currentLine.number;

        // Look at previous lines to check if we're under an entity_id field
        for (let i = lineNumber - 1; i > 0 && i >= lineNumber - 10; i--) {
          const prevLine = context.state.doc.line(i);
          const prevText = prevLine.text;

          // Stop if we hit a non-indented line (new field)
          if (
            prevText.trim() &&
            !prevText.startsWith(" ") &&
            !prevText.startsWith("\t")
          ) {
            break;
          }

          // Check if we found an entity property field
          const entityListFieldRegex = new RegExp(
            `^\\s*(${propertyPattern}):\\s*$`
          );
          if (prevText.match(entityListFieldRegex)) {
            // We're in a list under an entity field
            const afterListMarker = currentLine.from + listItemMatch[0].length;

            if (context.pos >= afterListMarker) {
              const states = this._getStates(this.hass!.states);

              if (!states || !states.length) {
                return null;
              }

              // Find what's already typed after the list marker
              const typedText = context.state.sliceDoc(
                afterListMarker,
                context.pos
              );

              // Filter states based on what's typed
              const filteredStates = typedText
                ? states.filter((entityState) =>
                    entityState.label
                      .toLowerCase()
                      .startsWith(typedText.toLowerCase())
                  )
                : states;

              return {
                from: afterListMarker,
                options: filteredStates,
                validFor: /^[a-z_]*\.?\w*$/,
              };
            }
          }
        }
      }
    }

    // Original entity completion logic for non-YAML or when not in entity_id field
    const entityWord = context.matchBefore(/[a-z_]{3,}\.\w*/);

    if (
      !entityWord ||
      (entityWord.from === entityWord.to && !context.explicit)
    ) {
      return null;
    }

    const states = this._getStates(this.hass!.states);

    if (!states || !states.length) {
      return null;
    }

    return {
      from: Number(entityWord.from),
      options: states,
      validFor: /^[a-z_]{3,}\.\w*$/,
    };
  }

  private _getIconItems = async (): Promise<Completion[]> => {
    if (!this._iconList) {
      let iconList: {
        name: string;
        keywords: string[];
      }[];
      if (__SUPERVISOR__) {
        iconList = [];
      } else {
        iconList = (await import("../../build/mdi/iconList.json")).default;
      }

      this._iconList = iconList.map((icon) => ({
        type: "variable",
        label: `mdi:${icon.name}`,
        detail: icon.keywords.join(", "),
        info: renderIcon,
      }));
    }

    return this._iconList;
  };

  private async _mdiCompletions(
    context: CompletionContext
  ): Promise<CompletionResult | null> {
    const match = context.matchBefore(/mdi:\S*/);

    if (!match || (match.from === match.to && !context.explicit)) {
      return null;
    }

    const iconItems = await this._getIconItems();

    return {
      from: Number(match.from),
      options: iconItems,
      validFor: /^mdi:\S*$/,
    };
  }

  private _onUpdate = (update: ViewUpdate): void => {
    this._canUndo = !this.readOnly && undoDepth(update.state) > 0;
    this._canRedo = !this.readOnly && redoDepth(update.state) > 0;
    if (!update.docChanged) {
      return;
    }
    this._value = update.state.doc.toString();
    this._canCopy = this._value.length > 0;
    fireEvent(this, "value-changed", { value: this._value });
  };

  private _getFoldingExtensions = (): Extension => {
    if (this.mode === "yaml") {
      return [
        this._loadedCodeMirror!.foldGutter(),
        this._loadedCodeMirror!.foldingOnIndent,
      ];
    }

    return [];
  };

  static styles = css`
    :host {
      position: relative;
      display: block;
      --code-editor-toolbar-height: 28px;
    }

    :host(.error-state) .cm-gutters {
      border-color: var(--error-state-color, red) !important;
    }

    :host(.hasToolbar) .cm-gutters {
      padding-top: 0;
    }

    :host(.hasToolbar) .cm-focused .cm-gutters {
      padding-top: 1px;
    }

    :host(.error-state) .cm-content {
      border-color: var(--error-state-color, red) !important;
    }

    :host(.hasToolbar) .cm-content {
      border: none;
      border-top: 1px solid var(--secondary-text-color);
    }

    :host(.hasToolbar) .cm-focused .cm-content {
      border-top: 2px solid var(--primary-color);
      padding-top: 15px;
    }

    :host(.fullscreen) {
      position: fixed !important;
      top: calc(var(--header-height, 56px) + 8px) !important;
      left: 8px !important;
      right: 8px !important;
      bottom: 8px !important;
      z-index: 6;
      border-radius: 12px !important;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
      overflow: hidden !important;
      background-color: var(
        --code-editor-background-color,
        var(--card-background-color)
      ) !important;
      margin: 0 !important;
      padding-top: var(--safe-area-inset-top) !important;
      padding-left: var(--safe-area-inset-left) !important;
      padding-right: var(--safe-area-inset-right) !important;
      padding-bottom: var(--safe-area-inset-bottom) !important;
      box-sizing: border-box !important;
      display: block !important;
    }

    :host(.hasToolbar) .cm-editor {
      padding-top: var(--code-editor-toolbar-height);
    }

    :host(.fullscreen) .cm-editor {
      height: 100% !important;
      max-height: 100% !important;
      border-radius: 0 !important;
    }

    :host(:not(.hasToolbar)) .code-editor-toolbar {
      display: none !important;
    }

    .code-editor-toolbar {
      --icon-button-toolbar-height: var(--code-editor-toolbar-height);
      --icon-button-toolbar-color: var(
        --code-editor-gutter-color,
        var(--secondary-background-color, whitesmoke)
      );
      border-top-left-radius: var(--ha-border-radius-sm);
      border-top-right-radius: var(--ha-border-radius-sm);
    }

    .completion-info {
      display: grid;
      gap: 3px;
      padding: 8px;
    }

    /* Hide completion info on narrow screens */
    @media (max-width: 600px) {
      .cm-completionInfo,
      .completion-info {
        display: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor": HaCodeEditor;
  }
}
