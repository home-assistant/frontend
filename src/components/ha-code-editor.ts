import type {
  Completion,
  CompletionContext,
  CompletionInfo,
  CompletionResult,
  CompletionSource,
} from "@codemirror/autocomplete";
import type { Extension, TransactionSpec } from "@codemirror/state";
import type { EditorView, KeyBinding, ViewUpdate } from "@codemirror/view";
import { mdiArrowExpand, mdiArrowCollapse } from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, ReactiveElement, html, render } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { getEntityContext } from "../common/entity/context/get_entity_context";
import type { HomeAssistant } from "../types";
import "./ha-icon";
import "./ha-icon-button";

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

  @state() private _value = "";

  @state() private _isFullscreen = false;

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  private _loadedCodeMirror?: typeof import("../resources/codemirror");

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
    if (this._isFullscreen) {
      this._toggleFullscreen();
    }
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
    if (changedProps.has("error")) {
      this.classList.toggle("error-state", this.error);
    }
    if (changedProps.has("_isFullscreen")) {
      this.classList.toggle("fullscreen", this._isFullscreen);
    }
    if (changedProps.has("disableFullscreen")) {
      this._updateFullscreenButton();
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

    this.codemirror = new this._loadedCodeMirror.EditorView({
      state: this._loadedCodeMirror.EditorState.create({
        doc: this._value,
        extensions,
      }),
      parent: this.renderRoot,
    });

    this._updateFullscreenButton();
  }

  private _updateFullscreenButton() {
    const existingButton = this.renderRoot.querySelector(".fullscreen-button");

    if (this.disableFullscreen) {
      // Remove button if it exists and fullscreen is disabled
      if (existingButton) {
        existingButton.remove();
      }
      // Exit fullscreen if currently in fullscreen mode
      if (this._isFullscreen) {
        this._isFullscreen = false;
      }
      return;
    }

    // Create button if it doesn't exist
    if (!existingButton) {
      const button = document.createElement("ha-icon-button");
      (button as any).path = this._isFullscreen
        ? mdiArrowCollapse
        : mdiArrowExpand;
      button.setAttribute(
        "label",
        this._isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
      );
      button.classList.add("fullscreen-button");
      // Use bound method to ensure proper this context
      button.addEventListener("click", this._handleFullscreenClick);
      this.renderRoot.appendChild(button);
    } else {
      // Update existing button
      (existingButton as any).path = this._isFullscreen
        ? mdiArrowCollapse
        : mdiArrowExpand;
      existingButton.setAttribute(
        "label",
        this._isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
      );
    }
  }

  private _handleFullscreenClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    this._toggleFullscreen();
  };

  private _toggleFullscreen() {
    this._isFullscreen = !this._isFullscreen;
    this._updateFullscreenButton();
  }

  private _handleKeyDown = (e: KeyboardEvent) => {
    if (this._isFullscreen && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this._toggleFullscreen();
    } else if (e.key === "F11" && !this.disableFullscreen) {
      e.preventDefault();
      e.stopPropagation();
      this._toggleFullscreen();
    }
  };

  private _renderInfo = (completion: Completion): CompletionInfo => {
    const key = completion.label;
    const context = getEntityContext(this.hass!.states[key], this.hass!);

    const completionInfo = document.createElement("div");
    completionInfo.classList.add("completion-info");

    render(
      html`
        <span
          ><strong
            >${this.hass!.localize(
              "ui.components.entity.entity-state-picker.state"
            )}:</strong
          ></span
        >
        <span>${this.hass!.states[key].state}</span>

        <span
          ><strong
            >${this.hass!.localize("ui.components.area-picker.area")}:</strong
          ></span
        >
        <span
          >${context.area?.name ??
          this.hass!.localize("ui.components.device-picker.no_area")}</span
        >
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
    if (!update.docChanged) {
      return;
    }
    this._value = update.state.doc.toString();
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
    }

    :host(.error-state) .cm-gutters {
      border-color: var(--error-state-color, red);
    }

    .fullscreen-button {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 1;
      color: var(--secondary-text-color);
      background-color: var(--secondary-background-color);
      border-radius: 50%;
      opacity: 0.9;
      transition: opacity 0.2s;
      --mdc-icon-button-size: 32px;
      --mdc-icon-size: 18px;
      /* Ensure button is clickable on iOS */
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .fullscreen-button:hover,
    .fullscreen-button:active {
      opacity: 1;
    }

    @media (hover: none) {
      .fullscreen-button {
        opacity: 0.8;
      }
    }

    :host(.fullscreen) {
      position: fixed !important;
      top: calc(var(--header-height, 56px) + 8px) !important;
      left: 8px !important;
      right: 8px !important;
      bottom: 8px !important;
      z-index: 9999 !important;
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

    :host(.fullscreen) .cm-editor {
      height: 100% !important;
      max-height: 100% !important;
      border-radius: 0 !important;
    }

    :host(.fullscreen) .fullscreen-button {
      top: calc(var(--safe-area-inset-top, 0px) + 8px);
      right: calc(var(--safe-area-inset-right, 0px) + 8px);
    }

    .completion-info {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 3px;
      padding: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor": HaCodeEditor;
  }
}
