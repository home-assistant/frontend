import type { VisibilityChangedEvent } from "@lit-labs/virtualizer";
import memoizeOne from "memoize-one";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators";
import { formatDate } from "../../common/datetime/format_date";
import { capitalizeFirstLetter } from "../../common/string/capitalize-first-letter";
import { restoreScroll } from "../../common/decorators/restore-scroll";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import type { LogbookEntry } from "../../data/logbook";
import type { TraceContexts } from "../../data/trace";
import { haStyle, haStyleScrollbar } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import type { HomeAssistant } from "../../types";
import "./ha-logbook-entry";
import type { LogbookEntrySelectedDetail } from "./ha-logbook-entry";
import type { LogbookNameDetail } from "./logbook-entry-model";
import { findPreviousState, sameDay } from "./logbook-entry-model";
import { showLogbookDetailDialog } from "./show-dialog-logbook-detail";

declare global {
  interface HASSDomEvents {
    "hass-logbook-live": { enable: boolean };
  }
}

@customElement("ha-logbook-renderer")
class HaLogbookRenderer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public userIdToName: Record<string, string> =
    {};

  @property({ attribute: false }) public systemUserIds = new Set<string>();

  // Not rendered by rows; read at click time and handed to the detail dialog.
  @property({ attribute: false }) public traceContexts: TraceContexts = {};

  @property({ attribute: false }) public entries: LogbookEntry[] = [];

  @property({ type: Boolean, attribute: "narrow" }) public narrow = false;

  @property({ type: Boolean, attribute: "virtualize", reflect: true })
  public virtualize = false;

  @property({ type: Boolean, attribute: "no-icon" }) public noIcon = false;

  @property({ type: Boolean, attribute: "graph-color" }) public graphColor =
    false;

  @property({ type: Boolean, attribute: "show-cause" }) public showCause =
    false;

  @property({ type: Boolean, attribute: "no-row-click" }) public noRowClick =
    false;

  @property({ type: String, attribute: "name-detail" })
  public nameDetail?: LogbookNameDetail;

  // @ts-ignore
  @restoreScroll(".container") private _savedScrollPos?: number;

  @state() private _showRelative = false;

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (
      (!this.hasUpdated && this.virtualize) ||
      (changedProps.has("virtualize") && this.virtualize)
    ) {
      this.hass.loadBackendTranslation("services");
      this.hass.loadBackendTranslation("title");
      loadVirtualizer();
    }
  }

  protected shouldUpdate(changedProps: PropertyValues<this>) {
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const languageChanged =
      oldHass === undefined ||
      oldHass.locale !== this.hass.locale ||
      oldHass.localize !== this.hass.localize;

    return (
      changedProps.has("entries") ||
      changedProps.has("noRowClick") ||
      changedProps.has("_showRelative" as never) ||
      languageChanged
    );
  }

  protected render() {
    if (!this.entries?.length) {
      return html`
        <div class="container no-entries">
          ${this.hass.localize("ui.components.logbook.entries_not_found")}
        </div>
      `;
    }

    return html`
      <div
        class="container ha-scrollbar"
        @scroll=${this._saveScrollPos}
        @logbook-toggle-time=${this._handleToggleTime}
        @logbook-entry-selected=${this._handleEntrySelected}
      >
        ${
          this.virtualize
            ? html`<lit-virtualizer
                @visibilityChanged=${this._visibilityChanged}
                scroller
                class="ha-scrollbar"
                .items=${this.entries}
                .renderItem=${this._getRenderRow(this._showRelative) as any}
              >
              </lit-virtualizer>`
            : this.entries.map((item, index) => this._renderItem(item, index))
        }
      </div>
    `;
  }

  private _getRenderRow = memoizeOne(
    (_showRelative: boolean) => (item: LogbookEntry, index: number) =>
      this._renderItem(item, index)
  );

  private _renderItem = (item: LogbookEntry, index: number) => {
    const previous = this.entries[index - 1] as LogbookEntry | undefined;
    const next = this.entries[index + 1] as LogbookEntry | undefined;
    const firstOfDay = index === 0 || !sameDay(item, previous);
    const lastOfDay = index === this.entries.length - 1 || !sameDay(item, next);

    // The virtualizer positions one element per item, so the date header and
    // the row share a single wrapper.
    return html`
      <div class="entry-container">
        ${
          firstOfDay
            ? html`<h4 class="date">
                ${this._formatDateHeader(new Date(item.when * 1000))}
              </h4>`
            : nothing
        }
        <ha-logbook-entry
          .hass=${this.hass}
          .item=${item}
          .index=${index}
          .userIdToName=${this.userIdToName}
          .systemUserIds=${this.systemUserIds}
          .narrow=${this.narrow}
          .noIcon=${this.noIcon}
          .graphColor=${this.graphColor}
          .nameDetail=${this.nameDetail}
          .firstOfDay=${firstOfDay}
          .lastOfDay=${lastOfDay}
          .showRelative=${this._showRelative}
          .showCause=${this.showCause}
          .noRowClick=${this.noRowClick}
        ></ha-logbook-entry>
      </div>
    `;
  };

  private _handleToggleTime() {
    this._showRelative = !this._showRelative;
  }

  private _handleEntrySelected(ev: HASSDomEvent<LogbookEntrySelectedDetail>) {
    ev.stopPropagation();
    const { item } = ev.detail;
    let index = ev.detail.index;
    if (this.entries[index] !== item) {
      // A recycled virtualizer row can deliver a stale index.
      index = this.entries.indexOf(item);
    }
    showLogbookDetailDialog(this, {
      entry: item,
      previousState:
        index >= 0 ? findPreviousState(this.entries, index) : undefined,
      traceContexts: this.traceContexts,
      userIdToName: this.userIdToName,
      systemUserIds: this.systemUserIds,
    });
  }

  private _formatDateHeader(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
    const fullDate = formatDate(date, this.hass.locale, this.hass.config);
    if (diffDays === 0 || diffDays === 1) {
      const rtf = new Intl.RelativeTimeFormat(this.hass.locale.language, {
        numeric: "auto",
      });
      const rel = rtf.format(diffDays === 0 ? 0 : -1, "day");
      return `${capitalizeFirstLetter(rel)} · ${fullDate}`;
    }
    return fullDate;
  }

  @eventOptions({ passive: true })
  private _saveScrollPos(e: Event) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
  }

  @eventOptions({ passive: true })
  private _visibilityChanged(e: VisibilityChangedEvent) {
    fireEvent(this, "hass-logbook-live", {
      enable: e.first === 0,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleScrollbar,
      css`
        :host([virtualize]) {
          display: block;
          height: 100%;
        }

        .entry-container {
          width: 100%;
        }

        .date {
          margin: var(--ha-space-2) 0 0;
          padding: var(--ha-space-2)
            var(--logbook-horizontal-padding, var(--ha-space-4)) 0;
          font-weight: var(--ha-font-weight-medium);
        }

        .no-entries {
          text-align: center;
          color: var(--secondary-text-color);
        }

        .container {
          max-height: var(--logbook-max-height);
        }

        .container,
        lit-virtualizer {
          height: 100%;
        }

        lit-virtualizer {
          contain: size layout !important;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-logbook-renderer": HaLogbookRenderer;
  }
}
