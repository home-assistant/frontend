import { mdiRobot, mdiScriptText } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { computeTimelineColor } from "../../components/chart/timeline-color";
import { formatTimeWithSeconds } from "../../common/datetime/format_time";
import { relativeTime } from "../../common/datetime/relative_time";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { navigate } from "../../common/navigate";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/entity/state-badge";
import "../../components/ha-domain-icon";
import "../../components/ha-icon-next";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import "../../components/ha-trigger-icon";
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

  // Live computed-style handle, resolved once per element — reading custom
  // properties forces a style recalc, costly to repeat per row while scrolling.
  private _computedStyle?: CSSStyleDeclaration;

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

    return html`
      <div
        class="entry ${classMap({
          narrow: this.narrow,
          "no-name": hideName,
          "no-icon": this.noIcon,
          "no-entity": !item.entity_id,
          "last-of-day": this.lastOfDay,
          "single-line": hideName,
          clickable: hasTrace,
          [`category-${category}`]: true,
        })}"
        .traceLink=${traceLink}
        role=${ifDefined(hasTrace ? "link" : undefined)}
        tabindex=${ifDefined(hasTrace ? "0" : undefined)}
        @click=${this._handleClick}
        @keydown=${this._handleKeydown}
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
            ? hideName
              ? this._renderInline(
                  whatHappened,
                  cause,
                  timeLabel,
                  relativeLabel
                )
              : this._renderCompact(
                  item.entity_id,
                  name,
                  hasTrace,
                  whatHappened,
                  cause,
                  contextText,
                  timeLabel,
                  relativeLabel
                )
            : this._renderWide(
                hideName,
                item.entity_id,
                name,
                hasTrace,
                whatHappened,
                category,
                cause,
                contextText
              )}
        </div>
        ${hasTrace ? html`<ha-icon-next></ha-icon-next>` : ""}
      </div>
    `;
  }

  private _renderInline(
    whatHappened: TemplateResult | string,
    cause: LogbookCause | undefined,
    timeLabel: string,
    relativeLabel: string
  ) {
    return html`
      <div class="line1">
        <span class="line1-main">${whatHappened}</span>
        ${cause
          ? html`<span title=${cause.name}>${this._causeIcon(cause)}</span>`
          : nothing}
        <span class="time-inline" title=${relativeLabel}>${timeLabel}</span>
      </div>
    `;
  }

  private _renderCompact(
    entityId: string | undefined,
    name: string | undefined,
    hasTrace: boolean,
    whatHappened: TemplateResult | string,
    cause: LogbookCause | undefined,
    contextText: string | undefined,
    timeLabel: string,
    relativeLabel: string
  ) {
    return html`
      <div class="line1">
        <span class="entity-name"
          >${this._renderEntity(entityId, name, hasTrace)}</span
        >
        <span class="state-value">${whatHappened}</span>
      </div>
      ${this._renderLine2(cause, contextText, timeLabel, relativeLabel)}
    `;
  }

  private _renderWide(
    hideName: boolean,
    entityId: string | undefined,
    name: string | undefined,
    hasTrace: boolean,
    whatHappened: TemplateResult | string,
    category: LogbookEntryCategory,
    cause: LogbookCause | undefined,
    contextText: string | undefined
  ) {
    const rtl = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );
    return html`
      <div class="line1">
        <span class="line1-main"
          >${!hideName
            ? html`<span class="entity-name"
                  >${this._renderEntity(entityId, name, hasTrace)}</span
                >${whatHappened
                  ? category !== "integration"
                    ? html`<span class="state-arrow">${rtl ? "←" : "→"}</span>`
                    : " "
                  : nothing}`
            : nothing}${whatHappened}</span
        >
      </div>
      ${this._renderLine2(cause, contextText)}
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
    const isUnavailable = item.state === UNAVAILABLE;
    const color =
      this.noIcon && !isUnavailable
        ? item.state
          ? computeTimelineColor(
              item.state,
              (this._computedStyle ??= getComputedStyle(this)),
              historicStateObj
            )
          : undefined
        : nodeColor(category, historicStateObj);
    const style = color ? styleMap({ "--node-color": color }) : nothing;
    if (this.noIcon) {
      return html`<span
        class="dot ${classMap({ unavailable: isUnavailable })}"
        style=${style}
      ></span>`;
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
    contextText: string | undefined,
    timeLabel?: TemplateResult | string,
    relativeLabel?: string
  ) {
    const parts: (TemplateResult | string)[] = [];
    if (contextText) {
      parts.push(contextText);
    }
    if (cause) {
      parts.push(this._renderCauseLabel(cause));
    }
    if (!parts.length && !timeLabel) {
      return nothing;
    }
    return html`<div class="line2">
      <span class="line2-left"
        >${parts.map((part, i) =>
          i ? html`<span class="sep"> · </span>${part}` : part
        )}</span
      >
      ${timeLabel
        ? html`<span class="time-inline" title=${relativeLabel || ""}
            >${timeLabel}</span
          >`
        : nothing}
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

    // Automation/script runs show a generic "Triggered"/"Ran" headline (the
    // trigger detail moves to the cause line). A logbook.log entry against an
    // automation/script carries neither source nor structured trigger, so it
    // falls through to render its own custom message instead.
    if (
      domain &&
      TRIGGER_DOMAINS.includes(domain) &&
      (item.source || item.trigger)
    ) {
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
    if (cause.triggerPlatform) {
      return html`<ha-trigger-icon
        class="cause-icon"
        .trigger=${cause.triggerPlatform}
      ></ha-trigger-icon>`;
    }
    if (cause.brandDomain) {
      return html`<ha-domain-icon
        class="cause-icon"
        .domain=${cause.brandDomain}
        brand-fallback
      ></ha-domain-icon>`;
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
      ${this._causeIcon(cause)}
      <span class="cause-name"
        >${this.hass.localize("ui.components.logbook.caused_by", {
          name: cause.name,
        })}</span
      >
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

  private _handleKeydown(ev: KeyboardEvent) {
    if (ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    const target = ev.currentTarget as any;
    if (!target.traceLink) {
      return;
    }
    ev.preventDefault();
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
          grid-template-columns: 72px 36px minmax(0, 1fr);
          column-gap: var(--ha-space-3);
          width: 100%;
          box-sizing: border-box;
          /* No vertical padding: the rail must reach the row edges so it stays
             continuous between nodes. Air comes from min-height instead. */
          padding: 0 var(--ha-space-4);
          min-height: 60px;
          line-height: var(--ha-line-height-normal);
          align-items: stretch;
        }

        .entry.single-line {
          min-height: 40px;
        }

        /* Narrow drops the time column (time moves into line 1) so the content
           gets the full width instead of truncating the value. */
        .entry.narrow {
          grid-template-columns: 36px minmax(0, 1fr);
        }

        /* No-icon narrow: dot is 10px — a smaller node column saves space. */
        .entry.narrow.no-icon {
          grid-template-columns: 28px minmax(0, 1fr);
          column-gap: var(--ha-space-2);
        }

        .entry.category-automation {
          --category-color: var(
            --logbook-category-automation-color,
            var(--light-blue-color)
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

        /* Two rail segments (::before = top, ::after = bottom) with a 2px gap
           on each side of the node. --rail-gap = node half-size + 2px clearance. */
        .node::before,
        .node::after {
          content: "";
          position: absolute;
          left: 50%;
          width: 2px;
          transform: translateX(-50%);
          background-color: var(--divider-color);
          z-index: 0;
        }

        .node::before {
          top: 0;
          bottom: calc(50% + var(--rail-gap, 22px));
        }

        .node::after {
          top: calc(50% + var(--rail-gap, 22px));
          bottom: 0;
        }

        /* Dot is 10px — gap of 7px (5px radius + 2px clearance). */
        .entry.no-icon .node {
          --rail-gap: 9px;
        }

        /* Two-line no-icon rows: align dot to line1 instead of centering.
           --dot-pos is measured from node top and matches line1's center
           (~20px = 8px content offset + 12px half-lineheight in a 60px row). */
        .entry.no-icon:not(.single-line) .node {
          --dot-pos: 20px;
          justify-content: flex-start;
          padding-top: calc(var(--dot-pos) - 5px);
        }

        .entry.no-icon:not(.single-line) .node::before {
          bottom: calc(100% - var(--dot-pos) + 9px);
        }

        .entry.no-icon:not(.single-line) .node::after {
          top: calc(var(--dot-pos) + 9px);
        }

        /* First row of a day: no rail above the icon. */
        .node.rail-trim-top::before {
          display: none;
        }

        /* Last row of a day: no rail below the icon. */
        .node.rail-trim-bottom::after {
          display: none;
        }

        .node-icon {
          --node-color: var(--category-color, var(--secondary-text-color));
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          width: 36px;
          height: 36px;
          border-radius: var(--ha-border-radius-circle);
          /* Opaque base so the rail reads as passing behind. */
          background-color: var(--card-background-color);
          color: var(--node-color);
          --mdc-icon-size: 24px;
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

        /* Orange "attention" badge in the icon corner (unavailable). */
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
          width: 10px;
          height: 10px;
          border-radius: var(--ha-border-radius-circle);
          background-color: var(--node-color);
        }

        .dot.unavailable {
          background-color: transparent;
          border: 2px solid var(--disabled-color);
          box-sizing: border-box;
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

        .entity-name {
          font-weight: var(--ha-font-weight-medium);
        }

        .line1 > .entity-name {
          flex: 1 1 auto;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .line1 > .entity-name button.link {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }

        .state-value {
          flex: 0 1 auto;
          min-width: 0;
          max-width: 60%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: right;
        }

        .time-inline {
          flex-shrink: 0;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .cause-avatar {
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          font-size: 10px;
        }

        .cause .cause-avatar {
          width: 16px;
          height: 16px;
          font-size: 9px;
        }

        .line2 {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
        }

        .line2-left {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* .line1-main is a flex item (blockified), so ::first-letter applies;
           .line1 itself is a flex container, where it would not. */
        .entry.no-name .line1-main:first-letter {
          text-transform: capitalize;
        }

        .state-arrow {
          color: var(--disabled-color);
          padding: 0 2px;
        }

        /* Inline-flex so the icon/avatar is centered against the "by … name"
           text (custom-element icons have an unreliable baseline). */
        .cause {
          display: inline-flex;
          align-items: center;
          gap: var(--ha-space-1);
          max-width: 100%;
          overflow: hidden;
        }

        .cause-icon {
          flex-shrink: 0;
          --mdc-icon-size: 18px;
          color: var(--secondary-text-color);
        }

        .cause .cause-icon {
          --mdc-icon-size: 16px;
        }

        .cause-name {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

        /* Reserve room for the absolutely-positioned trailing chevron so the
           row content (and its right-aligned time) doesn't slide under it. */
        .entry.clickable {
          padding-inline-end: var(--ha-space-12);
        }

        .entry.clickable:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: -2px;
        }

        .entry:hover {
          background-color: rgba(var(--rgb-primary-text-color), 0.04);
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
