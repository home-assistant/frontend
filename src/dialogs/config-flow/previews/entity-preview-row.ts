import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/entity/state-badge";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-select";
import { isUnavailableState } from "../../../data/entity";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import "../../../panels/lovelace/components/hui-timestamp-display";
import type { HomeAssistant } from "../../../types";

@customElement("entity-preview-row")
class EntityPreviewRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private stateObj?: HassEntity;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const stateObj = this.stateObj;
    return html`<state-badge
        .hass=${this.hass}
        .stateObj=${stateObj}
        stateColor
      ></state-badge>
      <div class="name" .title=${computeStateName(stateObj)}>
        ${computeStateName(stateObj)}
      </div>
      <div class="value">${this.renderEntityState(stateObj)}</div>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        align-items: center;
        flex-direction: row;
      }
      .name {
        margin-left: 16px;
        margin-right: 8px;
        margin-inline-start: 16px;
        margin-inline-end: 8px;
        flex: 1 1 30%;
      }
      .value {
        direction: ltr;
      }
      .numberflex {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-grow: 2;
      }
      .numberstate {
        min-width: 45px;
        text-align: end;
      }
      ha-textfield {
        text-align: end;
        direction: ltr !important;
      }
      ha-slider {
        width: 100%;
        max-width: 200px;
      }
    `;
  }

  private renderEntityState(stateObj: HassEntity): TemplateResult {
    const domain = stateObj.entity_id.split(".", 1)[0];
    if (domain === "sensor") {
      const showSensor =
        stateObj.attributes.device_class === SENSOR_DEVICE_CLASS_TIMESTAMP &&
        !isUnavailableState(stateObj.state);
      return html`
        ${showSensor
          ? html`
              <hui-timestamp-display
                .hass=${this.hass}
                .ts=${new Date(stateObj.state)}
                capitalize
              ></hui-timestamp-display>
            `
          : html` ${this.hass.formatEntityState(stateObj)} `}
      `;
    }
    if (domain === "switch") {
      const showToggle =
        stateObj.state === "on" ||
        stateObj.state === "off" ||
        isUnavailableState(stateObj.state);
      return html`
        ${showToggle
          ? html`
              <ha-entity-toggle
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></ha-entity-toggle>
            `
          : html` ${this.hass.formatEntityState(stateObj)} `}
      `;
    }
    if (domain === "number") {
      const showNumberSlider =
        stateObj.attributes.mode === "slider" ||
        (stateObj.attributes.mode === "auto" &&
          (Number(stateObj.attributes.max) - Number(stateObj.attributes.min)) /
            Number(stateObj.attributes.step) <=
            256);
      return html`
        ${showNumberSlider
          ? html`
              <div class="numberflex">
                <ha-slider
                  labeled
                  .disabled=${isUnavailableState(stateObj.state)}
                  .step=${Number(stateObj.attributes.step)}
                  .min=${Number(stateObj.attributes.min)}
                  .max=${Number(stateObj.attributes.max)}
                  .value=${Number(stateObj.state)}
                ></ha-slider>
                <span class="state">
                  ${this.hass.formatEntityState(stateObj)}
                </span>
              </div>
            `
          : html` <div class="numberflex numberstate">
              <ha-textfield
                autoValidate
                .disabled=${isUnavailableState(stateObj.state)}
                pattern="[0-9]+([\\.][0-9]+)?"
                .step=${Number(stateObj.attributes.step)}
                .min=${Number(stateObj.attributes.min)}
                .max=${Number(stateObj.attributes.max)}
                .value=${stateObj.state}
                .suffix=${stateObj.attributes.unit_of_measurement}
                type="number"
              ></ha-textfield>
            </div>`}
      `;
    }
    if (domain === "select") {
      return html`
        <ha-select
          .label=${computeStateName(stateObj)}
          .value=${stateObj.state}
          .disabled=${isUnavailableState(stateObj.state)}
          naturalMenuWidth
        >
          ${stateObj.attributes.options
            ? stateObj.attributes.options.map(
                (option) => html`
                  <mwc-list-item .value=${option}>
                    ${this.hass!.formatEntityState(stateObj, option)}
                  </mwc-list-item>
                `
              )
            : ""}
        </ha-select>
      `;
    }
    return html` ${this.hass.formatEntityState(stateObj)} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-preview-row": EntityPreviewRow;
  }
}
