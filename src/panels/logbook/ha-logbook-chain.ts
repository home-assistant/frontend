import type { HassEntity } from "home-assistant-js-websocket";
import { mdiClockOutline, mdiFlash, mdiHomeAssistant } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { formatTimeWithSeconds } from "../../common/datetime/format_time";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import type { LogbookEntry } from "../../data/logbook";
import { createHistoricState, localizeTriggerSource } from "../../data/logbook";
import type { TraceContexts } from "../../data/trace";
import { buttonLinkStyle, haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { LogbookChain } from "./logbook-chain-resolver";
import type { LogbookCause } from "./logbook-entry-model";
import {
  classifyLogbookEntry,
  computeLogbookItem,
  computeTraceLink,
  entityDisplay,
  isSameLogbookEntry,
  nodeColor,
} from "./logbook-entry-model";
import {
  renderLogbookCauseIcon,
  renderLogbookGlyph,
} from "./logbook-entry-templates";

@customElement("ha-logbook-chain")
class HaLogbookChain extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public chain!: LogbookChain;

  @property({ attribute: false }) public subject!: LogbookEntry;

  @property({ attribute: false }) public traceContexts: TraceContexts = {};

  protected render() {
    const { rows, runRow, origins, syntheticRun, triggerRow } = this.chain;

    if (!origins.length && !runRow && !syntheticRun && rows.length <= 1) {
      return html`
        <div class="box">
          <p class="no-cause">
            ${this.hass.localize("ui.dialogs.logbook_detail.no_known_cause")}
          </p>
        </div>
      `;
    }

    // An entity chain shows only its subject's rows; a run chain shows
    // everything the run did.
    const subjectIsRun = classifyLogbookEntry(this.subject) === "automation";
    const visibleRows = subjectIsRun
      ? rows
      : rows.filter(
          (row) =>
            classifyLogbookEntry(row) === "automation" ||
            (this.subject.entity_id
              ? row.entity_id === this.subject.entity_id
              : isSameLogbookEntry(row, this.subject))
        );

    return html`
      <div class="box">
        <div class="chain">
          ${origins.map((origin) =>
            this._renderOriginNode(
              origin,
              runRow ?? this.subject,
              origin.type === "state" ? triggerRow : undefined
            )
          )}
          ${syntheticRun ? this._renderSyntheticRunNode(syntheticRun) : nothing}
          ${visibleRows.map((row) =>
            classifyLogbookEntry(row) === "automation"
              ? this._renderRunNode(row)
              : this._renderEffectNode(row)
          )}
        </div>
      </div>
    `;
  }

  private _renderSyntheticRunNode(cause: LogbookCause) {
    const sub = this.subject.context_source
      ? localizeTriggerSource(this.hass.localize, this.subject.context_source)
      : this.hass.localize(
          cause.type === "script"
            ? "ui.components.logbook.script_ran"
            : "ui.components.logbook.automation_triggered"
        );
    return html`
      <div class="chain-row">
        <span class="chain-node run">${renderLogbookCauseIcon(cause)}</span>
        <span class="chain-content">
          ${this._renderName(cause.name, cause.entityId)}
          ${sub ? html`<span class="chain-secondary">${sub}</span>` : nothing}
        </span>
      </div>
    `;
  }

  private _renderOriginNode(
    origin: LogbookCause,
    originRow: LogbookEntry,
    triggerRow?: LogbookEntry
  ) {
    const name =
      origin.name ||
      this.hass.localize("ui.components.logbook.cause.scheduled");
    const isState = origin.type === "state";
    const triggerState = isState
      ? (triggerRow?.state ?? originRow.context_state)
      : undefined;
    const stateObj = origin.entityId
      ? this.hass.states[origin.entityId]
      : undefined;
    const triggerValue = triggerState
      ? stateObj
        ? this.hass.formatEntityState(stateObj, triggerState)
        : triggerState
      : undefined;
    const secondary = isState
      ? origin.entityId
        ? entityDisplay(this.hass, origin.entityId).secondary
        : undefined
      : this._actionUsedText(originRow);
    const isAvatar = origin.type === "user" && !origin.systemUser;
    const historicStateObj =
      stateObj && triggerState
        ? createHistoricState(stateObj, triggerState)
        : stateObj;
    const color =
      isState && historicStateObj
        ? nodeColor("entity", historicStateObj)
        : undefined;
    return html`
      <div class="chain-row">
        <span
          class="chain-node ${isAvatar ? "avatar" : ""}"
          style=${color ? styleMap({ "--node-color": color }) : nothing}
        >
          ${this._renderOriginIcon(origin, historicStateObj)}
        </span>
        <span class="chain-content">
          ${this._renderName(name, origin.entityId)}
          ${
            secondary
              ? html`<span class="chain-secondary">${secondary}</span>`
              : nothing
          }
        </span>
        ${
          triggerValue
            ? html`<span class="chain-trailing">
                <span class="trailing-state">${triggerValue}</span>
                ${
                  triggerRow
                    ? html`<span class="trailing-time"
                        >${this._formatTimeWithMs(triggerRow.when * 1000)}</span
                      >`
                    : nothing
                }
              </span>`
            : nothing
        }
      </div>
    `;
  }

  private _actionUsedText(originRow: LogbookEntry) {
    if (
      originRow.context_event_type === "call_service" &&
      originRow.context_domain &&
      originRow.context_service
    ) {
      return this.hass.localize("ui.dialogs.logbook_detail.action_used", {
        name: this._actionName(
          originRow.context_domain,
          originRow.context_service
        ),
      });
    }
    return "";
  }

  private _renderOriginIcon(origin: LogbookCause, stateObj?: HassEntity) {
    if (origin.type === "state") {
      return stateObj
        ? html`<ha-state-icon .stateObj=${stateObj}></ha-state-icon>`
        : html`<ha-svg-icon .path=${mdiFlash}></ha-svg-icon>`;
    }
    if (origin.type === "scheduled") {
      return html`<ha-svg-icon .path=${mdiClockOutline}></ha-svg-icon>`;
    }
    if (origin.type === "homeassistant") {
      return html`<ha-svg-icon .path=${mdiHomeAssistant}></ha-svg-icon>`;
    }
    return renderLogbookCauseIcon(origin);
  }

  private _formatTimeWithMs(when: number) {
    const time = formatTimeWithSeconds(
      new Date(when),
      this.hass.locale,
      this.hass.config
    );
    const ms = String(Math.floor(when % 1000)).padStart(3, "0");
    return `${time}.${ms}`;
  }

  private _renderRunNode(row: LogbookEntry) {
    const item = computeLogbookItem(this.hass, row);
    const time = this._formatTimeWithMs(item.when);
    const traceLink = computeTraceLink(this.traceContexts, row.context_id);
    return html`
      <div class="chain-row">
        <span class="chain-node run">
          ${renderLogbookGlyph(this.hass, row, item.glyph)}
        </span>
        <span class="chain-content">
          ${this._renderName(item.name, row.entity_id)}
          ${
            traceLink
              ? html`<a
                  class="trace-link"
                  href=${traceLink}
                  @click=${this._traceClicked}
                  >${this.hass.localize("ui.components.logbook.view_trace")}</a
                >`
              : nothing
          }
        </span>
        <span class="chain-trailing">
          ${
            item.value
              ? html`<span class="trailing-state">${item.value.text}</span>`
              : nothing
          }
          <span class="trailing-time">${time}</span>
        </span>
      </div>
    `;
  }

  private _renderEffectNode(row: LogbookEntry) {
    const item = computeLogbookItem(this.hass, row);
    const stateObj = row.entity_id
      ? this.hass.states[row.entity_id]
      : undefined;
    const historicStateObj = stateObj
      ? createHistoricState(stateObj, row.state)
      : undefined;
    const color = nodeColor(item.category, historicStateObj);
    const time = this._formatTimeWithMs(item.when);
    return html`
      <div class="chain-row">
        <span
          class="chain-node"
          style=${color ? styleMap({ "--node-color": color }) : nothing}
        >
          ${renderLogbookGlyph(this.hass, row, item.glyph)}
        </span>
        <span class="chain-content">
          ${this._renderName(item.name, row.entity_id)}
          ${
            item.context
              ? html`<span class="chain-secondary">${item.context}</span>`
              : nothing
          }
        </span>
        <span class="chain-trailing">
          ${
            item.value
              ? html`<span class="trailing-state">${item.value.text}</span>`
              : nothing
          }
          <span class="trailing-time">${time}</span>
        </span>
      </div>
    `;
  }

  private _renderName(name: string | undefined, entityId?: string) {
    if (entityId && entityId in this.hass.states) {
      return html`<button
        class="link name"
        .entityId=${entityId}
        @click=${this._entityClicked}
      >
        ${name}
      </button>`;
    }
    return html`<span class="name">${name}</span>`;
  }

  private _actionName(domain: string, service: string) {
    return (
      this.hass.localize(
        `component.${domain}.services.${service}.name` as LocalizeKeys
      ) ||
      this.hass.services[domain]?.[service]?.name ||
      `${domain}.${service}`
    );
  }

  private _entityClicked(ev: Event) {
    const entityId = (ev.currentTarget as HTMLElement & { entityId?: string })
      .entityId;
    if (!entityId) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _traceClicked(ev: MouseEvent) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey) {
      return;
    }
    ev.preventDefault();
    // navigate() closes the dialogs above this chain.
    navigate((ev.currentTarget as HTMLAnchorElement).getAttribute("href")!);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      buttonLinkStyle,
      css`
        :host {
          display: block;
        }

        .box {
          border: 1px solid var(--divider-color);
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          overflow: hidden;
        }

        .chain-row {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          min-height: 56px;
          padding: var(--ha-space-2) var(--ha-space-4);
          box-sizing: border-box;
        }

        /* Caret between rows: the chain reads top-down, cause to effects. */
        .chain-row + .chain-row::before {
          content: "";
          position: absolute;
          top: -3px;
          inset-inline-start: 27px;
          border-inline-start: 5px solid transparent;
          border-inline-end: 5px solid transparent;
          border-top: 6px solid var(--divider-color);
        }

        .chain-node {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: var(--ha-border-radius-circle);
          background-color: var(--card-background-color);
          color: var(--node-color, var(--secondary-text-color));
          --mdc-icon-size: 18px;
        }

        .chain-node state-badge {
          margin: 0;
          color: inherit;
        }

        .chain-node::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-color: currentColor;
          opacity: 0.15;
        }

        .chain-node > * {
          position: relative;
        }

        .chain-node.run {
          color: var(
            --logbook-category-automation-color,
            var(--light-blue-color)
          );
          border-radius: var(--ha-border-radius-md);
        }

        .chain-node.avatar::before {
          display: none;
        }

        .chain-node.avatar ha-user-badge {
          width: 32px;
          height: 32px;
          font-size: 14px;
        }

        .chain-content {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .chain-content .name {
          font-weight: var(--ha-font-weight-medium);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: start;
        }

        button.link.name {
          color: var(--primary-text-color);
          text-align: inherit;
          text-decoration: none;
        }

        button.link.name:hover {
          text-decoration: underline;
        }

        .chain-secondary {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }

        .chain-trailing {
          text-align: end;
          flex-shrink: 0;
        }

        .trailing-state {
          display: block;
        }

        .trailing-time {
          display: block;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          font-variant-numeric: tabular-nums;
        }

        .trace-link {
          flex-shrink: 0;
          color: var(--primary-color);
          font-size: var(--ha-font-size-s);
          text-decoration: none;
        }

        .trace-link:hover {
          text-decoration: underline;
        }

        .no-cause {
          margin: 0;
          padding: var(--ha-space-3) var(--ha-space-4);
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-logbook-chain": HaLogbookChain;
  }
}
