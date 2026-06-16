import { mdiRobot, mdiScriptText } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { computeTimelineColor } from "../../components/chart/timeline-color";
import { computeDomain } from "../../common/entity/compute_domain";
import { formatTimeWithSeconds } from "../../common/datetime/format_time";
import { relativeTime } from "../../common/datetime/relative_time";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/entity/state-badge";
import "../../components/ha-domain-icon";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import "../../components/ha-trigger-icon";
import "../../components/user/ha-user-badge";
import { UNAVAILABLE } from "../../data/entity/entity";
import type { LogbookEntry } from "../../data/logbook";
import type { TraceContexts } from "../../data/trace";
import type { User } from "../../data/user";
import { buttonLinkStyle, haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import type {
  LogbookCause,
  LogbookGlyph,
  LogbookItem,
  LogbookScope,
  LogbookWhat,
} from "./logbook-entry-model";
import {
  buildLogbookItem,
  nodeColor,
  TRIGGER_DOMAINS,
} from "./logbook-entry-model";

// How the row content is arranged (wide = desktop 3-line, compact = narrow
// 2-line, inline = narrow single-line) — orthogonal to the node style.
type EntryLayout = "wide" | "compact" | "inline";

// The timeline node: a tinted icon circle, or a small colored dot.
type EntryNode = "icon" | "dot";

@customElement("ha-logbook-entry")
class HaLogbookEntry extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public item!: LogbookEntry;

  @property({ attribute: false }) public userIdToName: Record<string, string> =
    {};

  @property({ attribute: false }) public traceContexts: TraceContexts = {};

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: false }) public noIcon = false;

  @property({ type: Boolean, attribute: false }) public graphColor = false;

  @property({ attribute: false }) public scope?: LogbookScope;

  @property({ type: Boolean, attribute: false }) public firstOfDay = false;

  @property({ type: Boolean, attribute: false }) public lastOfDay = false;

  @property({ type: Boolean, attribute: false }) public showRelative = false;

  // Live computed-style handle, resolved once per element — reading custom
  // properties forces a style recalc, costly to repeat per row while scrolling.
  private _computedStyle?: CSSStyleDeclaration;

  protected render() {
    const item = this.item;
    const seenEntityIds: string[] = [];

    const model = buildLogbookItem(this.hass, item, {
      scope: this.scope,
      userIdToName: this.userIdToName,
    });

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

    // Two orthogonal style axes derived from the props:
    //   layout = how the content is arranged (driven by narrow + scope)
    //   node   = icon circle vs colored dot (driven by noIcon)
    const hideName = this.scope === "entity";
    const layout: EntryLayout = !this.narrow
      ? "wide"
      : hideName
        ? "inline"
        : "compact";
    const node: EntryNode = this.noIcon ? "dot" : "icon";

    const whatHappened = this._renderWhat(
      model.what,
      seenEntityIds,
      !!traceLink
    );

    const when = new Date(model.when);
    const timeLabel = this.showRelative
      ? relativeTime(when, this.hass.locale, undefined, true, "short")
      : formatTimeWithSeconds(when, this.hass.locale, this.hass.config);

    return html`
      <div
        class="entry ${classMap({
          [`layout-${layout}`]: true,
          [`node-${node}`]: true,
          "last-of-day": this.lastOfDay,
          [`category-${model.category}`]: true,
        })}"
      >
        <div
          class="node ${classMap({
            "rail-trim-top": this.firstOfDay,
            "rail-trim-bottom": this.lastOfDay,
          })}"
        >
          ${this._renderNode(model)}
        </div>
        <div class="content">
          ${layout === "wide"
            ? this._renderWide(
                hideName,
                model.entityId,
                model.name,
                traceLink,
                whatHappened,
                model.what?.kind === "value",
                model.cause,
                model.context
              )
            : layout === "compact"
              ? this._renderCompact(
                  model.entityId,
                  model.name,
                  traceLink,
                  whatHappened,
                  model.what?.text,
                  model.cause,
                  model.context,
                  timeLabel,
                  model.category === "entity"
                )
              : this._renderInline(
                  whatHappened,
                  model.cause,
                  traceLink,
                  timeLabel,
                  model.category === "entity"
                )}
        </div>
        ${layout === "wide"
          ? html`<div
              class="time"
              role="button"
              tabindex="0"
              @click=${this._toggleTime}
              @keydown=${this._timeKeydown}
            >
              <span class="time-primary">${timeLabel}</span>
            </div>`
          : nothing}
      </div>
    `;
  }

  private _toggleTime(e: Event) {
    e.stopPropagation();
    fireEvent(this, "logbook-toggle-time" as any);
  }

  private _timeKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fireEvent(this, "logbook-toggle-time" as any);
    }
  }

  private _renderTraceLink(traceLink: string) {
    return html`<a
      class="view-trace"
      href=${traceLink}
      @click=${this._handleTraceClick}
      >${this.hass.localize("ui.components.logbook.view_trace")}</a
    >`;
  }

  private _handleTraceClick(ev: MouseEvent) {
    // Let modified clicks open in a new tab; otherwise route in-app.
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey) {
      return;
    }
    ev.preventDefault();
    navigate((ev.currentTarget as HTMLAnchorElement).getAttribute("href")!);
    fireEvent(this, "closed");
  }

  private _renderWhat(
    what: LogbookWhat | undefined,
    seenEntityIds: string[],
    noLink: boolean
  ): TemplateResult | string {
    if (!what) {
      return "";
    }
    return what.kind === "phrase"
      ? this._formatMessageWithPossibleEntity(
          what.text,
          seenEntityIds,
          undefined,
          noLink
        )
      : what.text;
  }

  private _renderInline(
    whatHappened: TemplateResult | string,
    cause: LogbookCause | undefined,
    traceLink: string | undefined,
    timeLabel: string,
    showCause: boolean
  ) {
    return html`
      <div class="headline">
        <span class="headline-main">${whatHappened}</span>
        <span class="trailing">
          ${showCause && cause
            ? html`<span class="cause-icon-only" title=${cause.name}
                >${this._causeIcon(cause)}</span
              >`
            : nothing}
          ${traceLink ? this._renderTraceLink(traceLink) : nothing}
          <span
            class="time-inline"
            role="button"
            tabindex="0"
            @click=${this._toggleTime}
            @keydown=${this._timeKeydown}
            >${timeLabel}</span
          >
        </span>
      </div>
    `;
  }

  private _renderCompact(
    entityId: string | undefined,
    name: string | undefined,
    traceLink: string | undefined,
    whatHappened: TemplateResult | string,
    whatText: string | undefined,
    cause: LogbookCause | undefined,
    contextText: string | undefined,
    timeLabel: string,
    showCause: boolean
  ) {
    const hasCauseRow = !this.noIcon && !!(traceLink || (showCause && cause));
    // When icon mode has a cause row but no context, skip the standalone
    // meta/time row and put the time on the cause row instead.
    const timeInMeta = !hasCauseRow || !!contextText;
    return html`
      <div class="headline">
        <span class="entity-name">${this._renderEntity(entityId, name)}</span>
        <span class="state-value" title=${whatText ?? ""}>${whatHappened}</span>
      </div>
      ${timeInMeta
        ? this._renderMeta(
            this.noIcon && showCause ? cause : undefined,
            contextText,
            this.noIcon ? traceLink : undefined,
            timeLabel
          )
        : nothing}
      ${hasCauseRow
        ? html`<div class="meta">
            <span class="meta-main">
              ${showCause && cause ? this._renderCauseLabel(cause) : nothing}
              ${traceLink ? this._renderTraceLink(traceLink) : nothing}
            </span>
            ${!timeInMeta
              ? html`<span
                  class="time-inline"
                  role="button"
                  tabindex="0"
                  @click=${this._toggleTime}
                  @keydown=${this._timeKeydown}
                  >${timeLabel}</span
                >`
              : nothing}
          </div>`
        : nothing}
    `;
  }

  private _renderWide(
    hideName: boolean,
    entityId: string | undefined,
    name: string | undefined,
    traceLink: string | undefined,
    whatHappened: TemplateResult | string,
    whatIsValue: boolean,
    cause: LogbookCause | undefined,
    contextText: string | undefined
  ) {
    const rtl = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );
    return html`
      <div class="headline">
        <span class="headline-main"
          >${!hideName
            ? html`<span class="entity-name"
                  >${this._renderEntity(entityId, name)}</span
                >${whatHappened
                  ? whatIsValue
                    ? html`<span class="state-arrow">${rtl ? "←" : "→"}</span>`
                    : " "
                  : nothing}`
            : nothing}${whatHappened}</span
        >
      </div>
      ${contextText
        ? html`<div class="meta">
            <span class="meta-main">${contextText}</span>
          </div>`
        : nothing}
      ${cause || traceLink
        ? html`<div class="meta">
            ${cause ? this._renderCauseLabel(cause) : nothing}
            ${traceLink ? this._renderTraceLink(traceLink) : nothing}
          </div>`
        : nothing}
    `;
  }

  private _renderGlyph(glyph: LogbookGlyph) {
    if (glyph.type === "automation") {
      return html`<ha-svg-icon
        .path=${glyph.script ? mdiScriptText : mdiRobot}
      ></ha-svg-icon>`;
    }
    if (glyph.type === "state") {
      return html`<ha-state-icon
        .stateObj=${glyph.stateObj}
        .icon=${glyph.icon}
      ></ha-state-icon>`;
    }
    return html`<state-badge
      .hass=${this.hass}
      .overrideIcon=${glyph.icon}
      .overrideImage=${this._brandImage(glyph.domain)}
      .stateColor=${false}
    ></state-badge>`;
  }

  // Integration brand logo for entries with no icon/state of their own.
  private _brandImage(domain?: string): string | undefined {
    if (
      !domain ||
      this.item.icon ||
      this.item.state ||
      !isComponentLoaded(this.hass.config, domain)
    ) {
      return undefined;
    }
    return brandsUrl(
      {
        domain,
        type: "icon",
        darkOptimized: this.hass.themes?.darkMode,
      },
      this.hass.auth.data.hassUrl
    );
  }

  private _renderNode(model: LogbookItem) {
    const stateObj =
      model.glyph.type === "state" ? model.glyph.stateObj : undefined;
    const isUnavailable = this.item.state === UNAVAILABLE;
    const domain = stateObj ? computeDomain(stateObj.entity_id) : undefined;
    const isEnumDomain =
      domain === "select" ||
      domain === "input_select" ||
      (domain === "sensor" && stateObj!.attributes.device_class === "enum");
    const useGraphColor = this.graphColor || !isEnumDomain;
    const color =
      this.noIcon && !isUnavailable && this.item.state && useGraphColor
        ? computeTimelineColor(
            this.item.state,
            (this._computedStyle ??= getComputedStyle(this)),
            stateObj
          )
        : nodeColor(model.category, stateObj);
    const style = color ? styleMap({ "--node-color": color }) : nothing;
    if (this.noIcon) {
      return html`<span
        class="dot ${classMap({ unavailable: isUnavailable })}"
        style=${style}
      ></span>`;
    }
    const unavailable =
      model.glyph.type === "state" &&
      model.glyph.stateObj.state === UNAVAILABLE;
    return html`<div class="node-glyph" style=${style}>
      ${this._renderGlyph(model.glyph)}
      ${unavailable ? html`<span class="node-badge"></span>` : nothing}
    </div>`;
  }

  // Narrow rows: context on the left, then the cause reduced to just its icon
  // (name in the tooltip) sitting inline with the time.
  private _renderMeta(
    cause: LogbookCause | undefined,
    contextText: string | undefined,
    traceLink: string | undefined,
    timeLabel: string
  ) {
    return html`<div class="meta">
      <span class="meta-main">${contextText ?? nothing}</span>
      <span class="trailing">
        ${cause
          ? html`<span class="cause-icon-only" title=${cause.name}
              >${this._causeIcon(cause)}</span
            >`
          : nothing}
        ${traceLink ? this._renderTraceLink(traceLink) : nothing}
        <span
          class="time-inline"
          role="button"
          tabindex="0"
          @click=${this._toggleTime}
          @keydown=${this._timeKeydown}
          >${timeLabel}</span
        >
      </span>
    </div>`;
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      buttonLinkStyle,
      css`
        :host {
          display: block;
          --cause-icon-size: 20px;
        }

        .entry {
          position: relative;
          display: grid;
          column-gap: var(--ha-space-3);
          width: 100%;
          box-sizing: border-box;
          /* No vertical padding: the rail must reach the row edges to stay continuous between nodes. */
          padding: 0 var(--ha-space-4);
          /* compact is the default; wide and inline override below. */
          grid-auto-rows: minmax(60px, auto);
          line-height: var(--ha-line-height-normal);
          align-items: stretch;
        }

        /* Wide: node + content + time column on the right, taller to fit three lines. */
        .entry.layout-wide {
          grid-template-columns: 36px minmax(0, 1fr) 72px;
          grid-auto-rows: minmax(72px, auto);
        }

        /* Compact & inline drop the time column (time moves inline). */
        .entry.layout-compact,
        .entry.layout-inline {
          grid-template-columns: 36px minmax(0, 1fr);
        }

        .entry.layout-inline {
          grid-auto-rows: minmax(40px, auto);
        }

        /* Dot node is 10px, so its column can shrink. */
        .entry.node-dot.layout-compact,
        .entry.node-dot.layout-inline {
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
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          overflow: hidden;
          cursor: pointer;
          user-select: none;
        }

        .time:hover {
          opacity: 0.75;
        }

        .time-primary {
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
        .entry.node-dot .node {
          --rail-gap: 9px;
        }

        /* Two-line dot rows (compact): align dot to headline top.
           --dot-pos = padding-block (8px) + half normal line-height (12px) = 20px.
           Matches .content's padding-top + headline center — no dependency on
           track height, so Firefox grid-track sizing quirks don't affect it. */
        .entry.node-dot:not(.layout-inline) .node {
          --dot-pos: 20px;
          justify-content: flex-start;
          padding-top: calc(var(--dot-pos) - 5px);
        }

        .entry.node-dot:not(.layout-inline) .node::before {
          bottom: calc(100% - var(--dot-pos) + 9px);
        }

        .entry.node-dot:not(.layout-inline) .node::after {
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

        .node-glyph {
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
        .node-glyph::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-color: var(--node-color);
          opacity: 0.18;
        }

        .node-glyph > * {
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
        .entry.category-automation .node-glyph,
        .entry.category-integration .node-glyph {
          border-radius: var(--ha-border-radius-md);
        }

        .node-glyph state-badge {
          margin: 0;
          color: inherit;
        }

        .dot {
          --node-color: var(--category-color, var(--secondary-text-color));
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

        /* Compact/inline: fixed padding instead of justify-content:center so
           the dot position (--dot-pos: 20px) matches headline center regardless
           of track height — avoid the Firefox min-height / grid-track bug. */
        .entry.layout-compact .content {
          justify-content: flex-start;
          padding-block: var(--ha-space-2);
          gap: var(--ha-space-1);
        }

        .entry.layout-inline .content {
          gap: 0;
          justify-content: center;
        }

        .entry.layout-wide .content {
          padding-top: var(--ha-space-2);
          padding-bottom: var(--ha-space-2);
        }

        .headline {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          color: var(--primary-text-color);
        }

        .headline-main {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .entity-name {
          font-weight: var(--ha-font-weight-medium);
        }

        .headline > .entity-name {
          flex: 1 1 auto;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .headline > .entity-name button.link {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }

        .state-value {
          /* Don't shrink: the name (flex-shrink 1) absorbs all truncation so a
             short state stays whole. max-width still caps a long one. */
          flex: 0 0 auto;
          min-width: 0;
          max-width: 60%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: right;
        }

        .time-inline {
          flex-shrink: 0;
          line-height: 1;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          font-variant-numeric: tabular-nums;
          cursor: pointer;
          user-select: none;
        }

        .time-inline:hover {
          opacity: 0.75;
        }

        .cause-avatar {
          flex-shrink: 0;
          width: var(--cause-icon-size);
          height: var(--cause-icon-size);
          font-size: 9px;
        }

        /* Icon + time share one centered box so they align to each other,
           independent of headline/meta's text height. */
        .trailing {
          display: inline-flex;
          align-items: center;
          gap: var(--ha-space-2);
          flex-shrink: 0;
          font-size: var(--ha-font-size-s);
        }

        .cause-icon-only {
          display: inline-flex;
          align-items: center;
        }

        .meta {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
        }

        .meta-main {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* .headline-main is a flex item (blockified), so ::first-letter applies;
           .headline itself is a flex container, where it would not. */
        .entry.layout-inline .headline-main:first-letter {
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
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
        }

        .cause-icon {
          flex-shrink: 0;
          --mdc-icon-size: var(--cause-icon-size);
          color: var(--secondary-text-color);
        }

        .cause-name {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--primary-text-color);
          line-height: var(--cause-icon-size);
        }

        /* The trace link sits after the cause; it never shrinks, so a long
           cause truncates instead. */
        .view-trace {
          flex-shrink: 0;
          color: var(--primary-color);
          text-decoration: none;
        }

        .view-trace:hover {
          text-decoration: underline;
        }

        /* Entity names read as the subject, not a wall of blue links — the
           colored node is the scan anchor. */
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
