import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatTime } from "../../../../../common/datetime/format_time";
import "../../../../../components/ha-card";
import { MQTTMessage, subscribeMQTTTopic } from "../../../../../data/mqtt";
import { HomeAssistant } from "../../../../../types";

@customElement("mqtt-subscribe-card")
class MqttSubscribeCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _topic = "";

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
          <paper-input
            .label=${this._subscribed
              ? this.hass.localize("ui.panel.config.mqtt.listening_to")
              : this.hass.localize("ui.panel.config.mqtt.subscribe_to")}
            .disabled=${this._subscribed !== undefined}
            .value=${this._topic}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <mwc-button
            .disabled=${this._topic === ""}
            @click=${this._handleSubmit}
            type="submit"
          >
            ${this._subscribed
              ? this.hass.localize("ui.panel.config.mqtt.stop_listening")
              : this.hass.localize("ui.panel.config.mqtt.start_listening")}
          </mwc-button>
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

  private _valueChanged(ev: CustomEvent): void {
    this._topic = ev.detail.value;
  }

  private async _handleSubmit(): Promise<void> {
    if (this._subscribed) {
      this._subscribed();
      this._subscribed = undefined;
    } else {
      this._subscribed = await subscribeMQTTTopic(
        this.hass!,
        this._topic,
        (message) => this._handleMessage(message)
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
      paper-input {
        display: inline-block;
        width: 200px;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-subscribe-card": MqttSubscribeCard;
  }
}
