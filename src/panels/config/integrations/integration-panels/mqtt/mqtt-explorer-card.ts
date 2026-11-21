import type { ContextType } from "@lit/context";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { consume } from "../../../../../common/decorators/consume";
import { storage } from "../../../../../common/decorators/storage";
import { formatDurationDigital } from "../../../../../common/datetime/format_duration";
import { formatNumber } from "../../../../../common/number/format_number";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-switch";
import "../../../../../components/input/ha-input";
import "../../../../../components/item/ha-list-item-option";
import "../../../../../components/list/ha-list-selectable-virtualized";
import type { HaListSelectableVirtualized } from "../../../../../components/list/ha-list-selectable-virtualized";
import type { HaListVirtualizedItem } from "../../../../../components/list/ha-list-virtualized";
import {
  connectionContext,
  internationalizationContext,
} from "../../../../../data/context";
import type {
  MQTTExplorerEvent,
  MQTTExplorerTopic,
  MQTTExplorerTotals,
} from "../../../../../data/mqtt";
import { subscribeMQTTExplorer } from "../../../../../data/mqtt";
import { haStyle } from "../../../../../resources/styles";
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
import "./mqtt-explorer-tree-row";
import type { ExplorerRow } from "./mqtt-explorer-tree-row";

const MAX_BUSIEST_ROWS = 200;
// Row height including its border, used to size the virtualized list.
const ROW_HEIGHT = 41;
const MAX_VISIBLE_ROWS = 15;
// The backend sends an event every interval, also when nothing changed.
const STALL_CHECK_MS = 5000;
const STALLED_INTERVALS = 3;
// Kept apart from the trimmed history, 10,000 topics take 1M characters.
const PREVIEW_LENGTH = 100;

