import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-select";
import "../../../../../components/ha-textfield";
import { formatTime } from "../../../../../common/datetime/format_time";
import { MQTTMessage, subscribeMQTTTopic } from "../../../../../data/mqtt";
import { HomeAssistant } from "../../../../../types";
import "@material/mwc-list/mwc-list-item";
import { LocalStorage } from "../../../../../common/decorators/local-storage";

const qosLevel = ["0", "1", "2"];

@customElement("mqtt-subscribe-card")
class MqttSubscribeCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @LocalStorage("panel-dev-mqtt-topic-subscribe", true, false)
  private _topic = "";

  @LocalStorage("panel-dev-mqtt-qos-subscribe", true, false)
  private _qos = "0";

  @state() private _subscribed?: () => void;

  @state() private _messages: Array<{
    id: number;
    message: MQTTMessage;
    payload: string;
    time: Date;
  }> = [];

  private _messageCount = 0;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._subscribed) {
      this._subscribed();
      this._subscribed = undefined;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-card
        header=${this.hass.localize("ui.panel.config.mqtt.description_listen")}
      >
        <form>
          <div class="panel-dev-mqtt-subsribe-fields">
            <ha-textfield
              .label=${this._subscribed
                ? this.hass.localize("ui.panel.config.mqtt.listening_to")
                : this.hass.localize("ui.panel.config.mqtt.subscribe_to")}
              .disabled=${this._subscribed !== undefined}
              .value=${this._topic}
              @change=${this._handleTopic}
            ></ha-textfield>
            <ha-select
              .label=${this.hass.localize("ui.panel.config.mqtt.qos")}
              .disabled=${this._subscribed !== undefined}
              .value=${this._qos}
              @selected=${this._handleQos}
              >${qosLevel.map(
                (qos) =>
                  html`<mwc-list-item .value=${qos}>${qos}</mwc-list-item>`
              )}
            </ha-select>
            <mwc-button
              .disabled=${this._topic === ""}
              @click=${this._handleSubmit}
              type="submit"
            >
              ${this._subscribed
                ? this.hass.localize("ui.panel.config.mqtt.stop_listening")
                : this.hass.localize("ui.panel.config.mqtt.start_listening")}
            </mwc-button>
          </div>
        </form>
        <div class="events">
          ${this._messages.map(
            (msg) => html`
              <div class="event">
                ${this.hass.localize(
                  "ui.panel.config.mqtt.message_received",
                  "id",
                  msg.id,
                  "topic",
                  msg.message.topic,
                  "time",
                  formatTime(msg.time, this.hass!.locale)
                )}
                <pre>${msg.payload}</pre>
                <div class="bottom">
                  QoS: ${msg.message.qos} - Retain:
                  ${Boolean(msg.message.retain)}
                </div>
              </div>
            `
          )}
        </div>
      </ha-card>
    `;
  }

  private _handleTopic(ev): void {
    this._topic = ev.target.value;
  }

  private _handleQos(ev: CustomEvent): void {
    const newValue = (ev.target! as any).value;
    if (newValue >= 0 && newValue !== this._qos) {
      this._qos = newValue;
    }
  }

  private async _handleSubmit(): Promise<void> {
    if (this._subscribed) {
      this._subscribed();
      this._subscribed = undefined;
    } else {
      this._subscribed = await subscribeMQTTTopic(
        this.hass!,
        this._topic,
        (message) => this._handleMessage(message),
        parseInt(this._qos)
      );
    }
  }

  private _handleMessage(message: MQTTMessage) {
    const tail =
      this._messages.length > 30 ? this._messages.slice(0, 29) : this._messages;
    let payload: string;
    try {
      payload = JSON.stringify(JSON.parse(message.payload), null, 4);
    } catch (err: any) {
      payload = message.payload;
    }
    this._messages = [
      {
        payload,
        message,
        time: new Date(),
        id: this._messageCount++,
      },
      ...tail,
    ];
  }

  static get styles(): CSSResultGroup {
    return css`
      form {
        display: block;
        padding: 16px;
      }
      .events {
        margin: -16px 0;
        padding: 0 16px;
      }
      .event {
        border-bottom: 1px solid var(--divider-color);
        padding-bottom: 16px;
        margin: 16px 0;
      }
      .event:last-child {
        border-bottom: 0;
      }
      .bottom {
        font-size: 80%;
        color: var(--secondary-text-color);
      }
      pre {
        font-family: var(--code-font-family, monospace);
      }
      @media screen and (min-width: 275px) {
        .panel-dev-mqtt-subsribe-fields {
          display: float;
          justify-content: space-between;
        }
        ha-select {
          width: 96px;
          margin-left: 0px;
          margin-right: 8px;
        }
        ha-textfield {
          flex: 0;
          width: 100%;
        }
      }
      @media screen and (min-width: 600px) {
        .panel-dev-mqtt-subsribe-fields {
          display: flex;
          justify-content: space-between;
        }
        ha-select {
          max-width: 96px;
          margin-left: 8px;
          margin-right: 8px;
        }
        ha-textfield {
          flex: 1;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-subscribe-card": MqttSubscribeCard;
  }
}
