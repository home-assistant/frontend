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
import type { SyntaxNode } from "@lezer/common";
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
import { consume } from "@lit/context";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { getEntityContext } from "../common/entity/context/get_entity_context";
import { computeDeviceName } from "../common/entity/compute_device_name";
import { computeAreaName } from "../common/entity/compute_area_name";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { copyToClipboard } from "../common/util/copy-clipboard";
import { haStyleScrollbar } from "../resources/styles";
import type { JinjaArgType } from "../resources/jinja_ha_completions";
import type { HomeAssistant } from "../types";
import { showToast } from "../util/toast";
import { labelsContext } from "../data/context";
import type { LabelRegistryEntry } from "../data/label/label_registry";
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

  @consume({ context: labelsContext, subscribe: true })
  @state()
  private _labels?: LabelRegistryEntry[];

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
      this._loadedCodeMirror.foldGutter(),
      this._loadedCodeMirror.bracketMatching(),
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
        // closeBracketsKeymap must come before defaultKeymap so its Backspace
        // handler runs before the default delete-character binding.
        ...(!this.readOnly ? this._loadedCodeMirror.closeBracketsKeymap : []),
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
      this._loadedCodeMirror.yamlScalarHighlighter,
      this._loadedCodeMirror.yamlScalarHighlightStyle,
      this._loadedCodeMirror.readonlyCompartment.of(
        this._loadedCodeMirror.EditorView.editable.of(!this.readOnly)
      ),
      this._loadedCodeMirror.linewrapCompartment.of(
        this.linewrap ? this._loadedCodeMirror.EditorView.lineWrapping : []
      ),
      this._loadedCodeMirror.EditorView.updateListener.of(this._onUpdate),
      this._loadedCodeMirror.tooltips({
        position: "absolute",
      }),
      ...(this.placeholder ? [placeholder(this.placeholder)] : []),
    ];

    if (!this.readOnly) {
      const completionSources: CompletionSource[] = [
        this._loadedCodeMirror.haJinjaCompletionSource,
      ];
      if (this.autocompleteEntities && this.hass) {
        completionSources.push(this._entityCompletions.bind(this));
      }
      if (this.autocompleteIcons) {
        completionSources.push(this._mdiCompletions.bind(this));
      }
      extensions.push(
        this._loadedCodeMirror.autocompletion({
          override: completionSources,
          maxRenderedOptions: 10,
        }),
        this._loadedCodeMirror.closeBrackets(),
        this._loadedCodeMirror.closeBracketsOverride,
        this._loadedCodeMirror.closePercentBrace
      );
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
    const key =
      typeof completion.apply === "string"
        ? completion.apply
        : completion.label;
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

  private _renderAttributeInfo = (
    entityId: string,
    attribute: string
  ): CompletionInfo | null => {
    if (!this.hass) return null;
    const stateObj = this.hass.states[entityId];
    if (!stateObj) return null;

    const translatedName = this.hass.formatEntityAttributeName(
      stateObj,
      attribute
    );
    const formattedValue = this.hass.formatEntityAttributeValue(
      stateObj,
      attribute
    );
    const rawValue = stateObj.attributes[attribute];
    const rawValueStr =
      rawValue !== null && rawValue !== undefined
        ? String(rawValue)
        : undefined;

    const completionItems: CompletionItem[] = [
      {
        label: translatedName,
        value: formattedValue,
        // Show raw value as sub-value only when it differs from the formatted one
        subValue:
          rawValueStr !== undefined && rawValueStr !== formattedValue
            ? rawValueStr
            : undefined,
      },
    ];

    const completionInfo = document.createElement("div");
    completionInfo.classList.add("completion-info");
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
    if (
      this.hass &&
      typeof completion.apply === "string" &&
      completion.apply in this.hass.states
    ) {
      return this._renderInfo(completion);
    }

    if (completion.label.startsWith("mdi:")) {
      return renderIcon(completion);
    }

    // Attribute completions attach an info function directly on the object.
    if (typeof completion.info === "function") {
      return completion.info(completion);
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
      label: states[key].attributes.friendly_name
        ? `${states[key].attributes.friendly_name} ${key}` // label is used for searching, so include both name and entity_id here
        : key,
      displayLabel: key,
      detail: states[key].attributes.friendly_name,
      apply: key,
    }));

    return options;
  });

  // Map of HA Jinja function name → (arg index → JinjaArgType).
  // Derived from the snippet definitions in jinja_ha_completions.ts.
  private get _jinjaFunctionArgTypes() {
    return this._loadedCodeMirror!.JINJA_FUNCTION_ARG_TYPES;
  }

  // The accessible properties on TemplateStateBase (from HA core source).
  // These are valid completions at `states.<domain>.<entity>.___`.
  private static readonly _STATE_FIELDS: string[] = [
    "state",
    "attributes",
    "last_changed",
    "last_updated",
    "context",
    "domain",
    "object_id",
    "name",
    "entity_id",
    "state_with_unit",
  ];

  /**
   * Handles `states.<domain>.<entity>.<field>.<attr>` dot-notation completions.
   *
   * Walks the MemberExpression chain in the Jinja syntax tree rooted at the
   * `states` VariableName and offers completions depending on depth:
   *   - `states.`           → all domains
   *   - `states.<d>.`       → all entity object_ids for that domain
   *   - `states.<d>.<e>.`   → fixed state fields
   *   - `states.<d>.<e>.attributes.` → attribute names from hass.states
   *
   * Returns undefined to fall through when the cursor is not inside a
   * `states.` chain; returns null/CompletionResult to short-circuit.
   */
  private _statesDotNotationCompletions(
    context: CompletionContext
  ): CompletionResult | null | undefined {
    if (!this.hass) return undefined;

    const { state: editorState, pos } = context;
    const tree = this._loadedCodeMirror!.syntaxTree(editorState);
    const node = tree.resolveInner(pos, -1);

    // We act on two cursor positions:
    //   (a) cursor is ON a PropertyName node   → partially typed identifier
    //   (b) cursor is on/just-after a "." node → right after the dot
    // In both cases the parent is a MemberExpression.
    const memberNode = node.parent;
    // "from" for the completion result (start of what the user is currently typing)
    let completionFrom = pos;

    if (
      node.name === "PropertyName" &&
      memberNode?.name === "MemberExpression"
    ) {
      // Cursor is on a PropertyName — replace from start of that name.
      completionFrom = node.from;
    } else if (node.name === "." && memberNode?.name === "MemberExpression") {
      // Cursor just after "." — insert from current position.
      completionFrom = pos;
    } else {
      return undefined;
    }

    // Walk up the MemberExpression chain to collect property segments and
    // find the root VariableName.
    //
    // Each MemberExpression has the shape:  <object> "." <PropertyName>
    // so the last PropertyName in the chain is the one directly under the
    // outermost member expression.  We walk *up* to find the root, collecting
    // each intermediate PropertyName text along the way.
    //
    // Example for  states.light.living_room.attributes  at cursor after the
    // last dot:
    //   MemberExpression          <- memberNode (cursor's parent)
    //     MemberExpression        <- depth 3  (states.light.living_room)
    //       MemberExpression      <- depth 2  (states.light)
    //         VariableName "states"
    //         "."
    //         PropertyName "light"
    //       "."
    //       PropertyName "living_room"
    //     "."
    //     (no PropertyName yet — cursor is right here)

    // Collect the segments bottom-up (innermost first).
    const segments: string[] = [];
    let cur = memberNode; // the MemberExpression directly containing the cursor

    // If cursor is on a PropertyName, that is part of *this* MemberExpression;
    // skip it — we don't want to include what the user is currently typing.
    // We want the segments that lead *up to* the current position.

    // Walk up through parent MemberExpressions collecting PropertyName texts.
    // Each MemberExpression's last PropertyName child is the segment for that
    // level — but we skip the innermost one if the cursor is on a PropertyName
    // (that's the partial input, not a committed segment).
    let skipFirst = node.name === "PropertyName";

    while (cur?.name === "MemberExpression") {
      // The PropertyName child of this MemberExpression is its rightmost segment.
      let propChild = cur.lastChild;
      while (propChild && propChild.name !== "PropertyName") {
        propChild = propChild.prevSibling;
      }
      if (propChild) {
        if (skipFirst) {
          skipFirst = false;
        } else {
          segments.unshift(
            editorState.doc.sliceString(propChild.from, propChild.to)
          );
        }
      }
      // The object side is the first child of the MemberExpression
      const objectChild = cur.firstChild;
      if (!objectChild) break;
      if (objectChild.name === "VariableName") {
        // Check if this is the root "states" variable
        const varName = editorState.doc.sliceString(
          objectChild.from,
          objectChild.to
        );
        if (varName !== "states") return undefined; // not a states chain
        break; // found root
      }
      if (objectChild.name !== "MemberExpression") return undefined;
      cur = objectChild;
    }

    // Verify we actually found a root VariableName "states" (cur must be a
    // MemberExpression whose first child is VariableName "states").
    const rootObject = cur?.firstChild;
    if (!rootObject || rootObject.name !== "VariableName") return undefined;
    if (
      editorState.doc.sliceString(rootObject.from, rootObject.to) !== "states"
    ) {
      return undefined;
    }

    const depth = segments.length; // number of segments already committed

    switch (depth) {
      case 0: {
        // states.   → offer all unique domains
        const domains = [
          ...new Set(
            Object.keys(this.hass.states).map((id) => id.split(".")[0])
          ),
        ].sort();
        return {
          from: completionFrom,
          options: domains.map((d) => ({ label: d, type: "variable" })),
          validFor: /^\w*$/,
        };
      }
      case 1: {
        // states.<domain>.   → offer entity object_ids for that domain
        const [domain] = segments;
        const entities = Object.keys(this.hass.states)
          .filter((id) => id.startsWith(`${domain}.`))
          .map((id) => id.split(".").slice(1).join("."));
        if (!entities.length) return { from: completionFrom, options: [] };
        return {
          from: completionFrom,
          options: entities.map((e) => ({ label: e, type: "variable" })),
          validFor: /^\w*$/,
        };
      }
      case 2: {
        // states.<domain>.<entity>.   → fixed state fields
        return {
          from: completionFrom,
          options: HaCodeEditor._STATE_FIELDS.map((f) => ({
            label: f,
            type: "property",
          })),
          validFor: /^\w*$/,
        };
      }
      case 3: {
        // states.<domain>.<entity>.<field>.
        const [domain, entity, field] = segments;
        if (field !== "attributes") {
          // No further completions for non-attribute fields
          return { from: completionFrom, options: [] };
        }
        // Offer attribute names from the entity's state object
        const entityId = `${domain}.${entity}`;
        const entityState = this.hass.states[entityId];
        if (!entityState) return { from: completionFrom, options: [] };
        const attrNames = Object.keys(entityState.attributes).sort();
        return {
          from: completionFrom,
          options: attrNames.map((a) => ({ label: a, type: "property" })),
          validFor: /^\w*$/,
        };
      }
      default:
        // Depth ≥ 4 — no further completions
        return { from: completionFrom, options: [] };
    }
  }

  /**
   * Returns completions when inside a quoted Jinja string argument of a known
   * HA function, or inside a states['...'] subscript.
   * Returns undefined to signal the caller should fall through to other logic.
   */
  private _jinjaStringArgCompletions(
    context: CompletionContext
  ): CompletionResult | null | undefined {
    const { state: editorState, pos } = context;
    const node = this._loadedCodeMirror!.syntaxTree(editorState).resolveInner(
      pos,
      -1
    );

    // Must be inside a StringLiteral
    if (node.name !== "StringLiteral") return undefined;

    // Case 1: states['entity_id'] — StringLiteral inside SubscriptExpression
    // whose object is the `states` variable.
    const subscript = node.parent;
    if (subscript?.name === "SubscriptExpression") {
      const obj = subscript.firstChild;
      if (obj && editorState.doc.sliceString(obj.from, obj.to) === "states") {
        return this._completionResultForArgType("entity_id", node);
      }
    }

    // Case 2: string argument of a known HA function call.
    const argList = node.parent;
    if (argList?.name !== "ArgumentList") return undefined;

    const callExpr = argList.parent;
    if (callExpr?.name !== "CallExpression") return undefined;

    const fnNode = callExpr.firstChild;
    if (!fnNode) return undefined;

    const fnName = editorState.doc.sliceString(fnNode.from, fnNode.to);
    const argTypeMap = this._jinjaFunctionArgTypes.get(fnName);
    if (!argTypeMap) return undefined;

    // Walk ArgumentList children to find the zero-based index of this node.
    // Children are: "(" arg0 "," arg1 "," arg2 ... ")" — skip punctuation.
    let argIndex = 0;
    let child = argList.firstChild?.nextSibling; // skip opening "("
    while (child) {
      if (child.name === ")") break;
      if (child.name !== ",") {
        if (child.from === node.from) break;
        argIndex++;
      }
      child = child.nextSibling;
    }

    const argType = argTypeMap.get(argIndex);
    if (!argType) return undefined;

    // For attribute completions, try to resolve the entity_id from the
    // sibling argument whose type is entity_id in the same call.
    if (argType === "attribute") {
      const entityId = this._entityIdFromSiblingArg(
        argList,
        argTypeMap,
        editorState
      );
      return this._attributeCompletionResult(node, entityId);
    }

    return this._completionResultForArgType(argType, node);
  }

  /**
   * Scans the ArgumentList for the first argument whose type is `entity_id`
   * and returns the literal string value it contains, or null if not found /
   * not a plain string literal.
   */
  private _entityIdFromSiblingArg(
    argList: SyntaxNode,
    argTypeMap: Map<number, JinjaArgType>,
    editorState: CompletionContext["state"]
  ): string | null {
    // Find the index of the entity_id argument in the type map.
    let entityArgIndex: number | undefined;
    for (const [idx, type] of argTypeMap) {
      if (type === "entity_id") {
        entityArgIndex = idx;
        break;
      }
    }
    if (entityArgIndex === undefined) return null;

    // Walk the ArgumentList to find that argument node.
    let idx = 0;
    let child = argList.firstChild?.nextSibling; // skip "("
    while (child) {
      if (child.name === ")") break;
      if (child.name !== ",") {
        if (idx === entityArgIndex) {
          // child should be a StringLiteral — extract its content without quotes.
          if (child.name !== "StringLiteral") return null;
          const raw = editorState.doc.sliceString(child.from, child.to);
          // Strip surrounding quote character (single or double).
          return raw.slice(1, -1);
        }
        idx++;
      }
      child = child.nextSibling;
    }
    return null;
  }

  /**
   * Dispatches to the appropriate completion result builder for the given
   * argument type. Add new cases here as completion sources are implemented.
   *
   * Always returns a CompletionResult (never null) so that other completion
   * sources are suppressed when the cursor is inside a known typed string arg.
   * An empty options list is returned when no completions are available.
   */
  private _completionResultForArgType(
    argType: JinjaArgType,
    stringNode: { from: number; to: number }
  ): CompletionResult {
    const from = stringNode.from + 1;
    const empty: CompletionResult = { from, options: [] };
    switch (argType) {
      case "entity_id":
        return this._entityCompletionResult(stringNode) ?? empty;
      case "device_id":
        return this._deviceCompletionResult(stringNode) ?? empty;
      case "area_id":
        return this._areaCompletionResult(stringNode) ?? empty;
      case "floor_id":
        return this._floorCompletionResult(stringNode) ?? empty;
      case "label_id":
        return this._labelCompletionResult(stringNode) ?? empty;
      case "attribute":
        // No entity context available — return empty to suppress other sources.
        return empty;
      default:
        return empty;
    }
  }

  /**
   * Build a CompletionResult for attribute names of a specific entity.
   * `entityId` may be null when the sibling entity arg is not yet filled in,
   * in which case an empty result is returned (other sources stay suppressed).
   */
  private _attributeCompletionResult(
    stringNode: { from: number; to: number },
    entityId: string | null
  ): CompletionResult {
    const from = stringNode.from + 1;
    const empty: CompletionResult = { from, options: [] };
    if (!entityId || !this.hass) return empty;
    const entityState = this.hass.states[entityId];
    if (!entityState) return empty;
    const attrs = Object.keys(entityState.attributes).sort();
    if (!attrs.length) return empty;
    return {
      from,
      options: attrs.map((a) => ({
        label: a,
        type: "property",
        info: () => this._renderAttributeInfo(entityId, a),
      })),
      validFor: /^[\w.]*$/,
    };
  }

  /** Build a CompletionResult for entity IDs, with `from` set inside the quotes. */
  private _entityCompletionResult(stringNode: {
    from: number;
    to: number;
  }): CompletionResult | null {
    const states = this._getStates(this.hass!.states);
    if (!states?.length) return null;
    // from is stringNode.from + 1 to skip the opening quote character.
    const from = stringNode.from + 1;
    // Always offer completions inside a known entity-string context, including
    // immediately after the opening quote (e.g. after snippet insertion).
    return {
      from,
      options: states,
      validFor: /^[\w.]*$/,
    };
  }

  private _getDevices = memoizeOne(
    (devices: HomeAssistant["devices"]): Completion[] =>
      Object.values(devices)
        .filter((device) => !device.disabled_by)
        .map((device) => {
          const name = computeDeviceName(device);
          return {
            type: "variable",
            label: `${name} ${device.id}`,
            displayLabel: name ?? device.id,
            detail: device.id,
            apply: device.id,
          };
        })
  );

  /** Build a CompletionResult for device IDs, with `from` set inside the quotes. */
  private _deviceCompletionResult(stringNode: {
    from: number;
    to: number;
  }): CompletionResult | null {
    if (!this.hass?.devices) return null;
    const devices = this._getDevices(this.hass.devices);
    if (!devices.length) return null;
    return {
      from: stringNode.from + 1,
      options: devices,
      validFor: /^[^"]*$/,
    };
  }

  private _getAreas = memoizeOne(
    (areas: HomeAssistant["areas"]): Completion[] =>
      Object.values(areas).map((area) => {
        const name = computeAreaName(area) ?? area.area_id;
        return {
          type: "variable",
          label: `${name} ${area.area_id}`, // label is used for searching, so include both name and ID here
          displayLabel: name,
          detail: area.area_id,
          apply: area.area_id,
        };
      })
  );

  /** Build a CompletionResult for area IDs, with `from` set inside the quotes. */
  private _areaCompletionResult(stringNode: {
    from: number;
    to: number;
  }): CompletionResult | null {
    if (!this.hass?.areas) return null;
    const areas = this._getAreas(this.hass.areas);
    if (!areas.length) return null;
    return {
      from: stringNode.from + 1,
      options: areas,
      validFor: /^[^"]*$/,
    };
  }

  private _getFloors = memoizeOne(
    (floors: HomeAssistant["floors"]): Completion[] =>
      Object.values(floors).map((floor) => {
        const name = computeFloorName(floor) ?? floor.floor_id;
        return {
          type: "variable",
          label: `${name} ${floor.floor_id}`, // label is used for searching, so include both name and ID here
          displayLabel: name,
          detail: floor.floor_id,
          apply: floor.floor_id,
        };
      })
  );

  /** Build a CompletionResult for floor IDs, with `from` set inside the quotes. */
  private _floorCompletionResult(stringNode: {
    from: number;
    to: number;
  }): CompletionResult | null {
    if (!this.hass?.floors) return null;
    const floors = this._getFloors(this.hass.floors);
    if (!floors.length) return null;
    return {
      from: stringNode.from + 1,
      options: floors,
      validFor: /^[^"]*$/,
    };
  }

  private _getLabels = memoizeOne(
    (labels: LabelRegistryEntry[]): Completion[] =>
      labels.map((label) => {
        const name = label.name.trim() || label.label_id;
        return {
          type: "variable",
          label: `${name} ${label.label_id}`, // label is used for searching, so include both name and ID here
          displayLabel: name,
          detail: label.label_id,
          apply: label.label_id,
        };
      })
  );

  /** Build a CompletionResult for label IDs, with `from` set inside the quotes. */
  private _labelCompletionResult(stringNode: {
    from: number;
    to: number;
  }): CompletionResult | null {
    if (!this._labels?.length) return null;
    const labels = this._getLabels(this._labels);
    if (!labels.length) return null;
    return {
      from: stringNode.from + 1,
      options: labels,
      validFor: /^[^"]*$/,
    };
  }

  private _entityCompletions(
    context: CompletionContext
  ): CompletionResult | null | Promise<CompletionResult | null> {
    // Jinja context: offer entity completions inside string arguments of
    // entity-accepting functions, and inside states['...'] subscripts.
    if (this.mode === "yaml" || this.mode === "jinja2") {
      // First try states.<domain>.<entity>.<field> dot-notation completions.
      const statesDotResult = this._statesDotNotationCompletions(context);
      if (statesDotResult !== undefined) {
        return statesDotResult;
      }

      const jinjaEntityResult = this._jinjaStringArgCompletions(context);
      if (jinjaEntityResult !== undefined) {
        return jinjaEntityResult;
      }
    }

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
        // Calculate the position after the entity field key+colon.
        // The regex consumes trailing spaces too, so afterField lands right
        // where the entity ID should start. If the cursor is sitting directly
        // after the colon with no space (e.g. "entity:|"), we need to insert
        // a space before the entity ID, so we shift `from` back to the colon
        // and use an `apply` that prepends the space.
        const afterField = currentLine.from + entityFieldMatch[0].length;
        const needsSpace =
          afterField > 0 &&
          context.state.doc.sliceString(afterField - 1, afterField) === ":";

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

          const options = needsSpace
            ? filteredStates.map((s) => ({ ...s, apply: ` ${s.label}` }))
            : filteredStates;

          return {
            from: afterField,
            options,
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

    // Original entity completion logic for non-YAML or when not in entity_id field.
    // Not used in jinja2 mode — Jinja string-arg completions are handled above via
    // _jinjaStringArgCompletions() which is context-aware.
    if (this.mode === "jinja2") {
      return null;
    }

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
            calc(var(--safe-width) - var(--ha-space-8))
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
