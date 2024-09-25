import { css, html, nothing, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import "../ha-code-editor";
import "../ha-input-helper-text";
import "../ha-alert";

const WARNING_STRINGS = ["template:", "sensor:", "state:", "trigger: template"];

@customElement("ha-selector-template")
export class HaTemplateSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private warn: string | undefined = undefined;

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
        autofocus
        autocomplete-entities
        autocomplete-icons
        @value-changed=${this._handleChange}
        dir="ltr"
        linewrap
      ></ha-code-editor>
      ${this.helper
        ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
        : nothing}
    `;
  }

  private _handleChange(ev) {
    const value = ev.target.value;
    if (this.value === value) {
      return;
    }
    this.warn = WARNING_STRINGS.find((str) => value.includes(str));
    fireEvent(this, "value-changed", { value });
  }

  static get styles() {
    return css`
      p {
        margin-top: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-template": HaTemplateSelector;
  }
}
