import type { EditorView, KeyBinding, ViewUpdate } from "@codemirror/view";
import type {
  CompletionContext,
  CompletionResult,
  Completion,
} from "@codemirror/autocomplete";
import { css, CSSResultGroup, PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { fireEvent } from "../common/dom/fire_event";
import { loadCodeMirror } from "../resources/codemirror.ondemand";
import { HomeAssistant } from "../types";

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

@customElement("ha-code-editor")
export class HaCodeEditor extends ReactiveElement {
  public codemirror?: EditorView;

  @property() public mode = "yaml";

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public readOnly = false;

  @property({ type: Boolean }) public hasAutocomplete = false;

  @property() public error = false;

  @state() private _value = "";

  private _states: HassEntity[] | null = [];

  private _loadedCodeMirror?: typeof import("../resources/codemirror");

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
    const className = this._loadedCodeMirror.HighlightStyle.get(
      this.codemirror.state,
      this._loadedCodeMirror.tags.comment
    );
    return !!this.shadowRoot!.querySelector(`span.${className}`);
  }

  public connectedCallback() {
    super.connectedCallback();
    if (!this.codemirror) {
      return;
    }
    if (this.autofocus !== false) {
      this.codemirror.focus();
    }
  }

  protected update(changedProps: PropertyValues): void {
    super.update(changedProps);

    if (!this.codemirror) {
      return;
    }

    if (changedProps.has("mode")) {
      this.codemirror.dispatch({
        effects: this._loadedCodeMirror!.langCompartment!.reconfigure(
          this._mode
        ),
      });
    }
    if (changedProps.has("readOnly")) {
      this.codemirror.dispatch({
        effects: this._loadedCodeMirror!.readonlyCompartment!.reconfigure(
          this._loadedCodeMirror!.EditorView!.editable.of(!this.readOnly)
        ),
      });
    }
    if (changedProps.has("_value") && this._value !== this.value) {
      this.codemirror.dispatch({
        changes: {
          from: 0,
          to: this.codemirror.state.doc.length,
          insert: this._value,
        },
      });
    }
    if (changedProps.has("error")) {
      this.classList.toggle("error-state", this.error);
    }
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._blockKeyboardShortcuts();
    this._load();
  }

  private get _mode() {
    return this._loadedCodeMirror!.langs[this.mode];
  }

  private async _load(): Promise<void> {
    this._loadedCodeMirror = await loadCodeMirror();
    const extensions = [
      this._loadedCodeMirror.lineNumbers(),
      this._loadedCodeMirror.EditorState.allowMultipleSelections.of(true),
      this._loadedCodeMirror.history(),
      this._loadedCodeMirror.highlightSelectionMatches(),
      this._loadedCodeMirror.highlightActiveLine(),
      this._loadedCodeMirror.drawSelection(),
      this._loadedCodeMirror.rectangularSelection(),
      this._loadedCodeMirror.keymap.of([
        ...this._loadedCodeMirror.defaultKeymap,
        ...this._loadedCodeMirror.searchKeymap,
        ...this._loadedCodeMirror.historyKeymap,
        ...this._loadedCodeMirror.tabKeyBindings,
        saveKeyBinding,
      ] as KeyBinding[]),
      this._loadedCodeMirror.langCompartment.of(this._mode),
      this._loadedCodeMirror.theme,
      this._loadedCodeMirror.Prec.fallback(
        this._loadedCodeMirror.highlightStyle
      ),
      this._loadedCodeMirror.readonlyCompartment.of(
        this._loadedCodeMirror.EditorView.editable.of(!this.readOnly)
      ),
      this._loadedCodeMirror.EditorView.updateListener.of((update) =>
        this._onUpdate(update)
      ),
    ];

    if (!this.readOnly && this.hasAutocomplete) {
      this._states = this._getStates(this.hass!.states);
      extensions.push(
        this._loadedCodeMirror.autocompletion({
          override: [this._entityCompletions.bind(this)],
          maxRenderedOptions: 10,
        })
      );
    }

    this.codemirror = new this._loadedCodeMirror.EditorView({
      state: this._loadedCodeMirror.EditorState.create({
        doc: this._value,
        extensions,
      }),
      root: this.shadowRoot!,
      parent: this.shadowRoot!,
    });
  }

  private _getStates = memoizeOne((states: HassEntities | null | undefined) => {
    if (!states) {
      return [];
    }
    const entityIds = Object.keys(states)
      .sort()
      .map((key) => states[key]);

    if (!entityIds.length) {
      return null;
    }

    return entityIds;
  });

  private _entityCompletions(
    context: CompletionContext
  ): CompletionResult | null | Promise<CompletionResult | null> {
    const entityWord = context.matchBefore(/[a-z_]{3,}\./);

    if (
      !this._states ||
      !this._states.length ||
      !entityWord ||
      (entityWord.from === entityWord.to && !context.explicit)
    ) {
      return null;
    }

    const options: Completion[] = this._states.map(
      (entity_state: HassEntity) => ({
        type: "variable",
        label: entity_state.entity_id,
        info: entity_state.state,
      })
    );

    return {
      from: Number(entityWord.from),
      options,
      span: /^\w*.\w*$/,
    };
  }

  private _blockKeyboardShortcuts() {
    this.addEventListener("keydown", (ev) => ev.stopPropagation());
  }

  private _onUpdate(update: ViewUpdate): void {
    if (!update.docChanged) {
      return;
    }
    const newValue = this.value;
    if (newValue === this._value) {
      return;
    }
    this._value = newValue;
    fireEvent(this, "value-changed", { value: this._value });
  }

  // Only Lit 2.0 will use this
  static get styles(): CSSResultGroup {
    return css`
      :host(.error-state) div.cm-wrap .cm-gutters {
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
