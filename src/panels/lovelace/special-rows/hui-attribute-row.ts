import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import checkValidDate from "../../../common/datetime/check_valid_date";
import "../../../components/ha-attribute-value";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import "../components/hui-timestamp-display";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { AttributeRowConfig, LovelaceRow } from "../entity-rows/types";

@customElement("hui-attribute-row")
class HuiAttributeRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AttributeRowConfig;

  public setConfig(config: AttributeRowConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    if (!config.entity) {
      throw new Error("Entity not specified");
    }
    if (!config.attribute) {
      throw new Error("Attribute not specified");
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const attribute = stateObj.attributes[this._config.attribute];
    let date: Date | undefined;
    if (this._config.format) {
      date = new Date(attribute);
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        ${this._config.prefix}
        ${this._config.format && checkValidDate(date)
          ? html` <hui-timestamp-display
              .hass=${this.hass}
              .ts=${date}
              .format=${this._config.format}
              capitalize
            ></hui-timestamp-display>`
          : attribute !== undefined
          ? html`
              <ha-attribute-value
                .hideUnit=${this._config.suffix}
                .hass=${this.hass}
                .stateObj=${stateObj}
                .attribute=${this._config.attribute}
              >
              </ha-attribute-value>
            `
          : "—"}
        ${this._config.suffix}
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      div {
        text-align: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-attribute-row": HuiAttributeRow;
  }
}
