import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { LocalStorage } from "../../../../../common/decorators/local-storage";
import "../../../../../components/ha-card";
import "../../../../../components/ha-code-editor";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-switch";
import { getConfigEntries } from "../../../../../data/config_entries";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "./mqtt-subscribe-card";

const qosLevel = ["0", "1", "2"];

@customElement("mqtt-config-panel")
class HaPanelDevMqtt extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @LocalStorage("panel-dev-mqtt-topic-ls", true, false)
  private topic = "";

  @LocalStorage("panel-dev-mqtt-payload-ls", true, false)
  private payload = "";

  @LocalStorage("panel-dev-mqtt-qos-ls", true, false)
  private qos = "0";

  @LocalStorage("panel-dev-mqtt-retain-ls", true, false)
  private retain = false;

  protected render(): TemplateResult {
    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass}>
        <div class="content">
          <ha-card header="MQTT settings">
            <div class="card-actions">
              <mwc-button @click=${this._openOptionFlow}
                >Re-configure MQTT</mwc-button
              >
            </div>
          </ha-card>
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.config.mqtt.description_publish"
            )}
          >
            <div class="card-content">
              <div class="panel-dev-mqtt-fields">
                <ha-textfield
                  .label=${this.hass.localize("ui.panel.config.mqtt.topic")}
                  .value=${this.topic}
                  @change=${this._handleTopic}
                ></ha-textfield>
                <ha-select
                  .label=${this.hass.localize("ui.panel.config.mqtt.qos")}
                  .value=${this.qos}
                  @selected=${this._handleQos}
                  >${qosLevel.map(
                    (qos) =>
                      html`<mwc-list-item .value=${qos}>${qos}</mwc-list-item>`
                  )}
                </ha-select>
                <ha-formfield
                  label=${this.hass!.localize("ui.panel.config.mqtt.retain")}
                >
                  <ha-switch
                    @change=${this._handleRetain}
                    .checked=${this.retain}
                  ></ha-switch>
                </ha-formfield>
              </div>
              <p>${this.hass.localize("ui.panel.config.mqtt.payload")}</p>
              <ha-code-editor
                mode="jinja2"
                autocomplete-entities
                autocomplete-icons
                .hass=${this.hass}
                .value=${this.payload}
                @value-changed=${this._handlePayload}
                dir="ltr"
              ></ha-code-editor>
            </div>
            <div class="card-actions">
              <mwc-button @click=${this._publish}
                >${this.hass.localize(
                  "ui.panel.config.mqtt.publish"
                )}</mwc-button
              >
            </div>
          </ha-card>

          <mqtt-subscribe-card .hass=${this.hass}></mqtt-subscribe-card>
        </div>
      </hass-subpage>
    `;
  }

  private _handleTopic(ev: CustomEvent) {
    this.topic = (ev.target! as any).value;
  }

  private _handlePayload(ev: CustomEvent) {
    this.payload = ev.detail.value;
  }

  private _handleQos(ev: CustomEvent) {
    const newValue = (ev.target! as any).value;
    if (newValue >= 0 && newValue !== this.qos) {
      this.qos = newValue;
    }
  }

  private _handleRetain(ev: CustomEvent) {
    this.retain = (ev.target! as any).checked;
  }

  private _publish(): void {
    if (!this.hass) {
      return;
    }
    this.hass.callService("mqtt", "publish", {
      topic: this.topic,
      payload_template: this.payload,
      qos: parseInt(this.qos),
      retain: this.retain,
    });
  }

  private async _openOptionFlow() {
    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("config_entry")) {
      return;
    }
    const configEntryId = searchParams.get("config_entry") as string;
    const configEntries = await getConfigEntries(this.hass, {
      domain: "mqtt",
    });
    const configEntry = configEntries.find(
      (entry) => entry.entry_id === configEntryId
    );
    showOptionsFlowDialog(this, configEntry!);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          padding: 24px 0 32px;
          max-width: 600px;
          margin: 0 auto;
          direction: ltr;
        }
        .panel-dev-mqtt-fields {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        ha-select {
          width: 96px;
          margin: 0 8px;
        }
        ha-textfield {
          flex: 1;
        }
        @media screen and (max-width: 600px) {
          ha-select {
            margin-left: 0px;
            margin-top: 8px;
          }
          ha-textfield {
            flex: auto;
            width: 100%;
          }
        }
        ha-card:first-child {
          margin-bottom: 16px;
        }
        mqtt-subscribe-card {
          display: block;
          margin: 16px auto;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-mqtt": HaPanelDevMqtt;
  }
}
