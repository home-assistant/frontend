import type { StreamLanguage } from "@codemirror/stream-parser";
import type { EditorView, KeyBinding, ViewUpdate } from "@codemirror/view";
import {
  customElement,
  internalProperty,
  property,
  PropertyValues,
  UpdatingElement,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import { loadCodeMirror } from "../resources/codemirror.ondemand";

declare global {
  interface HASSDomEvents {
    "editor-save": undefined;
  }
}

const modeTag = Symbol("mode");

const readOnlyTag = Symbol("readOnly");

const saveKeyBinding: KeyBinding = {
  key: "Mod-s",
  run: (view: EditorView) => {
    fireEvent(view.dom, "editor-save");
    return true;
  },
};

@customElement("ha-code-editor")
export class HaCodeEditor extends UpdatingElement {
  public codemirror?: EditorView;

  @property() public mode = "yaml";

  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public readOnly = false;

  @property() public error = false;

  @internalProperty() private _value = "";

  @internalProperty() private _langs?: Record<string, StreamLanguage<unknown>>;

  public set value(value: string) {
    this._value = value;
  }

  public get value(): string {
    return this.codemirror ? this.codemirror.state.doc.toString() : this._value;
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
        reconfigure: {
          [modeTag]: this._mode,
        },
      });
    }
    if (changedProps.has("readOnly")) {
      this.codemirror.dispatch({
        reconfigure: {
          [readOnlyTag]: !this.readOnly,
        },
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
    return this._langs![this.mode];
  }

  private async _load(): Promise<void> {
    const loaded = await loadCodeMirror();

    this._langs = loaded.langs;

    const shadowRoot = this.attachShadow({ mode: "open" });

    shadowRoot!.innerHTML = `<style>
      :host(.error-state) div.cm-wrap .cm-gutters {
        border-color: var(--error-state-color, red);
      }
    </style>`;

    const container = document.createElement("span");

    shadowRoot.appendChild(container);

    this.codemirror = new loaded.EditorView({
      state: loaded.EditorState.create({
        doc: this._value,
        extensions: [
          loaded.lineNumbers(),
          loaded.keymap.of([
            ...loaded.defaultKeymap,
            loaded.defaultTabBinding,
            saveKeyBinding,
          ]),
          loaded.tagExtension(modeTag, this._mode),
          loaded.theme,
          loaded.Prec.fallback(loaded.highlightStyle),
          loaded.EditorView.updateListener.of((update) =>
            this._onUpdate(update)
          ),
          loaded.tagExtension(
            readOnlyTag,
            loaded.EditorView.editable.of(!this.readOnly)
          ),
        ],
      }),
      root: shadowRoot,
      parent: container,
    });
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor": HaCodeEditor;
  }
}
