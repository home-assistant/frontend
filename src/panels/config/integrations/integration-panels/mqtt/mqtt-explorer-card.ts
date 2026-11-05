import { mdiChevronDown, mdiChevronRight } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { storage } from "../../../../../common/decorators/storage";
import { formatDurationDigital } from "../../../../../common/datetime/format_duration";
import { relativeTime } from "../../../../../common/datetime/relative_time";
import { formatNumber } from "../../../../../common/number/format_number";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-switch";
import "../../../../../components/input/ha-input";
import type {
  MQTTExplorerEvent,
  MQTTExplorerTopic,
  MQTTExplorerTotals,
} from "../../../../../data/mqtt";
import { subscribeMQTTExplorer } from "../../../../../data/mqtt";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { showToast } from "../../../../../util/toast";
import { getWsErrorMessage } from "../../../../../util/ws-error";
import type { ExplorerMessage, TopicTreeNode } from "./mqtt-explorer-data";
import {
  buildTopicTree,
  MAX_MESSAGES_PER_TOPIC,
  MAX_RETAINED_SIZE,
  sortedChildren,
  trimMessages,
} from "./mqtt-explorer-data";
import "./mqtt-explorer-topic";

const MAX_BUSIEST_ROWS = 200;
// The backend sends an event every interval, also when nothing changed.
const STALL_CHECK_MS = 5000;
const STALLED_INTERVALS = 3;

