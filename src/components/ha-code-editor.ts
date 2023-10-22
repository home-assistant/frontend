import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from "@codemirror/autocomplete";
import type { Extension, TransactionSpec } from "@codemirror/state";
import type { EditorView, KeyBinding, ViewUpdate } from "@codemirror/view";
import { HassEntities } from "home-assistant-js-websocket";
import { css, CSSResultGroup, PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { HomeAssistant } from "../types";
import "./ha-icon";

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

  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public readOnly = false;

  @property({ type: Boolean, attribute: "autocomplete-entities" })
  public autocompleteEntities = false;

  @property({ type: Boolean, attribute: "autocomplete-icons" })
  public autocompleteIcons = false;

  @property({ type: Boolean }) public error = false;

  @state() private _value = "";

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
        effects: this._loadedCodeMirror!.langCompartment!.reconfigure(
          this._mode
        ),
      });
    }
    if (changedProps.has("readOnly")) {
      transactions.push({
        effects: this._loadedCodeMirror!.readonlyCompartment!.reconfigure(
          this._loadedCodeMirror!.EditorView!.editable.of(!this.readOnly)
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
      this._loadedCodeMirror.EditorView.updateListener.of(this._onUpdate),
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
  }

  private _getStates = memoizeOne((states: HassEntities): Completion[] => {
    if (!states) {
      return [];
    }
    const options = Object.keys(states).map((key) => ({
      type: "variable",
      label: key,
      detail: states[key].attributes.friendly_name,
      info: `State: ${states[key].state}`,
    }));

    return options;
  });

  private _entityCompletions(
    context: CompletionContext
  ): CompletionResult | null | Promise<CompletionResult | null> {
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

  static get styles(): CSSResultGroup {
    return css`
      :host(.error-state) .cm-gutters {
        border-color: var(--error-state-color, red);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor": HaCodeEditor;
  }
}
