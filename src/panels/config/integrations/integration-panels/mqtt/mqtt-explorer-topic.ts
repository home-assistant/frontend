import { mdiClose, mdiContentCopy } from "@mdi/js";
import type { HassConfig } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../../common/decorators/consume";
import { storage } from "../../../../../common/decorators/storage";
import { transform } from "../../../../../common/decorators/transform";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { formatTimeWithSeconds } from "../../../../../common/datetime/format_time";
import { formatNumber } from "../../../../../common/number/format_number";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-switch";
import "../../../../../components/item/ha-list-item-option";
import "../../../../../components/list/ha-list-selectable";
import {
  configContext,
  internationalizationContext,
} from "../../../../../data/context";
import type { MQTTExplorerTopic } from "../../../../../data/mqtt";
import type {
  HomeAssistantConfig,
  HomeAssistantInternationalization,
} from "../../../../../types";
import { bytesToString } from "../../../../../util/bytes-to-string";
import { showToast } from "../../../../../util/toast";
import type { ExplorerMessage } from "./mqtt-explorer-data";
import { diffJsonPayloads, prettyPrintJson } from "./mqtt-explorer-data";

const CHANGE_SIGNS = { added: "+", removed: "−", changed: "~" } as const;

@customElement("mqtt-explorer-topic")
class MqttExplorerTopic extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @property({ attribute: false }) public topic!: MQTTExplorerTopic;

  // Newest first
  @property({ attribute: false }) public messages: ExplorerMessage[] = [];

  @state() private _selectedId?: number;

  @state()
  @storage({
    key: "panel-dev-mqtt-explorer-pretty",
    state: true,
    subscribe: false,
  })
  private _pretty = false;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (
      changedProps.has("topic") &&
      changedProps.get("topic")?.topic !== this.topic.topic
    ) {
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
    const pretty = selected ? prettyPrintJson(selected.payload) : undefined;
    const shownPayload =
      this._pretty && pretty !== undefined ? pretty : selected?.payload;

    return html`
      <div class="header">
        <code class="topic">${this.topic.topic}</code>
        <ha-icon-button
          .path=${mdiClose}
          .label=${this._i18n.localize("ui.common.close")}
          @click=${this._close}
        ></ha-icon-button>
      </div>
      <div class="stats">
        ${this._i18n.localize("ui.panel.config.mqtt.explorer.topic_stats", {
          messages: formatNumber(this.topic.messages, this._i18n.locale),
          rate: formatNumber(this.topic.message_rate, this._i18n.locale, {
            maximumFractionDigits: 1,
          }),
          bytes: bytesToString(this.topic.bytes, 1),
        })}
        ·
        ${this._i18n.localize("ui.panel.config.mqtt.explorer.subscriptions", {
          count: this.topic.subscriptions,
        })}
      </div>

      <h3>${this._i18n.localize("ui.panel.config.mqtt.explorer.messages")}</h3>
      <ha-list-selectable
        class="messages"
        controlled
        aria-label=${this._i18n.localize(
          "ui.panel.config.mqtt.explorer.messages"
        )}
        @ha-list-item-selected=${this._selectMessage}
      >
        ${this.messages.map(
          (msg, i) => html`
            <ha-list-item-option .selected=${i === index}>
              <span slot="headline"
                >${this._formatTimestamp(msg.timestamp)}</span
              >
              <span slot="end" class="message-meta">
                ${bytesToString(msg.size, 1)} · QoS
                ${msg.qos}${
                  msg.retain
                    ? html` ·
                      ${this._i18n.localize(
                        "ui.panel.config.mqtt.explorer.retained"
                      )}`
                    : nothing
                }
              </span>
            </ha-list-item-option>
          `
        )}
      </ha-list-selectable>

      ${
        selected
          ? html`
              <div class="section-header">
                <h3>
                  ${this._i18n.localize("ui.panel.config.mqtt.explorer.payload")}
                </h3>
                ${
                  pretty !== undefined
                    ? html`<ha-switch
                        class="pretty"
                        .checked=${this._pretty}
                        @change=${this._handlePretty}
                        >${this._i18n.localize(
                          "ui.panel.config.mqtt.explorer.pretty_print"
                        )}</ha-switch
                      >`
                    : nothing
                }
                <ha-icon-button
                  .path=${mdiContentCopy}
                  .label=${this._i18n.localize(
                    "ui.panel.config.mqtt.explorer.copy_payload"
                  )}
                  @click=${this._copyPayload}
                ></ha-icon-button>
              </div>
              <pre dir="ltr">${shownPayload}</pre>
              ${
                selected.truncated
                  ? html`<p class="secondary">
                      ${this._i18n.localize(
                        "ui.panel.config.mqtt.explorer.truncated"
                      )}
                    </p>`
                  : nothing
              }
              <h3>
                ${this._i18n.localize("ui.panel.config.mqtt.explorer.changes")}
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
        ${this._i18n.localize("ui.panel.config.mqtt.explorer.no_previous")}
      </p>`;
    }
    // Only the start of a truncated payload is known.
    if (previous.truncated || selected.truncated) {
      return html`<p class="secondary">
        ${this._i18n.localize("ui.panel.config.mqtt.explorer.not_comparable")}
      </p>`;
    }
    if (previous.payload === selected.payload) {
      return html`<p class="secondary">
        ${this._i18n.localize("ui.panel.config.mqtt.explorer.unchanged")}
      </p>`;
    }
    const changes = diffJsonPayloads(previous.payload, selected.payload);
    if (!changes) {
      return html`
        <div class="changes" dir="ltr">
          ${this._renderChange("removed", "previous", previous.payload)}
          ${this._renderChange("added", "current", selected.payload)}
        </div>
      `;
    }
    return html`
      <div class="changes" dir="ltr">
        ${changes.map((change) =>
          this._renderChange(
            change.type,
            change.type,
            html`<code>${change.key}</code>:
              ${
                change.type === "changed"
                  ? `${change.oldValue} → ${change.newValue}`
                  : (change.newValue ?? change.oldValue)
              }`
          )
        )}
      </div>
    `;
  }

  private _renderChange(
    type: keyof typeof CHANGE_SIGNS,
    label: "added" | "removed" | "changed" | "previous" | "current",
    content: unknown
  ): TemplateResult {
    return html`
      <div class=${type}>
        <span class="sign" aria-hidden="true">${CHANGE_SIGNS[type]}</span>
        <span class="visually-hidden"
          >${this._i18n.localize(
            `ui.panel.config.mqtt.explorer.change_${label}`
          )}:</span
        >
        ${content}
      </div>
    `;
  }

  private _formatTimestamp(timestamp: number): string {
    return formatTimeWithSeconds(
      new Date(timestamp * 1000),
      this._i18n.locale,
      this._hassConfig
    );
  }

  private _selectMessage(ev: CustomEvent<number>): void {
    this._selectedId = this.messages[ev.detail]?.id;
  }

  private _handlePretty(ev: Event): void {
    this._pretty = (ev.target as HTMLInputElement).checked;
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
      message: this._i18n.localize("ui.common.copied_clipboard"),
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
      flex: 1;
      margin: var(--ha-space-2) 0 0;
    }
    .pretty {
      margin-top: var(--ha-space-2);
      font-size: var(--ha-font-size-s);
    }
    .messages {
      display: block;
      max-height: 180px;
      overflow-y: auto;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-md);
      --ha-row-item-min-height: 32px;
      --ha-row-item-padding-block: var(--ha-space-1);
    }
    .message-meta {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
      white-space: nowrap;
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
    .changes {
      position: relative;
    }
    .sign {
      display: inline-block;
      width: 1ch;
      font-weight: var(--ha-font-weight-bold);
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
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
