import type { ContextType } from "@lit/context";
import { mdiChevronRight } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-svg-icon";
import { consume } from "../../../../common/decorators/consume";
import { internationalizationContext } from "../../../../data/context";
import type {
  DebugConsoleChild,
  DebugConsoleGetAttributeResult,
  DebugConsoleInspectResult,
  DebugConsoleObjects,
  DebugConsoleValue,
} from "../../../../data/debug_console";

/**
 * A value in the console. Objects expand into a tree, loading their children
 * from the backend on demand, like the object inspector in browser consoles.
 */
@customElement("tools-debug-console-value")
export class ToolsDebugConsoleValue extends LitElement {
  // Not the hass object: trees can be large, and should not update on every
  // state change in Home Assistant.
  @property({ attribute: false }) public objects!: DebugConsoleObjects;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @property({ attribute: false }) public value?: DebugConsoleValue;

  @property() public key?: string;

  /** Set for a property that is only evaluated once selected. */
  @property({ type: Boolean }) public getter = false;

  /** The object the getter belongs to. */
  @property({ attribute: false }) public parentId?: string;

  @state() private _expanded = false;

  @state() private _children?: DebugConsoleInspectResult;

  @state() private _error?: string;

  @state() private _evaluated?: DebugConsoleValue;

  // Properties can change things, so one evaluation at a time.
  @state() private _evaluating = false;

  // Bumped when the value changes, so answers about an earlier one are dropped.
  private _request = 0;

  // Inspecting runs code of the object, so reopening waits for the answer
  // instead of asking again.
  private _inspecting = false;

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (changedProps.has("value") || changedProps.has("parentId")) {
      this._request++;
      this._expanded = false;
      this._inspecting = false;
      this._children = undefined;
      this._error = undefined;
      this._evaluated = undefined;
    }
  }

  protected render() {
    const key = this.key
      ? html`<span class="key">${this.key}</span><span class="colon">: </span>`
      : nothing;

    if (this._error) {
      return html`${key}<span class="error">${this._error}</span>`;
    }

    const value = this._value;

    if (this.getter && !value) {
      const label = this._i18n.localize(
        "ui.panel.config.tools.tabs.debug_console.evaluate_property",
        { property: this.key ?? "" }
      );
      return html`${key}<button
          class="getter"
          title=${label}
          aria-label=${label}
          .disabled=${this._evaluating}
          @click=${this._evaluate}
        >
          (...)
        </button>`;
    }

    if (!value) {
      return nothing;
    }

    if (value.type !== "object") {
      return html`${key}${this._renderPrimitive(value)}`;
    }

    return html`
      <button
        class="toggle"
        aria-expanded=${this._expanded ? "true" : "false"}
        @click=${this._toggle}
      >
        <ha-svg-icon
          class=${this._expanded ? "chevron expanded" : "chevron"}
          .path=${mdiChevronRight}
        ></ha-svg-icon>
        ${key}<span class="class">${value.class}</span>${
          value.length !== undefined
            ? html`<span class="length">(${value.length})</span>`
            : nothing
        }
        <span class="preview">${value.preview}</span>
      </button>
      ${
        this._expanded && this._children
          ? html`<div class="children">
              ${this._children.children.map((child) => this._renderChild(child))}
              ${
                this._children.truncated
                  ? html`<div class="truncated">
                      ${this._i18n.localize(
                        "ui.panel.config.tools.tabs.debug_console.truncated",
                        { count: this._children.children.length }
                      )}
                    </div>`
                  : nothing
              }
            </div>`
          : nothing
      }
    `;
  }

  private get _value() {
    return this._evaluated ?? this.value;
  }

  private _renderPrimitive(
    value: Exclude<DebugConsoleValue, { type: "object" }>
  ) {
    switch (value.type) {
      case "none":
        return html`<span class="keyword">None</span>`;
      case "boolean":
        return html`<span class="keyword"
          >${value.value ? "True" : "False"}</span
        >`;
      case "number":
        return html`<span class="number">${value.value}</span>`;
      case "string":
        return html`<span class="string"
          >'${value.value}${value.truncated ? "…" : ""}'</span
        >`;
      case "text":
        return html`<span class="text"
          >${value.value}${value.truncated ? "…" : ""}</span
        >`;
    }

    return nothing;
  }

  private _renderChild(child: DebugConsoleChild) {
    return html`<div class="child">
      <tools-debug-console-value
        .objects=${this.objects}
        .key=${child.key}
        .value=${"value" in child ? child.value : undefined}
        .getter=${"getter" in child}
        .parentId=${
          this._value?.type === "object" ? this._value.object_id : undefined
        }
      ></tools-debug-console-value>
    </div>`;
  }

  private async _toggle() {
    const value = this._value;
    if (value?.type !== "object") {
      return;
    }

    this._expanded = !this._expanded;
    if (!this._expanded || this._children || this._inspecting) {
      return;
    }

    const request = this._request;
    this._inspecting = true;
    try {
      const children = await this.objects.inspect(value.object_id);
      if (request === this._request) {
        this._children = children;
      }
    } catch (err: unknown) {
      if (request === this._request) {
        this._error = (err as { message?: string }).message ?? String(err);
      }
    } finally {
      if (request === this._request) {
        this._inspecting = false;
      }
    }
  }

  private async _evaluate() {
    if (this.parentId === undefined || !this.key || this._evaluating) {
      return;
    }

    const request = this._request;
    this._evaluating = true;
    let result: DebugConsoleGetAttributeResult;
    try {
      result = await this.objects.getAttribute(this.parentId, this.key);
    } catch (err: unknown) {
      result = { error: (err as { message?: string }).message ?? String(err) };
    } finally {
      this._evaluating = false;
    }

    if (request !== this._request) {
      return;
    }

    if ("error" in result) {
      this._error = result.error;
    } else {
      this._evaluated = result.value;
    }
  }

  static readonly styles = css`
    :host {
      display: block;
      font-family: var(--ha-font-family-code);
      word-break: break-word;
    }

    /* Only on text, as the template whitespace between elements must collapse. */
    .string,
    .text,
    .error {
      white-space: pre-wrap;
    }

    button {
      all: unset;
      cursor: pointer;
    }

    button:focus-visible {
      outline: 1px solid var(--primary-color);
    }

    .toggle {
      display: inline;
    }

    .chevron {
      --mdc-icon-size: 14px;
      vertical-align: middle;
      margin-inline-start: -16px;
      transition: transform 0.1s;
      color: var(--secondary-text-color);
    }

    .chevron.expanded {
      transform: rotate(90deg);
    }

    :host-context([dir="rtl"]) .chevron:not(.expanded) {
      transform: rotate(180deg);
    }

    .children {
      padding-inline-start: var(--ha-space-4);
    }

    .child {
      padding-inline-start: 16px;
    }

    .key {
      color: var(--accent-color);
    }

    .colon,
    .length,
    .preview,
    .truncated,
    .getter {
      color: var(--secondary-text-color);
    }

    .class {
      font-style: italic;
    }

    .preview {
      margin-inline-start: 0.5em;
    }

    /* The colors of the code editor, so values look like code there. */
    .keyword {
      color: var(--codemirror-keyword, #6262ff);
    }

    .number {
      color: var(--codemirror-number, #ca7841);
    }

    .string {
      color: var(--codemirror-string, #07a);
    }

    .error {
      color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "tools-debug-console-value": ToolsDebugConsoleValue;
  }
}
