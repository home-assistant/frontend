import {
  LitElement,
  customElement,
  TemplateResult,
  html,
  property,
  CSSResultArray,
  css,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-input/paper-input";

import { HomeAssistant } from "../../../types";

import { haStyle } from "../../../resources/styles";
import "../../../components/ha-card";
import "../../../components/ha-code-editor";
import "./mqtt-subscribe-card";

@customElement("developer-tools-mqtt")
class HaPanelDevMqtt extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private topic = "";

  @property() private payload = "";

  private inited: boolean = false;

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
      <div class="content">
        <ha-card
          header="${this.hass.localize(
            "ui.panel.developer-tools.tabs.mqtt.description_publish"
          )}"
        >
          <div class="card-content">
            <paper-input
              label="${this.hass.localize(
                "ui.panel.developer-tools.tabs.mqtt.topic"
              )}"
              .value=${this.topic}
              @value-changed=${this._handleTopic}
            ></paper-input>

            <p>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.mqtt.payload"
              )}
            </p>
            <ha-code-editor
              mode="jinja2"
              .value="${this.payload}"
              @value-changed=${this._handlePayload}
            ></ha-code-editor>
          </div>
          <div class="card-actions">
            <mwc-button @click=${this._publish}
              >${this.hass.localize(
                "ui.panel.developer-tools.tabs.mqtt.publish"
              )}</mwc-button
            >
          </div>
        </ha-card>

        <mqtt-subscribe-card .hass=${this.hass}></mqtt-subscribe-card>
      </div>
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

  static get styles(): CSSResultArray {
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