@customElement("mqtt-explorer-card")
class MqttExplorerCard extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

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

  private _previews = new Map<string, string>();

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

  private _rows = memoizeOne(
    (
      version: number,
      busiest: boolean,
      expanded: Set<string>,
      selected?: string
    ): ExplorerRow[] => {
      const row = (
        name: string,
        path: string,
        depth: number,
        topic?: MQTTExplorerTopic,
        node?: TopicTreeNode
      ): ExplorerRow => ({
        id: path,
        interactive: true,
        name,
        depth,
        topic,
        node,
        expanded: expanded.has(path),
        selected: topic !== undefined && path === selected,
        preview: topic ? this._previews.get(topic.topic) : "",
      });
      if (busiest) {
        return this._busiestTopics(version).map((topic) =>
          row(topic.topic, topic.topic, 0, topic)
        );
      }
      const rows: ExplorerRow[] = [];
      const addChildren = (node: TopicTreeNode, depth: number) => {
        for (const child of sortedChildren(node)) {
          rows.push(row(child.name, child.path, depth, child.topic, child));
          if (expanded.has(child.path)) {
            addChildren(child, depth + 1);
          }
        }
      };
      addChildren(this._tree(version), 0);
      return rows;
    }
  );

  protected render(): TemplateResult {
    const selectedTopic = this._selected
      ? this._topics.get(this._selected)
      : undefined;
    const localize = this._i18n.localize;

    return html`
      <ha-card .header=${localize("ui.panel.config.mqtt.explorer.title")}>
        <div class="card-content">
          <p class="secondary">
            ${localize("ui.panel.config.mqtt.explorer.description")}
          </p>
          <div class="controls">
            <ha-input
              .label=${localize("ui.panel.config.mqtt.explorer.filter")}
              .value=${this._filter}
              .disabled=${this._unsubscribe !== undefined || this._starting}
              @change=${this._handleFilter}
              @keydown=${this._filterKeyDown}
            ></ha-input>
            <ha-button
              appearance="plain"
              .disabled=${!this._filter}
              .loading=${this._starting}
              @click=${this._toggle}
            >
              ${localize(
                this._unsubscribe
                  ? "ui.panel.config.mqtt.explorer.stop"
                  : "ui.panel.config.mqtt.explorer.start"
              )}
            </ha-button>
            <ha-switch .checked=${this._busiest} @change=${this._handleBusiest}
              >${localize("ui.panel.config.mqtt.explorer.busiest_first")}</ha-switch
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
                        ? this._renderTree()
                        : html`<p class="secondary empty">
                            ${localize("ui.panel.config.mqtt.explorer.no_topics")}
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

  private _renderTree(): TemplateResult {
    const rows = this._currentRows();
    const truncated = this._busiest && this._topics.size > MAX_BUSIEST_ROWS;
    return html`
      <ha-list-selectable-virtualized
        controlled
        aria-label=${this._i18n.localize("ui.panel.config.mqtt.explorer.topics")}
        style=${styleMap({
          height: `${Math.min(rows.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT}px`,
        })}
        .rows=${rows}
        .rowRenderer=${this._renderRow}
        @ha-list-item-selected=${this._rowSelected}
        @keydown=${this._treeKeyDown}
        @mqtt-explorer-toggle-expanded=${this._expanderClicked}
      ></ha-list-selectable-virtualized>
      ${
        truncated
          ? html`<p class="secondary note">
              ${this._i18n.localize(
                "ui.panel.config.mqtt.explorer.rows_truncated",
                {
                  shown: formatNumber(MAX_BUSIEST_ROWS, this._i18n.locale),
                  total: formatNumber(this._topics.size, this._i18n.locale),
                }
              )}
            </p>`
          : nothing
      }
    `;
  }

  private _renderTotals(): TemplateResult | typeof nothing {
    const localize = this._i18n.localize;
    const locale = this._i18n.locale;
    if (!this._total) {
      return this._unsubscribe
        ? html`<p class="totals">
            ${localize("ui.panel.config.mqtt.explorer.waiting")}
          </p>`
        : nothing;
    }
    const elapsed = Math.max(0, Math.round(this._now - this._started));
    return html`
      <p class="totals">
        ${localize("ui.panel.config.mqtt.explorer.totals", {
          messages: this._formatRate(this._total.message_rate),
          kilobytes: formatNumber(this._total.byte_rate / 1024, locale, {
            maximumFractionDigits: 1,
          }),
          topics: this._total.topics,
          elapsed: formatDurationDigital(locale, {
            hours: Math.floor(elapsed / 3600),
            minutes: Math.floor((elapsed % 3600) / 60),
            seconds: elapsed % 60,
          }),
        })}
        ${
          this._total.dropped_messages
            ? html`<br />${localize("ui.panel.config.mqtt.explorer.dropped", {
                  count: this._total.dropped_messages,
                })}`
            : nothing
        }
        ${
          this._total.dropped_payloads
            ? html`<br />${localize(
                  "ui.panel.config.mqtt.explorer.dropped_payloads",
                  { count: this._total.dropped_payloads }
                )}`
            : nothing
        }
        ${
          this._trimmed
            ? html`<br />${localize("ui.panel.config.mqtt.explorer.trimmed", {
                  count: this._trimmed,
                })}`
            : nothing
        }
      </p>
    `;
  }

  private _renderRow = (item: HaListVirtualizedItem): TemplateResult => {
    const row = item as ExplorerRow;
    const hasChildren = Boolean(row.node?.children.size);
    return html`
      <ha-list-item-option
        .selected=${row.selected}
        aria-expanded=${ifDefined(
          hasChildren ? (row.expanded ? "true" : "false") : undefined
        )}
        style="border-bottom: 1px solid var(--divider-color)"
      >
        <mqtt-explorer-tree-row
          slot="content"
          .row=${row}
          .now=${this._now}
        ></mqtt-explorer-tree-row>
      </ha-list-item-option>
    `;
  };

  private _formatRate(rate: number): string {
    return formatNumber(rate, this._i18n.locale, { maximumFractionDigits: 1 });
  }

  private _handleFilter(ev: InputEvent): void {
    this._filter = (ev.target as HTMLInputElement).value;
  }

  private _handleBusiest(ev: Event): void {
    this._busiest = (ev.target as HTMLInputElement).checked;
  }

  private _filterKeyDown(ev: KeyboardEvent): void {
    if (ev.key !== "Enter" || ev.isComposing) {
      return;
    }
    this._filter = (ev.target as HTMLInputElement).value;
    if (this._filter && !this._unsubscribe) {
      this._toggle();
    }
  }

  private _setExpanded(path: string, expand: boolean): void {
    if (this._expanded.has(path) === expand) {
      return;
    }
    const expanded = new Set(this._expanded);
    if (expand) {
      expanded.add(path);
    } else {
      expanded.delete(path);
    }
    this._expanded = expanded;
  }

  private _expanderClicked(ev: CustomEvent<{ path: string }>): void {
    const path = ev.detail.path;
    this._setExpanded(path, !this._expanded.has(path));
  }

  private _currentRows(): ExplorerRow[] {
    return this._rows(
      this._version,
      this._busiest,
      this._expanded,
      this._selected
    );
  }

  private _rowSelected(ev: CustomEvent<number>): void {
    const row = this._currentRows()[ev.detail];
    if (!row) {
      return;
    }
    if (row.topic) {
      this._selected = row.id;
    } else {
      this._setExpanded(row.id, !row.expanded);
    }
  }

  private _treeKeyDown(ev: KeyboardEvent): void {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") {
      return;
    }
    const list = ev.currentTarget as HaListSelectableVirtualized;
    const row = this._currentRows()[list.getActiveItemIndex()];
    if (!row?.node?.children.size) {
      return;
    }
    ev.preventDefault();
    this._setExpanded(row.id, ev.key === "ArrowRight");
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
      this._previews = new Map();
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
      this._previews.set(
        message.topic,
        message.payload.slice(0, PREVIEW_LENGTH)
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
    this._previews = new Map();
    this._total = undefined;
    this._started = 0;
    this._selected = undefined;
    this._expanded = new Set();
    this._trimmed = 0;
    let unsubscribe: () => void;
    try {
      unsubscribe = await subscribeMQTTExplorer(
        this._connection.connection,
        this._handleEvent,
        this._filter
      );
    } catch (err: unknown) {
      showToast(this, {
        message: this._i18n.localize(
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
      !this._connection.connected ||
      Date.now() - this._lastEvent < this._interval * STALLED_INTERVALS * 1000
    ) {
      return;
    }
    this._resubscribing = true;
    try {
      const unsubscribe = await subscribeMQTTExplorer(
        this._connection.connection,
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
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-md);
        }
        .empty {
          padding: var(--ha-space-4);
          margin: 0;
        }
        ha-list-selectable-virtualized {
          --ha-row-item-min-height: 40px;
          --ha-row-item-padding-block: var(--ha-space-1);
          --ha-row-item-padding-inline: var(--ha-space-2);
          --ha-row-item-gap: 0;
        }
        .note {
          margin: 0;
          padding: var(--ha-space-2) var(--ha-space-4);
          font-size: var(--ha-font-size-s);
        }
        mqtt-explorer-topic {
          padding: var(--ha-space-2) 0;
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