@customElement("mqtt-explorer-card")
class MqttExplorerCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state()
  @storage({
    key: "panel-dev-mqtt-explorer-topic",
    state: true,
    subscribe: false,
  })
  private _filter = "#";

  @state()
  @storage({
    key: "panel-dev-mqtt-explorer-busiest",
    state: true,
    subscribe: false,
  })
  private _busiest = false;

  @state() private _unsubscribe?: () => void;

  @state() private _starting = false;

  @state() private _total?: MQTTExplorerTotals;

  // Server clock of the last event, used for all relative times
  @state() private _now = 0;

  @state() private _started = 0;

  // Bumped on every event, the topic and message maps are not reactive
  @state() private _version = 0;

  @state() private _expanded = new Set<string>();

  @state() private _selected?: string;

  // Messages removed from the local history to stay within the size budget
  @state() private _trimmed = 0;

  private _topics = new Map<string, MQTTExplorerTopic>();

  private _messages = new Map<string, ExplorerMessage[]>();

  private _messageId = 0;

  private _lastEvent = 0;

  private _interval = 2;

  private _stallCheck?: number;

  private _resubscribing = false;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._stop();
  }

  private _tree = memoizeOne((_version: number) =>
    buildTopicTree(this._topics.values())
  );

  private _busiestTopics = memoizeOne((_version: number) =>
    [...this._topics.values()]
      .sort(
        (a, b) =>
          b.message_rate - a.message_rate || b.last_received - a.last_received
      )
      .slice(0, MAX_BUSIEST_ROWS)
  );

  protected render(): TemplateResult {
    const selectedTopic = this._selected
      ? this._topics.get(this._selected)
      : undefined;

    return html`
      <ha-card
        .header=${this.hass.localize("ui.panel.config.mqtt.explorer.title")}
      >
        <div class="card-content">
          <p class="secondary">
            ${this.hass.localize("ui.panel.config.mqtt.explorer.description")}
          </p>
          <div class="controls">
            <ha-input
              .label=${this.hass.localize(
                "ui.panel.config.mqtt.explorer.filter"
              )}
              .value=${this._filter}
              .disabled=${this._unsubscribe !== undefined || this._starting}
              @change=${this._handleFilter}
            ></ha-input>
            <ha-button
              appearance="plain"
              .disabled=${!this._filter}
              .loading=${this._starting}
              @click=${this._toggle}
            >
              ${this.hass.localize(
                this._unsubscribe
                  ? "ui.panel.config.mqtt.explorer.stop"
                  : "ui.panel.config.mqtt.explorer.start"
              )}
            </ha-button>
            <ha-switch .checked=${this._busiest} @change=${this._handleBusiest}
              >${this.hass.localize(
                "ui.panel.config.mqtt.explorer.busiest_first"
              )}</ha-switch
            >
          </div>
          ${this._renderTotals()}
        </div>
        ${
          this._total
            ? html`
                <div
                  class=${classMap({
                    body: true,
                    "with-detail": selectedTopic !== undefined,
                  })}
                >
                  <div class="tree">
                    ${
                      this._topics.size
                        ? html`<div role="list">
                            ${
                              this._busiest
                                ? this._busiestTopics(this._version).map(
                                    (topic) =>
                                      html`<div role="listitem">
                                        ${this._renderRow(
                                          topic.topic,
                                          topic.topic,
                                          0,
                                          topic
                                        )}
                                      </div>`
                                  )
                                : this._renderChildren(
                                    this._tree(this._version),
                                    0
                                  )
                            }
                          </div>`
                        : html`<p class="secondary empty">
                            ${this.hass.localize(
                              "ui.panel.config.mqtt.explorer.no_topics"
                            )}
                          </p>`
                    }
                  </div>
                  ${
                    selectedTopic
                      ? html`
                          <mqtt-explorer-topic
                            .topic=${selectedTopic}
                            .messages=${
                              this._messages.get(selectedTopic.topic) ?? []
                            }
                            @mqtt-explorer-topic-closed=${this._closeDetail}
                          ></mqtt-explorer-topic>
                        `
                      : nothing
                  }
                </div>
              `
            : nothing
        }
      </ha-card>
    `;
  }

  private _renderTotals(): TemplateResult | typeof nothing {
    if (!this._total) {
      return this._unsubscribe
        ? html`<p class="totals">
            ${this.hass.localize("ui.panel.config.mqtt.explorer.waiting")}
          </p>`
        : nothing;
    }
    const elapsed = Math.max(0, Math.round(this._now - this._started));
    return html`
      <p class="totals">
        ${this.hass.localize("ui.panel.config.mqtt.explorer.totals", {
          messages: this._formatRate(this._total.message_rate),
          kilobytes: formatNumber(
            this._total.byte_rate / 1024,
            this.hass.locale,
            { maximumFractionDigits: 1 }
          ),
          topics: this._total.topics,
          elapsed: formatDurationDigital(this.hass.locale, {
            hours: Math.floor(elapsed / 3600),
            minutes: Math.floor((elapsed % 3600) / 60),
            seconds: elapsed % 60,
          }),
        })}
        ${
          this._total.dropped_messages
            ? html`<br />${this.hass.localize(
                  "ui.panel.config.mqtt.explorer.dropped",
                  { count: this._total.dropped_messages }
                )}`
            : nothing
        }
        ${
          this._total.dropped_payloads
            ? html`<br />${this.hass.localize(
                  "ui.panel.config.mqtt.explorer.dropped_payloads",
                  { count: this._total.dropped_payloads }
                )}`
            : nothing
        }
        ${
          this._trimmed
            ? html`<br />${this.hass.localize(
                  "ui.panel.config.mqtt.explorer.trimmed",
                  { count: this._trimmed }
                )}`
            : nothing
        }
      </p>
    `;
  }

  private _renderChildren(
    node: TopicTreeNode,
    depth: number
  ): TemplateResult[] {
    return sortedChildren(node).map((child) => {
      const expanded = this._expanded.has(child.path);
      return html`
        <div role="listitem">
          ${this._renderRow(child.name, child.path, depth, child.topic, child)}
          ${
            expanded
              ? html`<div role="list">
                  ${this._renderChildren(child, depth + 1)}
                </div>`
              : nothing
          }
        </div>
      `;
    });
  }

  private _renderRow(
    name: string,
    path: string,
    depth: number,
    topic?: MQTTExplorerTopic,
    node?: TopicTreeNode
  ): TemplateResult {
    const hasChildren = node !== undefined && node.children.size > 0;
    const expanded = this._expanded.has(path);
    const lastMessage = topic
      ? this._messages.get(topic.topic)?.[0]
      : undefined;
    const selected = topic !== undefined && path === this._selected;
    return html`
      <div
        class=${classMap({ row: true, selected })}
        style=${styleMap({ "padding-inline-start": `${depth * 16}px` })}
      >
        ${
          hasChildren
            ? html`<ha-icon-button
                .path=${expanded ? mdiChevronDown : mdiChevronRight}
                .label=${this.hass.localize(
                  expanded
                    ? "ui.panel.config.mqtt.explorer.collapse"
                    : "ui.panel.config.mqtt.explorer.expand"
                )}
                data-path=${path}
                @click=${this._toggleExpanded}
              ></ha-icon-button>`
            : html`<span class="spacer"></span>`
        }
        <button
          class="label"
          data-path=${path}
          data-topic=${topic ? "1" : ""}
          aria-expanded=${ifDefined(
            !topic && hasChildren ? (expanded ? "true" : "false") : undefined
          )}
          aria-current=${ifDefined(selected ? "true" : undefined)}
          @click=${this._rowClicked}
        >
          <span class="main">
            <span class="name" dir="ltr"
              >${
                name ||
                this.hass.localize("ui.panel.config.mqtt.explorer.empty_level")
              }</span
            >
            ${
              topic
                ? html`
                    ${
                      topic.retained
                        ? html`<span class="badge"
                            >${this.hass.localize(
                              "ui.panel.config.mqtt.explorer.retained"
                            )}</span
                          >`
                        : nothing
                    }
                    <span class="preview" dir="ltr"
                      >${lastMessage?.payload ?? ""}</span
                    >
                  `
                : nothing
            }
          </span>
          <span class="meta topics">
            ${
              hasChildren
                ? this.hass.localize(
                    "ui.panel.config.mqtt.explorer.topic_count",
                    {
                      count: node.topicCount,
                    }
                  )
                : nothing
            }
            ${
              topic && !hasChildren
                ? this.hass.localize(
                    "ui.panel.config.mqtt.explorer.subscriptions",
                    { count: topic.subscriptions }
                  )
                : nothing
            }
          </span>
          <span class="meta numeric">
            ${this.hass.localize("ui.panel.config.mqtt.explorer.rate", {
              messages: formatNumber(
                node?.messages ?? topic?.messages ?? 0,
                this.hass.locale
              ),
              rate: this._formatRate(
                node?.messageRate ?? topic?.message_rate ?? 0
              ),
            })}
          </span>
          <span class="meta ago">
            ${
              topic
                ? relativeTime(
                    new Date(topic.last_received * 1000),
                    this.hass.locale,
                    new Date(this._now * 1000)
                  )
                : nothing
            }
          </span>
        </button>
      </div>
    `;
  }

  private _formatRate(rate: number): string {
    return formatNumber(rate, this.hass.locale, { maximumFractionDigits: 1 });
  }

  private _handleFilter(ev: InputEvent): void {
    this._filter = (ev.target as HTMLInputElement).value;
  }

  private _handleBusiest(ev: Event): void {
    this._busiest = (ev.target as HTMLInputElement).checked;
  }

  private _toggleExpanded(ev: Event): void {
    const path = (ev.currentTarget as HTMLElement).dataset.path!;
    const expanded = new Set(this._expanded);
    if (!expanded.delete(path)) {
      expanded.add(path);
    }
    this._expanded = expanded;
  }

  private _rowClicked(ev: Event): void {
    const target = ev.currentTarget as HTMLElement;
    if (target.dataset.topic) {
      this._selected = target.dataset.path;
    } else {
      this._toggleExpanded(ev);
    }
  }

  private _closeDetail(): void {
    this._selected = undefined;
  }

  private _handleEvent = (event: MQTTExplorerEvent): void => {
    // A resubscribe starts a new backend session with a full snapshot; expanded
    // and selected paths are kept so the view survives an MQTT reload.
    if (event.started !== this._started) {
      this._topics = new Map();
      this._messages = new Map();
      this._trimmed = 0;
    }
    for (const topic of this._topics.values()) {
      if (topic.message_rate || topic.byte_rate) {
        this._topics.set(topic.topic, {
          ...topic,
          message_rate: 0,
          byte_rate: 0,
        });
      }
    }
    for (const topic of event.topics) {
      this._topics.set(topic.topic, topic);
    }
    const messages = [...event.messages].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    for (const message of messages) {
      const kept = this._messages.get(message.topic) ?? [];
      this._messages.set(
        message.topic,
        [{ ...message, id: this._messageId++ }, ...kept].slice(
          0,
          MAX_MESSAGES_PER_TOPIC
        )
      );
    }
    this._trimmed += trimMessages(
      this._messages,
      MAX_RETAINED_SIZE,
      this._selected
    );
    this._lastEvent = Date.now();
    this._interval = event.interval;
    this._total = event.total;
    this._now = event.now;
    this._started = event.started;
    this._version++;
  };

  private async _toggle(): Promise<void> {
    if (this._unsubscribe) {
      this._stop();
      return;
    }
    if (this._starting) {
      return;
    }
    this._starting = true;
    this._topics = new Map();
    this._messages = new Map();
    this._total = undefined;
    this._started = 0;
    this._selected = undefined;
    this._expanded = new Set();
    this._trimmed = 0;
    let unsubscribe: () => void;
    try {
      unsubscribe = await subscribeMQTTExplorer(
        this.hass,
        this._handleEvent,
        this._filter
      );
    } catch (err: unknown) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.mqtt.explorer.start_failed",
          { error: getWsErrorMessage(err) ?? String(err) }
        ),
      });
      return;
    } finally {
      this._starting = false;
    }
    if (!this.isConnected) {
      unsubscribe();
      return;
    }
    this._unsubscribe = unsubscribe;
    this._lastEvent = Date.now();
    this._stallCheck = window.setInterval(this._checkStalled, STALL_CHECK_MS);
  }

  private _stop(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    clearInterval(this._stallCheck);
    this._stallCheck = undefined;
  }

  // A reload of the MQTT integration ends the subscription without an error.
  private _checkStalled = async (): Promise<void> => {
    const stalled = this._unsubscribe;
    if (
      !stalled ||
      this._resubscribing ||
      !this.hass.connection.connected ||
      Date.now() - this._lastEvent < this._interval * STALLED_INTERVALS * 1000
    ) {
      return;
    }
    this._resubscribing = true;
    try {
      const unsubscribe = await subscribeMQTTExplorer(
        this.hass,
        this._handleEvent,
        this._filter
      );
      // Stopped by the user while subscribing.
      if (this._unsubscribe !== stalled) {
        unsubscribe();
        return;
      }
      stalled();
      this._unsubscribe = unsubscribe;
    } catch (_err: unknown) {
      // MQTT is not loaded again yet; the next check retries.
    } finally {
      this._lastEvent = Date.now();
      this._resubscribing = false;
    }
  };

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .secondary {
          margin-top: 0;
          color: var(--secondary-text-color);
        }
        .controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--ha-space-2) var(--ha-space-4);
        }
        .controls ha-input {
          flex: 1;
          min-width: 200px;
        }
        .totals {
          margin-bottom: 0;
          font-weight: var(--ha-font-weight-medium);
        }
        .body {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: var(--ha-space-4);
          padding: 0 var(--ha-space-4) var(--ha-space-4);
        }
        @media (min-width: 1000px) {
          .body.with-detail {
            grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
          }
        }
        .tree {
          container-type: inline-size;
          max-height: 640px;
          overflow-y: auto;
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-md);
        }
        .empty {
          padding: var(--ha-space-4);
          margin: 0;
        }
        .row {
          display: flex;
          align-items: center;
          min-height: 40px;
          border-bottom: 1px solid var(--divider-color);
        }
        .row.selected {
          background-color: rgba(var(--rgb-primary-color), 0.12);
        }
        .row ha-icon-button {
          --ha-icon-button-size: 32px;
          flex-shrink: 0;
        }
        .spacer {
          width: 32px;
          flex-shrink: 0;
        }
        .label {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 7em 9em 8em;
          flex: 1;
          align-items: center;
          gap: var(--ha-space-3);
          min-width: 0;
          padding: var(--ha-space-1) var(--ha-space-2);
          border: none;
          background: none;
          color: var(--primary-text-color);
          font: inherit;
          text-align: start;
          cursor: pointer;
        }
        .label:hover {
          background-color: var(--secondary-background-color);
        }
        .main {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          min-width: 0;
        }
        .name {
          flex-shrink: 0;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: var(--ha-font-weight-medium);
          white-space: nowrap;
        }
        .preview {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--ha-font-family-code);
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
        }
        .meta {
          white-space: nowrap;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
        }
        .meta {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .numeric,
        .ago {
          text-align: end;
        }
        .badge {
          padding: 0 var(--ha-space-2);
          border-radius: var(--ha-border-radius-pill);
          background-color: var(--secondary-background-color);
          font-size: var(--ha-font-size-xs);
          white-space: nowrap;
        }
        mqtt-explorer-topic {
          padding: var(--ha-space-2) 0;
        }
        @container (max-width: 560px) {
          .label {
            grid-template-columns: minmax(0, 1fr) auto;
          }
          .preview,
          .topics,
          .ago {
            display: none;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-explorer-card": MqttExplorerCard;
  }
}
