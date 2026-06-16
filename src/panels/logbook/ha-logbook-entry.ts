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
import { relativeTime } from "../../common/datetime/relative_time";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/entity/state-badge";
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
  LogbookCauseKind,
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

type EntryLayout = "timeline" | "list" | "inline";

interface EntryRenderCtx {
  model: LogbookItem;
  traceLink: string | undefined;
  timeLabel: string;
  whatHappened: TemplateResult | string;
  hideName: boolean;
  hasCause: boolean;
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

    const hideName = this.scope === "entity";
    const layout: EntryLayout =
      !this.narrow && !this.noIcon ? "timeline" : hideName ? "inline" : "list";
    const node = layout === "timeline" ? "icon" : "dot";

    const when = new Date(model.when);
    const timeLabel = this.showRelative
      ? relativeTime(when, this.hass.locale, undefined, true, "short")
      : formatTimeWithSeconds(when, this.hass.locale, this.hass.config);

    const ctx: EntryRenderCtx = {
      model,
      traceLink,
      timeLabel,
      whatHappened: this._renderWhat(model.what, seenEntityIds, !!traceLink),
      hideName,
      hasCause: model.category === "entity",
    };

    return html`
      <div
        class="entry ${classMap({
          [`layout-${layout}`]: true,
          [`node-${node}`]: true,
          "last-of-day": this.lastOfDay,
          [`category-${model.category}`]: true,
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
              <span class="time-primary">${timeLabel}</span>
            </div>`
          : nothing}
        <div
          class="node ${classMap({
            "rail-trim-top": this.firstOfDay,
            "rail-trim-bottom": this.lastOfDay,
          })}"
        >
          ${this._renderNode(model, layout)}
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

  private _renderTimeChip(timeLabel: string) {
    return html`<span
      class="time-chip"
      role="button"
      tabindex="0"
      @click=${this._toggleTime}
      @keydown=${this._timeKeydown}
      >${timeLabel}</span
    >`;
  }

  private _renderTrailing(
    cause: LogbookCause | undefined,
    traceLink: string | undefined,
    timeLabel: string
  ) {
    return html`<span class="trailing">
      ${cause
        ? html`<span class="cause-badge" title=${cause.name}
            >${this._causeIcon(cause)}</span
          >`
        : nothing}
      ${traceLink ? this._renderTraceLink(traceLink) : nothing}
      ${this._renderTimeChip(timeLabel)}
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

  private _renderTimeline(ctx: EntryRenderCtx) {
    const { model, traceLink, hideName } = ctx;
    const rtl = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );
    const whatIsState = model.what?.kind === "state";
    const causePhrase = model.cause
      ? this._causePhraseText(model.cause)
      : undefined;
    return html`
      <div class="primary">
        <span class="primary-text"
          >${!hideName
            ? html`<span class="subject"
                  >${this._renderEntity(model.entityId, model.name)}</span
                >${ctx.whatHappened
                  ? whatIsState
                    ? html`<span class="arrow">${rtl ? "←" : "→"}</span>`
                    : " "
                  : nothing}`
            : nothing}${ctx.whatHappened}</span
        >
      </div>
      ${model.context
        ? html`<div class="secondary">
            <span class="secondary-text">${model.context}</span>
          </div>`
        : nothing}
      ${causePhrase || traceLink
        ? html`<div class="secondary">
            ${causePhrase
              ? html`<span class="cause-phrase">${causePhrase}</span>`
              : nothing}
            ${causePhrase && traceLink ? html`·` : nothing}
            ${traceLink ? this._renderTraceLink(traceLink) : nothing}
          </div>`
        : nothing}
    `;
  }

  private _renderList(ctx: EntryRenderCtx) {
    const { model, traceLink, timeLabel, hasCause } = ctx;
    const cause = this.showCause || hasCause ? model.cause : undefined;
    const trailingTrace = this.showCause ? undefined : traceLink;
    const thirdLineTrace = this.showCause ? traceLink : undefined;
    const showThirdLine = this.showCause && (cause || thirdLineTrace);
    return html`
      <div class="primary">
        <span class="subject"
          >${this._renderEntity(model.entityId, model.name)}</span
        >
        <span class="value" title=${model.what?.text ?? ""}
          >${ctx.whatHappened}</span
        >
      </div>
      <div class="secondary">
        <span class="secondary-text">${model.context ?? nothing}</span>
        ${this._renderTrailing(
          showThirdLine ? undefined : cause,
          trailingTrace,
          timeLabel
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
    // Causes with an entity name: fixed prefix + truncatable entity name.
    if (cause.entityId) {
      const prefixMap: Partial<Record<LogbookCauseKind, string>> = {
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
      const prefix = prefixMap[cause.kind];
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
    // Simple phrase (no clickable entity): one truncatable span.
    return html`
      <span class="secondary-text">${this._causePhraseText(cause)}</span>
      ${traceLink ? this._renderTraceLink(traceLink) : nothing}
    `;
  }

  private _renderInline(ctx: EntryRenderCtx) {
    const { model, traceLink, timeLabel, hasCause } = ctx;
    return html`
      <div class="primary">
        <span class="primary-text">${ctx.whatHappened}</span>
        ${this._renderTrailing(
          hasCause ? model.cause : undefined,
          traceLink,
          timeLabel
        )}
      </div>
    `;
  }

  private _renderWhat(
    what: LogbookWhat | undefined,
    seenEntityIds: string[],
    noLink: boolean
  ): TemplateResult | string {
    if (!what) {
      return "";
    }
    return what.kind === "message"
      ? this._formatMessageWithPossibleEntity(
          what.text,
          seenEntityIds,
          undefined,
          noLink
        )
      : what.text;
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

  private _causePhraseText(cause: LogbookCause): TemplateResult | string {
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
    switch (cause.kind) {
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

  private _causeIcon(cause: LogbookCause) {
    if (cause.kind === "user") {
      return html`<ha-user-badge
        class="cause-icon cause-avatar"
        .user=${this._causeUser(cause.userId!, cause.name)}
      ></ha-user-badge>`;
    }
    if (cause.kind === "automation") {
      return html`<ha-svg-icon
        class="cause-icon"
        .path=${mdiRobot}
      ></ha-svg-icon>`;
    }
    if (cause.kind === "script") {
      return html`<ha-svg-icon
        class="cause-icon"
        .path=${mdiScriptText}
      ></ha-svg-icon>`;
    }
    if (cause.kind === "state") {
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

  private _causeUser(id: string, name: string): User {
    return { id, name } as User;
  }

  private _formatMessageWithPossibleEntity(
    message: string,
    seenEntities: string[],
    possibleEntity?: string,
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

  private _renderNode(model: LogbookItem, layout: EntryLayout) {
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
      layout === "inline" && !isUnavailable && this.item.state && useGraphColor
        ? computeTimelineColor(
            this.item.state,
            (this._computedStyle ??= getComputedStyle(this)),
            stateObj
          )
        : nodeColor(model.category, stateObj);
    const style = color ? styleMap({ "--node-color": color }) : nothing;
    if (layout !== "timeline") {
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
          /* list is the default; timeline and inline override below. */
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
          padding-top: var(--ha-space-2);
          padding-bottom: var(--ha-space-2);
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
          min-width: 0;
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

        /* Icon + time share one centered box so they align to each other,
           independent of primary/secondary text height. */
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

        /* Inline-flex so the icon/avatar is centered against the cause name
           (custom-element icons have an unreliable baseline). */
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

        .cause-avatar {
          flex-shrink: 0;
          width: var(--cause-icon-size);
          height: var(--cause-icon-size);
          font-size: 9px;
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

        /* List cause line: fixed prefix + truncatable entity name */
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
