import { mdiRobot, mdiScriptText } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { formatTimeWithSeconds } from "../../common/datetime/format_time";
import { relativeTime } from "../../common/datetime/relative_time";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { navigate } from "../../common/navigate";
import "../../components/entity/state-badge";
import "../../components/ha-icon-next";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import "../../components/user/ha-user-badge";
import { UNAVAILABLE } from "../../data/entity/entity";
import type { LogbookEntry } from "../../data/logbook";
import { createHistoricState, localizeStateMessage } from "../../data/logbook";
import type { TraceContexts } from "../../data/trace";
import type { User } from "../../data/user";
import { buttonLinkStyle, haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import type {
  LogbookCause,
  LogbookEntryCategory,
  LogbookScope,
} from "./logbook-entry-model";
import {
  classifyLogbookEntry,
  entityDisplay,
  hasContext,
  nodeColor,
  resolveLogbookCause,
  TRIGGER_DOMAINS,
} from "./logbook-entry-model";

const stripEntityId = (message: string, entityId?: string) =>
  entityId ? message.replace(entityId, " ") : message;

@customElement("ha-logbook-entry")
class HaLogbookEntry extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public item!: LogbookEntry;

  @property({ attribute: false }) public userIdToName: Record<string, string> =
    {};

  @property({ attribute: false }) public traceContexts: TraceContexts = {};

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: false }) public noIcon = false;

  @property({ type: Boolean, attribute: false }) public noName = false;

  @property({ attribute: false }) public scope?: LogbookScope;

  @property({ type: Boolean, attribute: false }) public firstOfDay = false;

  @property({ type: Boolean, attribute: false }) public lastOfDay = false;

  protected render() {
    const item = this.item;
    const seenEntityIds: string[] = [];
    const currentStateObj = item.entity_id
      ? this.hass.states[item.entity_id]
      : undefined;
    const historicStateObj = currentStateObj
      ? createHistoricState(currentStateObj, item.state)
      : undefined;
    const domain = item.entity_id ? computeDomain(item.entity_id) : item.domain;
    const overrideImage =
      !historicStateObj &&
      !item.icon &&
      !item.state &&
      domain &&
      isComponentLoaded(this.hass.config, domain)
        ? brandsUrl(
            {
              domain,
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            },
            this.hass.auth.data.hassUrl
          )
        : undefined;

    const traceContext =
      item.domain &&
      TRIGGER_DOMAINS.includes(item.domain) &&
      item.context_id &&
      item.context_id in this.traceContexts
        ? this.traceContexts[item.context_id]
        : undefined;
    const traceLink = traceContext
      ? `/config/${traceContext.domain}/trace/${traceContext.item_id}?run_id=${traceContext.run_id}`
      : undefined;
    const hasTrace = traceContext !== undefined;

    const category = classifyLogbookEntry(item);
    const hideName = this.noName || this.scope === "entity";

    // Context only for entity rows — an automation's configured area is noise.
    const display =
      !hideName && item.entity_id && category === "entity"
        ? entityDisplay(this.hass, item.entity_id, this.scope)
        : undefined;
    const contextText = display?.secondary;
    const name = display?.primary ?? item.name;

    const whatHappened = this._renderMessage(
      item,
      seenEntityIds,
      domain,
      historicStateObj,
      hasTrace
    );

    const when = new Date(item.when * 1000);
    const timeLabel = formatTimeWithSeconds(
      when,
      this.hass.locale,
      this.hass.config
    );
    const relativeLabel = relativeTime(when, this.hass.locale);

    const cause = resolveLogbookCause(this.hass, item, this.userIdToName);
    const causeIcon = this.narrow && cause ? this._causeIcon(cause) : nothing;

    return html`
      <div
        class="entry ${classMap({
          narrow: this.narrow,
          "no-name": hideName,
          "no-entity": !item.entity_id,
          "last-of-day": this.lastOfDay,
          // Only single-entity surfaces (more-info) condense; everywhere else
          // keeps a fixed 56px row for an even timeline rhythm.
          "single-line": hideName,
          clickable: hasTrace,
          [`category-${category}`]: true,
        })}"
        .traceLink=${traceLink}
        @click=${this._handleClick}
      >
        ${!this.narrow
          ? html`<div class="time" title=${relativeLabel}>${timeLabel}</div>`
          : nothing}
        <div
          class="node ${classMap({
            "rail-trim-top": this.firstOfDay,
            "rail-trim-bottom": this.lastOfDay,
          })}"
        >
          <span class="rail"></span>
          ${this._renderNode(
            item,
            category,
            domain,
            historicStateObj,
            overrideImage
          )}
        </div>
        <div class="content">
          ${this.narrow
            ? html`
                <div class="line1">
                  <span class="line1-main">${whatHappened}</span>
                  ${causeIcon}
                  <span class="time-inline" title=${relativeLabel}
                    >${timeLabel}</span
                  >
                </div>
                ${!hideName
                  ? html`<div class="line-meta">
                      ${contextText
                        ? `${contextText} ▸ `
                        : ""}${this._renderEntity(
                        item.entity_id,
                        name,
                        hasTrace
                      )}
                    </div>`
                  : nothing}
              `
            : html`
                <div class="line1">
                  <span class="line1-main">
                    ${!hideName
                      ? this._renderEntity(item.entity_id, name, hasTrace)
                      : ""}
                    ${!hideName && whatHappened && category !== "integration"
                      ? html`<span class="state-arrow">→</span>`
                      : nothing}
                    ${whatHappened}
                  </span>
                </div>
                ${this._renderLine2(cause, contextText)}
              `}
        </div>
        ${hasTrace ? html`<ha-icon-next></ha-icon-next>` : ""}
      </div>
    `;
  }

  private _renderLeadingIcon(
    item: LogbookEntry,
    category: LogbookEntryCategory,
    domain: string | undefined,
    historicStateObj: HassEntity | undefined,
    overrideImage: string | undefined
  ) {
    if (category === "automation") {
      return html`<ha-svg-icon
        .path=${domain === "script" ? mdiScriptText : mdiRobot}
      ></ha-svg-icon>`;
    }
    // Force the entity's icon — never its picture / brand logo (entity_picture).
    if (historicStateObj) {
      return html`<ha-state-icon
        .stateObj=${historicStateObj}
        .icon=${item.icon}
      ></ha-state-icon>`;
    }
    return html`<state-badge
      .hass=${this.hass}
      .overrideIcon=${item.icon}
      .overrideImage=${overrideImage}
      .stateColor=${false}
    ></state-badge>`;
  }

  private _renderNode(
    item: LogbookEntry,
    category: LogbookEntryCategory,
    domain: string | undefined,
    historicStateObj: HassEntity | undefined,
    overrideImage: string | undefined
  ) {
    const color = nodeColor(category, historicStateObj);
    const style = color ? styleMap({ "--node-color": color }) : nothing;
    if (this.noIcon) {
      return html`<span class="dot" style=${style}></span>`;
    }
    const unavailable =
      category === "entity" && historicStateObj?.state === UNAVAILABLE;
    return html`<div class="node-icon" style=${style}>
      ${this._renderLeadingIcon(
        item,
        category,
        domain,
        historicStateObj,
        overrideImage
      )}
      ${unavailable ? html`<span class="node-badge"></span>` : nothing}
    </div>`;
  }

  private _renderLine2(
    cause: LogbookCause | undefined,
    contextText: string | undefined
  ) {
    const parts: (TemplateResult | string)[] = [];
    if (contextText) {
      parts.push(contextText);
    }
    if (cause) {
      parts.push(this._renderCauseLabel(cause));
    }
    if (!parts.length) {
      return nothing;
    }
    return html`<div class="line2">
      ${parts.map((part, i) =>
        i ? html`<span class="sep"> · </span>${part}` : part
      )}
    </div>`;
  }

  private _renderMessage(
    item: LogbookEntry,
    seenEntityIds: string[],
    domain?: string,
    historicStateObj?: HassEntity,
    noLink?: boolean
  ) {
    if (item.entity_id && item.state) {
      return historicStateObj
        ? localizeStateMessage(this.hass, item.state, historicStateObj, domain!)
        : item.state;
    }

    if (domain && TRIGGER_DOMAINS.includes(domain)) {
      return this.hass.localize(
        domain === "script"
          ? "ui.components.logbook.script_ran"
          : "ui.components.logbook.automation_triggered"
      );
    }

    const message = item.message;
    if (!message) {
      return "";
    }
    return this._formatMessageWithPossibleEntity(
      hasContext(item)
        ? stripEntityId(message, item.context_entity_id)
        : message,
      seenEntityIds,
      undefined,
      noLink
    );
  }

  private _causeIcon(cause: LogbookCause) {
    if (cause.userId) {
      return html`<ha-user-badge
        class="cause-icon cause-avatar"
        .user=${this._causeUser(cause.userId, cause.name)}
      ></ha-user-badge>`;
    }
    if (cause.stateObj) {
      return html`<ha-state-icon
        class="cause-icon"
        .stateObj=${cause.stateObj}
      ></ha-state-icon>`;
    }
    if (cause.iconPath) {
      return html`<ha-svg-icon
        class="cause-icon"
        .path=${cause.iconPath}
      ></ha-svg-icon>`;
    }
    return nothing;
  }

  private _renderCauseLabel(cause: LogbookCause) {
    return html`<span class="cause">
      ${this.hass.localize("ui.components.logbook.caused_by")}
      ${this._causeIcon(cause)}
      <span class="cause-name">${cause.name}</span>
    </span>`;
  }

  // ha-user-badge only needs id + name; it resolves the picture from the user's
  // person entity (or falls back to initials).
  private _causeUser(id: string, name: string): User {
    return { id, name } as User;
  }

  private _renderEntity(
    entityId: string | undefined,
    entityName: string | undefined,
    noLink?: boolean
  ) {
    const hasState = entityId && entityId in this.hass.states;
    const displayName =
      entityName ||
      (hasState
        ? this.hass.states[entityId].attributes.friendly_name || entityId
        : entityId);
    if (!hasState) {
      return displayName;
    }
    return noLink
      ? displayName
      : html`<button
          class="link"
          @click=${this._entityClicked}
          .entityId=${entityId}
        >
          ${displayName}
        </button>`;
  }

  private _formatMessageWithPossibleEntity(
    message: string,
    seenEntities: string[],
    possibleEntity?: string,
    noLink?: boolean
  ) {
    // Replace an entity_id in the message with a clickable entity link.
    if (message.indexOf(".") !== -1) {
      const messageParts = message.split(" ");
      for (let i = 0, size = messageParts.length; i < size; i++) {
        if (messageParts[i] in this.hass.states) {
          const entityId = messageParts[i];
          if (seenEntities.includes(entityId)) {
            return "";
          }
          seenEntities.push(entityId);
          const messageEnd = messageParts.splice(i);
          messageEnd.shift();
          return html`${messageParts.join(" ")}
          ${this._renderEntity(
            entityId,
            this.hass.states[entityId].attributes.friendly_name,
            noLink
          )}
          ${messageEnd.join(" ")}`;
        }
      }
    }
    // Otherwise link the attached entity if the message ends with its name.
    if (possibleEntity && possibleEntity in this.hass.states) {
      const possibleEntityName =
        this.hass.states[possibleEntity].attributes.friendly_name;
      if (possibleEntityName && message.endsWith(possibleEntityName)) {
        if (seenEntities.includes(possibleEntity)) {
          return "";
        }
        seenEntities.push(possibleEntity);
        message = message.substring(
          0,
          message.length - possibleEntityName.length
        );
        return html`${message}
        ${this._renderEntity(possibleEntity, possibleEntityName, noLink)}`;
      }
    }
    return message;
  }

  private _entityClicked(ev: Event) {
    const entityId = (ev.currentTarget as any).entityId;
    if (!entityId) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _handleClick(ev: Event) {
    const target = ev.currentTarget as any;
    if (!target.traceLink) {
      return;
    }
    navigate(target.traceLink);
    fireEvent(this, "closed");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      buttonLinkStyle,
      css`
        :host {
          display: block;
        }

        .entry {
          position: relative;
          display: grid;
          grid-template-columns: 72px 28px minmax(0, 1fr);
          column-gap: var(--ha-space-3);
          width: 100%;
          box-sizing: border-box;
          /* No vertical padding: the rail must reach the row edges so it stays
             continuous between nodes. Air comes from min-height instead. */
          padding: 0 var(--ha-space-4);
          min-height: 56px;
          line-height: var(--ha-line-height-normal);
          align-items: stretch;
        }

        .entry.single-line {
          min-height: 40px;
        }

        /* Narrow drops the time column (time moves into line 1) so the content
           gets the full width instead of truncating the value. */
        .entry.narrow {
          grid-template-columns: 28px minmax(0, 1fr);
        }

        .entry.category-automation {
          --category-color: var(
            --logbook-category-automation-color,
            var(--purple-color)
          );
        }

        .entry.category-integration {
          --category-color: var(
            --logbook-category-integration-color,
            var(--teal-color)
          );
        }

        .time {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          white-space: nowrap;
        }

        .node {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          align-self: stretch;
        }

        .rail {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 2px;
          transform: translateX(-50%);
          background-color: var(--divider-color);
          z-index: 0;
        }

        /* Trim the rail to start/end at the node on the first/last row of a day. */
        .node.rail-trim-top .rail {
          top: 50%;
        }
        .node.rail-trim-bottom .rail {
          bottom: 50%;
        }

        .node-icon {
          --node-color: var(--category-color, var(--secondary-text-color));
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          width: 28px;
          height: 28px;
          border-radius: var(--ha-border-radius-circle);
          /* Colored ring + opaque base so the rail reads as passing behind. */
          border: 1px solid var(--node-color);
          background-color: var(--card-background-color);
          color: var(--node-color);
          --mdc-icon-size: 18px;
        }

        /* Tinted fill via an opacity layer (color-mix is not safe for our
           browser support). */
        .node-icon::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-color: var(--node-color);
          opacity: 0.18;
        }

        .node-icon > * {
          position: relative;
        }

        /* Orange "attention" badge in the icon corner (unavailable), like the
           tile card badge. */
        .node-badge {
          position: absolute;
          top: -1px;
          right: -1px;
          z-index: 2;
          width: 9px;
          height: 9px;
          border-radius: var(--ha-border-radius-circle);
          background-color: var(--orange-color);
          border: 1.5px solid var(--card-background-color);
        }

        /* Entity state changes stay round; system/app events use a squircle. */
        .entry.category-automation .node-icon,
        .entry.category-integration .node-icon {
          border-radius: var(--ha-border-radius-md);
        }

        .node-icon state-badge {
          margin: 0;
          color: inherit;
        }

        .dot {
          --node-color: var(--category-color, var(--disabled-color));
          position: relative;
          z-index: 1;
          margin-top: 4px;
          width: 10px;
          height: 10px;
          border-radius: var(--ha-border-radius-circle);
          background-color: var(--node-color);
        }

        .content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
          gap: 2px;
          /* Discreet divider between rows, aligned to the content so it does
             not cross the rail. Suppressed on the last row of each day. */
          border-bottom: 1px solid var(--divider-color);
        }

        .entry.last-of-day .content {
          border-bottom: none;
        }

        .entry.narrow .content {
          gap: 0;
        }

        .line1 {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          color: var(--primary-text-color);
        }

        .line1-main {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .time-inline {
          flex-shrink: 0;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .entry.narrow .line1-main {
          font-weight: var(--ha-font-weight-medium);
        }

        /* Same font-size as line 1 — the distinction comes from weight and
           color (primary vs secondary). */
        .line-meta {
          color: var(--secondary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .line-meta button.link {
          color: var(--secondary-text-color);
          font-weight: var(--ha-font-weight-normal);
        }

        .cause-avatar {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          font-size: 9px;
        }

        .line2 {
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .entry.no-name .line1:first-letter {
          text-transform: capitalize;
        }

        .state-arrow {
          color: var(--secondary-text-color);
          padding: 0 2px;
        }

        /* Inline-flex so the icon/avatar is centered against the "by … name"
           text (custom-element icons have an unreliable baseline). */
        .cause {
          display: inline-flex;
          align-items: center;
          gap: var(--ha-space-1);
        }

        .cause-icon {
          flex-shrink: 0;
          --mdc-icon-size: 14px;
          color: var(--secondary-text-color);
        }

        .cause-name {
          color: var(--primary-text-color);
        }

        .sep {
          color: var(--secondary-text-color);
        }

        ha-icon-next {
          position: absolute;
          right: var(--ha-space-4);
          inset-inline-end: var(--ha-space-4);
          inset-inline-start: initial;
          top: 50%;
          transform: translateY(-50%);
          color: var(--secondary-text-color);
        }

        .clickable {
          cursor: pointer;
        }

        .entry:hover {
          background-color: rgba(var(--rgb-primary-text-color), 0.04);
        }

        a {
          color: var(--primary-color);
          text-decoration: none;
        }

        /* Entity names read as the subject, not a wall of blue links — the
           colored node is the scan anchor; the whole row is clickable. */
        button.link {
          color: var(--primary-text-color);
          font-weight: var(--ha-font-weight-medium);
          text-decoration: none;
        }

        button.link:hover {
          text-decoration: underline;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-logbook-entry": HaLogbookEntry;
  }
}
