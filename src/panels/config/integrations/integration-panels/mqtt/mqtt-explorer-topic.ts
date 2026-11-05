import { mdiClose, mdiContentCopy } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { formatTimeWithSeconds } from "../../../../../common/datetime/format_time";
import { formatNumber } from "../../../../../common/number/format_number";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import "../../../../../components/ha-icon-button";
import type { MQTTExplorerTopic } from "../../../../../data/mqtt";
import type { HomeAssistant } from "../../../../../types";
import { bytesToString } from "../../../../../util/bytes-to-string";
import { showToast } from "../../../../../util/toast";
import type { ExplorerMessage } from "./mqtt-explorer-data";
import { diffJsonPayloads, formatPayload } from "./mqtt-explorer-data";

@customElement("mqtt-explorer-topic")
class MqttExplorerTopic extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public topic!: MQTTExplorerTopic;

  // Newest first
  @property({ attribute: false }) public messages: ExplorerMessage[] = [];

  @state() private _selectedId?: number;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (changedProps.get("topic")?.topic !== this.topic.topic) {
      this._selectedId = undefined;
    }
  }

  protected render(): TemplateResult {
    const index = Math.max(
      0,
      this.messages.findIndex((msg) => msg.id === this._selectedId)
    );
    const selected = this.messages[index];
    const previous = this.messages[index + 1];

    return html`
      <div class="header">
        <code class="topic">${this.topic.topic}</code>
        <ha-icon-button
          .path=${mdiClose}
          .label=${this.hass.localize("ui.common.close")}
          @click=${this._close}
        ></ha-icon-button>
      </div>
      <div class="stats">
        ${this.hass.localize("ui.panel.config.mqtt.explorer.topic_stats", {
          messages: formatNumber(this.topic.messages, this.hass.locale),
          rate: formatNumber(this.topic.message_rate, this.hass.locale, {
            maximumFractionDigits: 1,
          }),
          bytes: bytesToString(this.topic.bytes, 1),
        })}
        ·
        ${this.hass.localize("ui.panel.config.mqtt.explorer.subscriptions", {
          count: this.topic.subscriptions,
        })}
      </div>

      <h3>${this.hass.localize("ui.panel.config.mqtt.explorer.messages")}</h3>
      <div
        class="messages"
        role="listbox"
        aria-label=${this.hass.localize(
          "ui.panel.config.mqtt.explorer.messages"
        )}
      >
        ${this.messages.map(
          (msg, i) => html`
            <button
              role="option"
              aria-selected=${i === index}
              class=${classMap({ message: true, selected: i === index })}
              data-id=${msg.id}
              @click=${this._selectMessage}
            >
              <span>${this._formatTimestamp(msg.timestamp)}</span>
              <span>${bytesToString(msg.size, 1)}</span>
              <span>
                QoS
                ${msg.qos}${
                  msg.retain
                    ? html` ·
                      ${this.hass.localize(
                        "ui.panel.config.mqtt.explorer.retained"
                      )}`
                    : nothing
                }
              </span>
            </button>
          `
        )}
      </div>

      ${
        selected
          ? html`
              <div class="section-header">
                <h3>
                  ${this.hass.localize("ui.panel.config.mqtt.explorer.payload")}
                </h3>
                <ha-icon-button
                  .path=${mdiContentCopy}
                  .label=${this.hass.localize(
                    "ui.panel.config.mqtt.explorer.copy_payload"
                  )}
                  @click=${this._copyPayload}
                ></ha-icon-button>
              </div>
              <pre dir="ltr">${formatPayload(selected.payload)}</pre>
              ${
                selected.truncated
                  ? html`<p class="secondary">
                      ${this.hass.localize(
                        "ui.panel.config.mqtt.explorer.truncated"
                      )}
                    </p>`
                  : nothing
              }
              <h3>
                ${this.hass.localize("ui.panel.config.mqtt.explorer.changes")}
              </h3>
              ${this._renderChanges(selected, previous)}
            `
          : nothing
      }
    `;
  }

  private _renderChanges(
    selected: ExplorerMessage,
    previous?: ExplorerMessage
  ): TemplateResult {
    if (!previous) {
      return html`<p class="secondary">
        ${this.hass.localize("ui.panel.config.mqtt.explorer.no_previous")}
      </p>`;
    }
    if (previous.payload === selected.payload) {
      return html`<p class="secondary">
        ${this.hass.localize("ui.panel.config.mqtt.explorer.unchanged")}
      </p>`;
    }
    const changes = diffJsonPayloads(previous.payload, selected.payload);
    if (!changes) {
      return html`
        <div class="changes" dir="ltr">
          <div class="removed">${previous.payload}</div>
          <div class="added">${selected.payload}</div>
        </div>
      `;
    }
    return html`
      <div class="changes" dir="ltr">
        ${changes.map(
          (change) => html`
            <div class=${change.type}>
              <code>${change.key}</code>:
              ${
                change.type === "changed"
                  ? `${change.oldValue} → ${change.newValue}`
                  : (change.newValue ?? change.oldValue)
              }
            </div>
          `
        )}
      </div>
    `;
  }

  private _formatTimestamp(timestamp: number): string {
    return formatTimeWithSeconds(
      new Date(timestamp * 1000),
      this.hass.locale,
      this.hass.config
    );
  }

  private _selectMessage(ev: Event): void {
    this._selectedId = Number((ev.currentTarget as HTMLElement).dataset.id);
  }

  private async _copyPayload(): Promise<void> {
    const selected =
      this.messages.find((msg) => msg.id === this._selectedId) ??
      this.messages[0];
    if (!selected) {
      return;
    }
    await copyToClipboard(selected.payload);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _close(): void {
    fireEvent(this, "mqtt-explorer-topic-closed");
  }

  static readonly styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    .header,
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ha-space-2);
    }
    .topic {
      font-size: var(--ha-font-size-l);
      word-break: break-all;
    }
    .stats,
    .secondary {
      color: var(--secondary-text-color);
    }
    h3 {
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      margin: var(--ha-space-4) 0 var(--ha-space-2);
    }
    .section-header h3 {
      margin: var(--ha-space-2) 0 0;
    }
    .messages {
      display: flex;
      flex-direction: column;
      max-height: 180px;
      overflow-y: auto;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-md);
    }
    .message {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: var(--ha-space-4);
      padding: var(--ha-space-1) var(--ha-space-2);
      border: none;
      background: none;
      color: var(--primary-text-color);
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .message:hover {
      background-color: var(--secondary-background-color);
    }
    .message.selected {
      background-color: rgba(var(--rgb-primary-color), 0.12);
    }
    pre,
    .changes {
      margin: 0;
      padding: var(--ha-space-2);
      max-height: 320px;
      overflow: auto;
      background-color: var(
        --code-editor-background-color,
        var(--secondary-background-color)
      );
      border-radius: var(--ha-border-radius-md);
      font-family: var(--ha-font-family-code);
      font-size: var(--ha-font-size-s);
      word-break: break-all;
    }
    pre {
      white-space: pre-wrap;
    }
    .added {
      color: var(--success-color);
    }
    .removed {
      color: var(--error-color);
    }
    .changed {
      color: var(--warning-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-explorer-topic": MqttExplorerTopic;
  }
  interface HASSDomEvents {
    "mqtt-explorer-topic-closed": undefined;
  }
}
