import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-code-editor";
import { getConfigEntries } from "../../../../../data/config_entries";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "./mqtt-subscribe-card";

@customElement("mqtt-config-panel")
class HaPanelDevMqtt extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private topic = "";

  @state() private payload = "";

  private inited = false;

  protected firstUpdated() {
    if (localStorage && localStorage["panel-dev-mqtt-topic"]) {
      this.topic = localStorage["panel-dev-mqtt-topic"];
    }
    if (localStorage && localStorage["panel-dev-mqtt-payload"]) {
      this.payload = localStorage["panel-dev-mqtt-payload"];
    }
    this.inited = true;
  }

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
            header=${this.hass.localize(
              "ui.panel.config.mqtt.description_publish"
            )}
          >
            <div class="card-content">
              <paper-input
                label=${this.hass.localize("ui.panel.config.mqtt.topic")}
                .value=${this.topic}
                @value-changed=${this._handleTopic}
              ></paper-input>

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
    this.topic = ev.detail.value;
    if (localStorage && this.inited) {
      localStorage["panel-dev-mqtt-topic"] = this.topic;
    }
  }

  private _handlePayload(ev: CustomEvent) {
    this.payload = ev.detail.value;
    if (localStorage && this.inited) {
      localStorage["panel-dev-mqtt-payload"] = this.payload;
    }
  }

  private _publish(): void {
    if (!this.hass) {
      return;
    }
    this.hass.callService("mqtt", "publish", {
      topic: this.topic,
      payload_template: this.payload,
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
