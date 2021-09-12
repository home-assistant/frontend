import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import checkValidDate from "../../../common/datetime/check_valid_date";
import { computeDomain } from "../../../common/entity/compute_domain";
import { formatNumber } from "../../../common/string/format_number";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { formatAttributeValue } from "../../../util/hass-attributes-util";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
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

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const pointer =
      this._config.entity &&
      !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(this._config.entity));

    const attribute = stateObj.attributes[this._config.attribute];
    let date: Date | undefined;
    if (this._config.format) {
      date = new Date(attribute);
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        <div
          class="text-content ${classMap({
            pointer,
          })}"
          @action=${this._handleAction}
          .actionHandler=${actionHandler()}
        >
          ${this._config.prefix}
          ${this._config.format && checkValidDate(date)
            ? html` <hui-timestamp-display
                .hass=${this.hass}
                .ts=${date}
                .format=${this._config.format}
              ></hui-timestamp-display>`
            : typeof attribute === "number"
            ? formatNumber(attribute, this.hass.locale)
            : attribute !== undefined
            ? formatAttributeValue(this.hass, attribute)
            : "-"}
          ${this._config.suffix}
        </div>
      </hui-generic-entity-row>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResultGroup {
    return css`
      div {
        text-align: right;
      }
      .pointer {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-attribute-row": HuiAttributeRow;
  }
}
