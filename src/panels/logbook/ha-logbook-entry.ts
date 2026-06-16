import { mdiPuzzle, mdiRobot, mdiScriptText } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { computeTimelineColor } from "../../components/chart/timeline-color";
import { computeDomain } from "../../common/entity/compute_domain";
import { formatTimeWithSeconds } from "../../common/datetime/format_time";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/entity/state-badge";
import "../../components/ha-relative-time";
import "../../components/ha-domain-icon";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
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
  LogbookCauseType,
  LogbookGlyph,
  LogbookItem,
  LogbookScope,
  LogbookValue,
} from "./logbook-entry-model";
import {
  computeLogbookItem,
  nodeColor,
  TRIGGER_DOMAINS,
} from "./logbook-entry-model";

type EntryLayout = "timeline" | "list" | "inline";

interface LogbookRenderItem extends LogbookItem {
  traceLink: string | undefined;
  renderedTime: TemplateResult | string;
  renderedValue: TemplateResult | string;
}

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

  @property({ type: Boolean, attribute: "show-cause" }) public showCause =
    false;

  // Reading custom properties forces a style recalc, costly to repeat per row
  // while scrolling — resolve once and cache.
  private _computedStyle?: CSSStyleDeclaration;

  protected render() {
    const entry = this.item;
    const seenEntityIds: string[] = [];

    const item = computeLogbookItem(this.hass, entry, {
      scope: this.scope,
      userIdToName: this.userIdToName,
    });

    const traceContext =
      entry.domain &&
      TRIGGER_DOMAINS.includes(entry.domain) &&
      entry.context_id &&
      entry.context_id in this.traceContexts
        ? this.traceContexts[entry.context_id]
        : undefined;
    const traceLink = traceContext
      ? `/config/${traceContext.domain}/trace/${traceContext.item_id}?run_id=${traceContext.run_id}`
      : undefined;

    const hideName = this.scope === "entity";
    const layout: EntryLayout =
      !this.narrow && !this.noIcon ? "timeline" : hideName ? "inline" : "list";
    const node = layout === "timeline" ? "icon" : "dot";

    const when = new Date(item.when);
    const renderedTime = this.showRelative
      ? html`<ha-relative-time
          .datetime=${when}
          format="short"
        ></ha-relative-time>`
      : formatTimeWithSeconds(when, this.hass.locale, this.hass.config);

    const ctx: LogbookRenderItem = {
      ...item,
      traceLink,
      renderedTime,
      renderedValue: this._renderValue(item.value, seenEntityIds, !!traceLink),
    };

    return html`
      <div
        class="entry ${classMap({
          [`layout-${layout}`]: true,
          [`node-${node}`]: true,
          "last-of-day": this.lastOfDay,
          [`category-${ctx.category}`]: true,
        })}"
      >
        ${layout === "timeline"
          ? html`<div
              class="time"
              role="button"
              tabindex="0"
              @click=${this._toggleTime}
              @keydown=${this._timeKeydown}
            >
              <span class="time-content">${renderedTime}</span>
            </div>`
          : nothing}
        <div
          class="node ${classMap({
            "rail-trim-top": this.firstOfDay,
            "rail-trim-bottom": this.lastOfDay,
          })}"
        >
          ${this._renderNode(ctx, layout)}
        </div>
        <div class="content">
          ${layout === "timeline"
            ? this._renderTimeline(ctx)
            : layout === "list"
              ? this._renderList(ctx)
              : this._renderInline(ctx)}
        </div>
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

  private _handleTraceClick(ev: MouseEvent) {
    // Let modified clicks open in a new tab; otherwise route in-app.
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey) {
      return;
    }
    ev.preventDefault();
    navigate((ev.currentTarget as HTMLAnchorElement).getAttribute("href")!);
    fireEvent(this, "closed");
  }

  private _entityClicked(ev: Event) {
    const entityId = (ev.currentTarget as any).entityId;
    if (!entityId) return;
    ev.preventDefault();
    ev.stopPropagation();
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _renderTimeChip(renderedTime: TemplateResult | string) {
    return html`<span
      class="time-chip"
      role="button"
      tabindex="0"
      @click=${this._toggleTime}
      @keydown=${this._timeKeydown}
      >${renderedTime}</span
    >`;
  }

  private _renderTrailing(
    cause: LogbookCause | undefined,
    traceLink: string | undefined,
    renderedTime: TemplateResult | string
  ) {
    return html`<span class="trailing">
      ${cause
        ? html`<span class="cause-badge" title=${cause.name}
            >${this._renderCauseIcon(cause)}</span
          >`
        : nothing}
      ${traceLink ? this._renderTraceLink(traceLink) : nothing}
      ${this._renderTimeChip(renderedTime)}
    </span>`;
  }

  private _renderTraceLink(traceLink: string) {
    return html`<a
      class="trace-link"
      href=${traceLink}
      @click=${this._handleTraceClick}
      >${this.hass.localize("ui.components.logbook.view_trace")}</a
    >`;
  }

  private _renderTimeline(ctx: LogbookRenderItem) {
    const hideName = this.scope === "entity";
    const rtl = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );
    const valueIsState = ctx.value?.type === "state";
    const causePhrase = ctx.cause
      ? this._renderCausePhrase(ctx.cause)
      : undefined;
    return html`
      <div class="primary">
        <span class="primary-text"
          >${!hideName
            ? html`<span class="subject"
                  >${this._renderEntity(ctx.entityId, ctx.name)}</span
                >${ctx.renderedValue
                  ? valueIsState
                    ? html`<span class="arrow">${rtl ? "←" : "→"}</span>`
                    : " "
                  : nothing}`
            : nothing}${ctx.renderedValue}</span
        >
      </div>
      ${ctx.context
        ? html`<div class="secondary">
            <span class="secondary-text">${ctx.context}</span>
          </div>`
        : nothing}
      ${causePhrase || ctx.traceLink
        ? html`<div class="secondary">
            ${causePhrase
              ? html`<span class="cause-phrase">${causePhrase}</span>`
              : nothing}
            ${causePhrase && ctx.traceLink ? html`·` : nothing}
            ${ctx.traceLink ? this._renderTraceLink(ctx.traceLink) : nothing}
          </div>`
        : nothing}
    `;
  }

  private _renderList(ctx: LogbookRenderItem) {
    const cause =
      this.showCause || ctx.category === "entity" ? ctx.cause : undefined;
    const trailingTrace = this.showCause ? undefined : ctx.traceLink;
    const thirdLineTrace = this.showCause ? ctx.traceLink : undefined;
    const showThirdLine = this.showCause && (cause || thirdLineTrace);
    return html`
      <div class="primary">
        <span class="subject"
          >${this._renderEntity(ctx.entityId, ctx.name)}</span
        >
        <span class="value" title=${ctx.value?.text ?? ""}
          >${ctx.renderedValue}</span
        >
      </div>
      <div class="secondary">
        <span class="secondary-text">${ctx.context ?? nothing}</span>
        ${this._renderTrailing(
          showThirdLine ? undefined : cause,
          trailingTrace,
          ctx.renderedTime
        )}
      </div>
      ${showThirdLine
        ? html`<div class="secondary">
            ${this._renderListCauseLine(cause, thirdLineTrace)}
          </div>`
        : nothing}
    `;
  }

  private _renderListCauseLine(
    cause: LogbookCause | undefined,
    traceLink: string | undefined
  ) {
    if (!cause) {
      return traceLink ? this._renderTraceLink(traceLink) : nothing;
    }
    const { localize } = this.hass;
    if (cause.entityId) {
      const prefixMap: Partial<Record<LogbookCauseType, string>> = {
        automation: localize("ui.components.logbook.cause.by_automation", {
          name: "",
        }),
        script: localize("ui.components.logbook.cause.by_script", {
          name: "",
        }),
        state: localize("ui.components.logbook.cause.by_state_change", {
          name: "",
        }),
      };
      const prefix = prefixMap[cause.type];
      return html`
        ${prefix ? html`<span class="cause-prefix">${prefix}</span>` : nothing}
        <button
          class="link cause-entity"
          @click=${this._entityClicked}
          .entityId=${cause.entityId}
        >
          ${cause.name}
        </button>
        ${traceLink ? this._renderTraceLink(traceLink) : nothing}
      `;
    }
    return html`
      <span class="secondary-text">${this._renderCausePhrase(cause)}</span>
      ${traceLink ? this._renderTraceLink(traceLink) : nothing}
    `;
  }

  private _renderInline(ctx: LogbookRenderItem) {
    return html`
      <div class="primary">
        <span class="primary-text">${ctx.renderedValue}</span>
        ${this._renderTrailing(
          ctx.category === "entity" ? ctx.cause : undefined,
          ctx.traceLink,
          ctx.renderedTime
        )}
      </div>
    `;
  }

  private _renderValue(
    value: LogbookValue | undefined,
    seenEntityIds: string[],
    noLink: boolean
  ): TemplateResult | string {
    if (!value) {
      return "";
    }
    return value.type === "message"
      ? this._formatMessageWithPossibleEntity(value.text, seenEntityIds, noLink)
      : value.text;
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

  private _renderCausePhrase(cause: LogbookCause): TemplateResult | string {
    const { localize } = this.hass;
    const nameEl = cause.entityId
      ? html`<button
          class="link"
          @click=${this._entityClicked}
          .entityId=${cause.entityId}
        >
          ${cause.name}
        </button>`
      : cause.name;
    switch (cause.type) {
      case "user":
        return localize("ui.components.logbook.cause.by", {
          name: cause.name,
        });
      case "automation":
        return cause.entityId
          ? html`${localize("ui.components.logbook.cause.by_automation", {
              name: "",
            })}${nameEl}`
          : localize("ui.components.logbook.cause.by_automation", {
              name: cause.name,
            });
      case "script":
        return cause.entityId
          ? html`${localize("ui.components.logbook.cause.by_script", {
              name: "",
            })}${nameEl}`
          : localize("ui.components.logbook.cause.by_script", {
              name: cause.name,
            });
      case "state":
        return cause.entityId
          ? html`${localize("ui.components.logbook.cause.by_state_change", {
              name: "",
            })}${nameEl}`
          : localize("ui.components.logbook.cause.by_state_change", {
              name: cause.name,
            });
      case "scheduled":
        return localize("ui.components.logbook.cause.scheduled");
      case "homeassistant":
        return cause.name;
      case "integration":
        return localize("ui.components.logbook.cause.via", {
          name: cause.name,
        });
      default:
        return cause.name;
    }
  }

  private _renderCauseIcon(cause: LogbookCause) {
    if (cause.type === "user") {
      return html`<ha-user-badge
        class="cause-icon cause-avatar"
        .user=${{ id: cause.userId!, name: cause.name } as User}
      ></ha-user-badge>`;
    }
    if (cause.type === "automation") {
      return html`<ha-svg-icon
        class="cause-icon"
        .path=${mdiRobot}
      ></ha-svg-icon>`;
    }
    if (cause.type === "script") {
      return html`<ha-svg-icon
        class="cause-icon"
        .path=${mdiScriptText}
      ></ha-svg-icon>`;
    }
    if (cause.type === "state") {
      return nothing;
    }
    if (cause.brandDomain) {
      return html`<ha-domain-icon
        class="cause-icon"
        .domain=${cause.brandDomain}
        brand-fallback
      ></ha-domain-icon>`;
    }
    return html`<ha-svg-icon
      class="cause-icon"
      .path=${mdiPuzzle}
    ></ha-svg-icon>`;
  }

  private _formatMessageWithPossibleEntity(
    message: string,
    seenEntities: string[],
    noLink?: boolean
  ) {
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
    return message;
  }

  private _renderNode(item: LogbookItem, layout: EntryLayout) {
    const stateObj =
      item.glyph.type === "state" ? item.glyph.stateObj : undefined;
    const isUnavailable = this.item.state === UNAVAILABLE;
    const domain = stateObj ? computeDomain(stateObj.entity_id) : undefined;
    const isEnumDomain =
      domain === "select" ||
      domain === "input_select" ||
      (domain === "sensor" && stateObj!.attributes.device_class === "enum");
    const useGraphColor = this.graphColor || !isEnumDomain;
    const color =
      layout === "inline" && !isUnavailable && this.item.state && useGraphColor
        ? computeTimelineColor(
            this.item.state,
            (this._computedStyle ??= getComputedStyle(this)),
            stateObj
          )
        : nodeColor(item.category, stateObj);
    const style = color ? styleMap({ "--node-color": color }) : nothing;
    if (layout !== "timeline") {
      return html`<span
        class="dot ${classMap({ unavailable: isUnavailable })}"
        style=${style}
      ></span>`;
    }
    const unavailable =
      item.glyph.type === "state" && item.glyph.stateObj.state === UNAVAILABLE;
    return html`<div class="node-glyph" style=${style}>
      ${this._renderGlyph(item.glyph)}
      ${unavailable ? html`<span class="node-badge"></span>` : nothing}
    </div>`;
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
          grid-auto-rows: minmax(60px, auto);
          line-height: var(--ha-line-height-normal);
          align-items: stretch;
        }

        .entry.layout-timeline {
          grid-template-columns: 72px 36px minmax(0, 1fr);
          grid-auto-rows: minmax(72px, auto);
        }

        .entry.layout-list,
        .entry.layout-inline {
          grid-template-columns: 36px minmax(0, 1fr);
        }

        .entry.layout-inline {
          grid-auto-rows: minmax(40px, auto);
        }

        /* Dot node is 10px, so its column can shrink. */
        .entry.node-dot.layout-list,
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
          align-items: stretch;
          justify-content: center;
          text-align: end;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          overflow: hidden;
          cursor: pointer;
          user-select: none;
        }

        .time:hover {
          opacity: 0.75;
        }

        .time-content {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
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

        /* Two-line dot rows (list): align dot to headline top.
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

        .node.rail-trim-top::before {
          display: none;
        }

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

        /* List/inline: fixed padding instead of justify-content:center so
           the dot position (--dot-pos: 20px) matches headline center regardless
           of track height — avoid the Firefox min-height / grid-track bug. */
        .entry.layout-list .content {
          justify-content: flex-start;
          padding-block: var(--ha-space-2);
          gap: var(--ha-space-1);
        }

        .entry.layout-inline .content {
          gap: 0;
          justify-content: center;
        }

        .entry.layout-timeline .content {
          padding-block: var(--ha-space-2);
        }

        .primary {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          color: var(--primary-text-color);
        }

        .entry.layout-inline .primary-text:first-letter {
          text-transform: capitalize;
        }

        .primary-text {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .primary > .subject {
          flex: 1 1 auto;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: var(--ha-font-weight-medium);
        }

        .primary > .subject button.link {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }

        .subject {
          font-weight: var(--ha-font-weight-medium);
        }

        .value {
          /* Don't shrink: the subject absorbs all truncation so a short state
             stays whole. max-width still caps a long one. */
          flex: 0 0 auto;
          max-width: 60%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: right;
        }

        .arrow {
          color: var(--disabled-color);
          padding: 0 2px;
        }

        .secondary {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
        }

        .secondary-text {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .trailing {
          display: inline-flex;
          align-items: center;
          gap: var(--ha-space-2);
          flex-shrink: 0;
          font-size: var(--ha-font-size-s);
        }

        .cause-badge {
          display: inline-flex;
          align-items: center;
        }

        ha-relative-time {
          display: contents;
        }

        .time-chip {
          flex-shrink: 0;
          line-height: 1;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          font-variant-numeric: tabular-nums;
          cursor: pointer;
          user-select: none;
        }

        .time-chip:hover {
          opacity: 0.75;
        }

        .cause-icon {
          flex-shrink: 0;
          --mdc-icon-size: var(--cause-icon-size);
          color: var(--secondary-text-color);
        }

        .cause-avatar {
          flex-shrink: 0;
          width: var(--cause-icon-size);
          height: var(--cause-icon-size);
          font-size: 9px;
        }

        .cause-prefix {
          flex-shrink: 0;
          white-space: nowrap;
        }

        .cause-entity {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: var(--ha-font-weight-medium);
          color: var(--primary-text-color);
        }

        /* The trace link sits after the cause; it never shrinks, so a long
           cause truncates instead. */
        .trace-link {
          flex-shrink: 0;
          color: var(--primary-color);
          text-decoration: none;
        }

        .trace-link:hover {
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
