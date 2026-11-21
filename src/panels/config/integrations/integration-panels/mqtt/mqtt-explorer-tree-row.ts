import { mdiChevronDown, mdiChevronRight } from "@mdi/js";
import type { ContextType } from "@lit/context";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../../../../common/decorators/consume";
import { relativeTime } from "../../../../../common/datetime/relative_time";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { formatNumber } from "../../../../../common/number/format_number";
import "../../../../../components/ha-svg-icon";
import type { HaListVirtualizedItem } from "../../../../../components/list/ha-list-virtualized";
import { internationalizationContext } from "../../../../../data/context";
import type { MQTTExplorerTopic } from "../../../../../data/mqtt";
import type { TopicTreeNode } from "./mqtt-explorer-data";

export interface ExplorerRow extends HaListVirtualizedItem {
  name: string;
  depth: number;
  topic?: MQTTExplorerTopic;
  node?: TopicTreeNode;
  expanded: boolean;
  selected: boolean;
  preview?: string;
}

// Row content of the topic list. A separate element, because the virtualized
// list renders its rows in its own shadow root.
@customElement("mqtt-explorer-tree-row")
class MqttExplorerTreeRow extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @property({ attribute: false }) public row!: ExplorerRow;

  // Server clock of the last event, in seconds
  @property({ attribute: false }) public now = 0;

  protected render(): TemplateResult {
    const { node, topic } = this.row;
    const localize = this._i18n.localize;
    const locale = this._i18n.locale;
    const hasChildren = node !== undefined && node.children.size > 0;
    return html`
      <span
        class="indent"
        style=${styleMap({
          "margin-inline-start": `${this.row.depth * 16}px`,
        })}
      >
        ${
          hasChildren
            ? html`<ha-svg-icon
                aria-hidden="true"
                .path=${this.row.expanded ? mdiChevronDown : mdiChevronRight}
                @click=${this._expanderClicked}
              ></ha-svg-icon>`
            : nothing
        }
      </span>
      <span class="main">
        <span class="name" dir="ltr"
          >${
            this.row.name ||
            localize("ui.panel.config.mqtt.explorer.empty_level")
          }</span
        >
        ${
          topic?.retained
            ? html`<span class="badge"
                >${localize("ui.panel.config.mqtt.explorer.retained")}</span
              >`
            : nothing
        }
        ${
          topic
            ? html`<span class="preview" dir="ltr"
                >${this.row.preview ?? ""}</span
              >`
            : nothing
        }
      </span>
      <span class="meta topics">
        ${
          hasChildren
            ? localize("ui.panel.config.mqtt.explorer.topic_count", {
                count: node.topicCount,
              })
            : topic
              ? localize("ui.panel.config.mqtt.explorer.subscriptions", {
                  count: topic.subscriptions,
                })
              : nothing
        }
      </span>
      <span class="meta numeric">
        ${localize("ui.panel.config.mqtt.explorer.rate", {
          messages: formatNumber(
            node?.messages ?? topic?.messages ?? 0,
            locale
          ),
          rate: formatNumber(
            node?.messageRate ?? topic?.message_rate ?? 0,
            locale,
            { maximumFractionDigits: 1 }
          ),
        })}
      </span>
      <span class="meta ago">
        ${
          topic
            ? relativeTime(
                new Date(topic.last_received * 1000),
                locale,
                new Date(this.now * 1000)
              )
            : nothing
        }
      </span>
    `;
  }

  private _expanderClicked(ev: Event): void {
    // A click on the row itself selects the topic.
    ev.stopPropagation();
    fireEvent(this, "mqtt-explorer-toggle-expanded", { path: this.row.id });
  }

  static readonly styles = css`
    :host {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) 7em 9em 8em;
      align-items: center;
      gap: var(--ha-space-3);
      min-width: 0;
    }
    .indent {
      display: flex;
      justify-content: center;
      width: 24px;
      color: var(--secondary-text-color);
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
    @container (max-width: 560px) {
      :host {
        grid-template-columns: auto minmax(0, 1fr) auto;
      }
      .preview,
      .topics,
      .ago {
        display: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-explorer-tree-row": MqttExplorerTreeRow;
  }
  interface HASSDomEvents {
    "mqtt-explorer-toggle-expanded": { path: string };
  }
}
