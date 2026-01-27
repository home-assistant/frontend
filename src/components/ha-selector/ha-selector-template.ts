import type { PropertyValues } from "lit";
import { css, html, nothing, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import "../ha-code-editor";
import "../ha-input-helper-text";
import "../ha-alert";
import type { RenderTemplateResult } from "../../data/ws-templates";
import { subscribeRenderTemplate } from "../../data/ws-templates";
import { debounce } from "../../common/util/debounce";
import type { TemplateSelector } from "../../data/selector";

const WARNING_STRINGS = ["template:", "sensor:", "state:", "trigger: template"];

@customElement("ha-selector-template")
export class HaTemplateSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: TemplateSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: any;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private warn: string | undefined = undefined;

  @state() private _test = false;

  @state() private _error?: string;

  @state() private _errorLevel?: "ERROR" | "WARNING";

  @state() private _templateResult?: RenderTemplateResult;

  @state() private _unsubRenderTemplate?: Promise<UnsubscribeFunc>;

  private _debounceError = debounce(
    (error, level) => {
      this._error = error;
      this._errorLevel = level;
      this._templateResult = undefined;
    },
    500,
    false
  );

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._debounceError.cancel();
    this._unsubscribeTemplate();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this._test) {
      this._subscribeTemplate();
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("value") && this._test) {
      this._subscribeTemplate();
    }
  }

  protected render() {
    return html`
      ${this.warn
        ? html`<ha-alert alert-type="warning"
            >${this.hass.localize(
              "ui.components.selectors.template.yaml_warning",
              { string: this.warn }
            )}
            <br />
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(
                this.hass,
                "/docs/configuration/templating/"
              )}
              >${this.hass.localize(
                "ui.components.selectors.template.learn_more"
              )}</a
            ></ha-alert
          >`
        : nothing}
      ${this.label
        ? html`<p>${this.label}${this.required ? "*" : ""}</p>`
        : nothing}
      <ha-code-editor
        mode="jinja2"
        .hass=${this.hass}
        .value=${this.value}
        .readOnly=${this.disabled}
        .placeholder=${this.placeholder || "{{ ... }}"}
        autofocus
        autocomplete-entities
        autocomplete-icons
        .hasTest=${this.selector.template?.preview !== false}
        .testing=${this._test}
        @value-changed=${this._handleChange}
        @test-toggle=${this._testToggle}
        dir="ltr"
        linewrap
      ></ha-code-editor>
      ${this._test && this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : this._test && this._templateResult
          ? html`<pre class="rendered">
${typeof this._templateResult.result === "object"
                ? JSON.stringify(this._templateResult.result, null, 2)
                : this._templateResult.result}</pre
            >`
          : nothing}
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : nothing}
    `;
  }

  private _testToggle() {
    this._test = !this._test;
    if (this._test) {
      this._subscribeTemplate();
    } else {
      this._unsubscribeTemplate();
    }
  }

  private async _subscribeTemplate() {
    await this._unsubscribeTemplate();

    const template = this.value || "";

    try {
      this._unsubRenderTemplate = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          if ("error" in result) {
            // We show the latest error, or a warning if there are no errors
            if (result.level === "ERROR" || this._errorLevel !== "ERROR") {
              this._debounceError(result.error, result.level);
            }
          } else {
            this._debounceError.cancel();
            this._error = undefined;
            this._errorLevel = undefined;
            this._templateResult = result;
          }
        },
        {
          template,
          timeout: 3,
          report_errors: true,
        }
      );
      await this._unsubRenderTemplate;
    } catch (err: any) {
      this._error = err.message || "Unknown error";
      this._errorLevel = undefined;
      this._templateResult = undefined;
      this._unsubRenderTemplate = undefined;
    }
  }

  private async _unsubscribeTemplate(): Promise<void> {
    if (!this._unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await this._unsubRenderTemplate;
      unsub();
      this._unsubRenderTemplate = undefined;
    } catch (err: any) {
      if (err.code === "not_found") {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  private _handleChange(ev) {
    ev.stopPropagation();
    let value = ev.target.value;
    if (this.value === value) {
      return;
    }
    this.warn = WARNING_STRINGS.find((str) => value.includes(str));
    if (value === "" && !this.required) {
      value = undefined;
    }
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    p {
      margin-top: 0;
    }
    .rendered {
      font-family: var(--ha-font-family-code);
      -webkit-font-smoothing: var(--ha-font-smoothing);
      -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
      clear: both;
      white-space: pre-wrap;
      background-color: var(--secondary-background-color);
      padding: var(--ha-space-2);
      margin-top: var(--ha-space-3);
      margin-bottom: 0;
      direction: ltr;
      border-radius: var(--ha-border-radius-sm);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-template": HaTemplateSelector;
  }
}
