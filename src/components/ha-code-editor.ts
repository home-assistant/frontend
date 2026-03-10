import "@home-assistant/webawesome/dist/components/popup/popup";
import type WaPopup from "@home-assistant/webawesome/dist/components/popup/popup";
import type {
  Completion,
  CompletionContext,
  CompletionInfo,
  CompletionResult,
  CompletionSource,
} from "@codemirror/autocomplete";
import { redo, redoDepth, undo, undoDepth } from "@codemirror/commands";
import type { Extension, TransactionSpec } from "@codemirror/state";
import type { EditorView, KeyBinding, ViewUpdate } from "@codemirror/view";
import { placeholder } from "@codemirror/view";
import {
  mdiArrowCollapse,
  mdiArrowExpand,
  mdiContentCopy,
  mdiBug,
  mdiBugOutline,
  mdiFindReplace,
  mdiRedo,
  mdiUndo,
} from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, ReactiveElement, render } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { getEntityContext } from "../common/entity/context/get_entity_context";
import { copyToClipboard } from "../common/util/copy-clipboard";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import { showToast } from "../util/toast";
import "./ha-code-editor-completion-items";
import type { CompletionItem } from "./ha-code-editor-completion-items";
import "./ha-icon";
import "./ha-icon-button-toolbar";
import type { HaIconButtonToolbar } from "./ha-icon-button-toolbar";

declare global {
  interface HASSDomEvents {
    "editor-save": undefined;
    "test-toggle": undefined;
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

  @property({ type: Boolean, attribute: "in-dialog" })
  public inDialog = false;

  @property({ type: Boolean, attribute: "has-toolbar" })
  public hasToolbar = true;

  @property({ type: Boolean, attribute: "has-test" })
  public hasTest = false;

  @property({ attribute: false }) public testing = false;

  @property({ type: String }) public placeholder?: string;

  @state() private _value = "";

  @state() private _isFullscreen = false;

  @state() private _canUndo = false;

  @state() private _canRedo = false;

  @state() private _canCopy = false;

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  private _loadedCodeMirror?: typeof import("../resources/codemirror");

  private _completionInfoPopover?: WaPopup;

  private _completionInfoContainer?: HTMLDivElement;

  private _completionInfoDestroy?: () => void;

  private _completionInfoRequest = 0;

  private _completionInfoKey?: string;

  private _completionInfoFrame?: number;

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
    this.classList.toggle("in-dialog", this.inDialog);
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
    fireEvent(this, "dialog-set-fullscreen", false);
    this._clearCompletionInfo();
    if (this._completionInfoFrame !== undefined) {
      cancelAnimationFrame(this._completionInfoFrame);
      this._completionInfoFrame = undefined;
    }
    this._completionInfoPopover?.remove();
    this._completionInfoPopover = undefined;
    this._completionInfoContainer = undefined;
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
    if (changedProps.has("inDialog")) {
      this.classList.toggle("in-dialog", this.inDialog);
    }
    if (changedProps.has("_isFullscreen")) {
      this.classList.toggle("fullscreen", this._isFullscreen);
      this._updateToolbarButtons();
    }
    if (
      changedProps.has("_canCopy") ||
      changedProps.has("_canUndo") ||
      changedProps.has("_canRedo") ||
      changedProps.has("testing")
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
      this._loadedCodeMirror.dropCursor(),
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
      this._loadedCodeMirror.search({ top: true }),
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
      this._loadedCodeMirror.tooltips({
        position: "absolute",
      }),
      ...(this.placeholder ? [placeholder(this.placeholder)] : []),
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
    this._canCopy = this._value?.length > 0;

    const cmScroller = this.codemirror.dom.querySelector(".cm-scroller");
    if (cmScroller) {
      cmScroller.classList.add("ha-scrollbar");
    }

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
    if (!this._editorToolbar) {
      return;
    }

    this._editorToolbar.items = [
      ...(this.hasTest && !this._isFullscreen
        ? [
            {
              id: "test",
              label:
                this.hass?.localize(
                  `ui.components.yaml-editor.test_${this.testing ? "off" : "on"}`
                ) || "Test",
              path: this.testing ? mdiBugOutline : mdiBug,
              action: (e: Event) => this._handleTestClick(e),
            },
          ]
        : []),
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
        id: "find-replace",
        label:
          this.hass?.localize("ui.components.yaml-editor.find_and_replace") ||
          "Find and replace",
        path: mdiFindReplace,
        action: (e: Event) => this._handleFindReplaceClick(e),
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
    const previousFullscreen = this._isFullscreen;

    this.classList.toggle("in-dialog", this.inDialog);

    // Update the current fullscreen state based on selected value. If fullscreen
    // is disabled, or we have no toolbar, ensure we are not in fullscreen mode.
    this._isFullscreen =
      fullscreen && !this.disableFullscreen && this.hasToolbar;

    if (previousFullscreen !== this._isFullscreen) {
      fireEvent(this, "dialog-set-fullscreen", this._isFullscreen);
    }

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

  private _handleTestClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (!this.codemirror) {
      return;
    }
    fireEvent(this, "test-toggle");
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

  private _handleFindReplaceClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (!this.codemirror || !this._loadedCodeMirror) {
      return;
    }
    // Toggle search panel: close if open, open if closed
    const searchPanel = this.codemirror.dom.querySelector(".cm-search");
    if (searchPanel) {
      this._loadedCodeMirror.closeSearchPanel(this.codemirror);
    } else {
      this._loadedCodeMirror.openSearchPanel(this.codemirror);
    }
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
    const context = getEntityContext(
      this.hass!.states[key],
      this.hass!.entities,
      this.hass!.devices,
      this.hass!.areas,
      this.hass!.floors
    );

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

  private _getCompletionInfo = (
    completion: Completion
  ): CompletionInfo | Promise<CompletionInfo> | null => {
    if (this.hass && completion.label in this.hass.states) {
      return this._renderInfo(completion);
    }

    if (completion.label.startsWith("mdi:")) {
      return renderIcon(completion);
    }

    return null;
  };

  private _ensureCompletionInfoPopover(): WaPopup {
    if (!this._completionInfoPopover) {
      this._completionInfoPopover = document.createElement(
        "wa-popup"
      ) as WaPopup;
      this._completionInfoPopover.classList.add("completion-info-popover");
      this._completionInfoPopover.placement = "right-start";
      this._completionInfoPopover.distance = 4;
      this._completionInfoPopover.flip = true;
      this._completionInfoPopover.flipFallbackPlacements =
        "left-start bottom-start top-start";
      this._completionInfoPopover.shift = true;
      this._completionInfoPopover.shiftPadding = 8;
      this._completionInfoPopover.autoSize = "both";
      this._completionInfoPopover.autoSizePadding = 8;

      this._completionInfoContainer = document.createElement("div");
      this._completionInfoPopover.appendChild(this._completionInfoContainer);
      this.renderRoot.appendChild(this._completionInfoPopover);
    }

    return this._completionInfoPopover;
  }

  private _clearCompletionInfo() {
    this._completionInfoRequest += 1;
    this._completionInfoKey = undefined;
    this._completionInfoDestroy?.();
    this._completionInfoDestroy = undefined;
    this._completionInfoContainer?.replaceChildren();

    if (this._completionInfoPopover?.active) {
      this._completionInfoPopover.active = false;
    }
  }

  private _renderCompletionInfoContent(info: CompletionInfo) {
    this._completionInfoDestroy?.();
    this._completionInfoDestroy = undefined;

    if (!this._completionInfoContainer) {
      return;
    }

    if (info === null) {
      this._completionInfoContainer.replaceChildren();
      return;
    }

    if ("nodeType" in info) {
      this._completionInfoContainer.replaceChildren(info);
      return;
    }

    this._completionInfoContainer.replaceChildren(info.dom);
    this._completionInfoDestroy = info.destroy;
  }

  private _syncCompletionInfoPopover = () => {
    if (this._completionInfoFrame !== undefined) {
      cancelAnimationFrame(this._completionInfoFrame);
    }

    this._completionInfoFrame = requestAnimationFrame(() => {
      this._completionInfoFrame = undefined;
      this._syncCompletionInfoPopoverNow();
    });
  };

  private _syncCompletionInfoPopoverNow = () => {
    if (!this.codemirror || !this._loadedCodeMirror) {
      return;
    }

    if (window.matchMedia("(max-width: 600px)").matches) {
      this._clearCompletionInfo();
      return;
    }

    const completion = this._loadedCodeMirror.selectedCompletion(
      this.codemirror.state
    );
    const selectedOption = this.codemirror.dom.querySelector(
      ".cm-tooltip-autocomplete li[aria-selected]"
    ) as HTMLElement | null;

    if (!completion || !selectedOption) {
      this._clearCompletionInfo();
      return;
    }

    const infoResult = this._getCompletionInfo(completion);

    if (!infoResult) {
      this._clearCompletionInfo();
      return;
    }

    const requestId = ++this._completionInfoRequest;
    const infoKey = completion.label;
    const popover = this._ensureCompletionInfoPopover();
    popover.anchor = selectedOption;

    const showPopover = async (info: CompletionInfo) => {
      if (requestId !== this._completionInfoRequest) {
        if (info && typeof info === "object" && "destroy" in info) {
          info.destroy?.();
        }
        return;
      }

      if (infoKey !== this._completionInfoKey) {
        this._renderCompletionInfoContent(info);
        this._completionInfoKey = infoKey;
      }

      await popover.updateComplete;
      popover.active = true;
      popover.reposition();
    };

    if ("then" in infoResult) {
      infoResult.then(showPopover).catch(() => {
        if (requestId === this._completionInfoRequest) {
          this._clearCompletionInfo();
        }
      });
      return;
    }

    showPopover(infoResult).catch(() => {
      if (requestId === this._completionInfoRequest) {
        this._clearCompletionInfo();
      }
    });
  };

  private _getStates = memoizeOne((states: HassEntities): Completion[] => {
    if (!states) {
      return [];
    }

    const options = Object.keys(states).map((key) => ({
      type: "variable",
      label: key,
      detail: states[key].attributes.friendly_name,
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

      // Properties that should never suggest entities
      const negativeProperties = ["action"];

      // Create regex pattern for negative properties
      const negativePropertyPattern = negativeProperties.join("|");
      const negativeEntityFieldRegex = new RegExp(
        `^\\s*(-\\s+)?(${negativePropertyPattern}):\\s*`
      );
      if (lineText.match(negativeEntityFieldRegex)) {
        return null;
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
      const iconList: {
        name: string;
        keywords: string[];
      }[] = (await import("../../build/mdi/iconList.json")).default;

      this._iconList = iconList.map((icon) => ({
        type: "variable",
        label: `mdi:${icon.name}`,
        detail: icon.keywords.join(", "),
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
    this._syncCompletionInfoPopover();
    if (!update.docChanged) {
      return;
    }
    this._value = update.state.doc.toString();
    this._canCopy = this._value?.length > 0;
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

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          position: relative;
          display: block;
          --code-editor-toolbar-height: 28px;
        }

        :host(.error-state) .cm-gutters {
          border-color: var(--error-state-color, var(--error-color)) !important;
        }

        :host(.hasToolbar) .cm-gutters {
          padding-top: 0;
        }

        :host(.hasToolbar) .cm-focused .cm-gutters {
          padding-top: 1px;
        }

        :host(.error-state) .cm-content {
          border-color: var(--error-state-color, var(--error-color)) !important;
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
          top: calc(var(--header-height, 56px) + var(--ha-space-2)) !important;
          left: var(--ha-space-2) !important;
          right: var(--ha-space-2) !important;
          bottom: var(--ha-space-2) !important;
          z-index: 6;
          border-radius: var(--ha-border-radius-lg) !important;
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

        :host(.in-dialog.fullscreen) {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        :host(.hasToolbar) .cm-editor {
          padding-top: var(--code-editor-toolbar-height);
        }

        :host(.fullscreen) .cm-editor {
          height: 100% !important;
          max-height: 100% !important;
          border-radius: var(--ha-border-radius-square) !important;
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

        wa-popup.completion-info-popover {
          --auto-size-available-width: min(
            420px,
            calc(100vw - (2 * var(--ha-space-4, 16px)))
          );
        }

        wa-popup.completion-info-popover::part(popup) {
          padding: 0;
          color: var(--primary-text-color);
          background-color: var(
            --code-editor-background-color,
            var(--card-background-color)
          );
          border: 1px solid var(--divider-color);
          border-radius: var(--mdc-shape-medium, 4px);
          box-shadow:
            0px 5px 5px -3px rgb(0 0 0 / 20%),
            0px 8px 10px 1px rgb(0 0 0 / 14%),
            0px 3px 14px 2px rgb(0 0 0 / 12%);
        }

        /* Hide completion info on narrow screens */
        @media (max-width: 600px) {
          wa-popup.completion-info-popover,
          .completion-info {
            display: none;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor": HaCodeEditor;
  }
}
