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
import { sameDay } from "./logbook-entry-model";
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

  @property({ type: Boolean, attribute: "no-detail" }) public noDetail = false;

  @property({ type: String, attribute: "name-detail" })
  public nameDetail?: LogbookNameDetail;

  // @ts-ignore
  @restoreScroll(".container") private _savedScrollPos?: number;

  // Index of the row at the top of the list, which the floating date header
  // takes its day from.
  @state() private _firstVisibleIndex = 0;

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
      changedProps.has("traceContexts") ||
      changedProps.has("noDetail") ||
      changedProps.has("userIdToName") ||
      changedProps.has("systemUserIds") ||
      changedProps.has("_firstVisibleIndex" as never) ||
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

    // The virtualizer positions its rows, so an inline date header cannot
    // stick. Instead one header floats above the list and follows the day of
    // the row that is at the top.
    const floatingEntry = this.virtualize
      ? this.entries[this._firstVisibleIndex]
      : undefined;

    return html`
      <div
        class="container ha-scrollbar"
        @scroll=${this._saveScrollPos}
        @logbook-entry-selected=${this._handleEntrySelected}
      >
        ${
          floatingEntry
            ? html`<h4 class="date floating-date">
                ${this._formatDateHeader(new Date(floatingEntry.when * 1000))}
              </h4>`
            : nothing
        }
        ${
          this.virtualize
            ? html`<lit-virtualizer
                @visibilityChanged=${this._visibilityChanged}
                scroller
                class="ha-scrollbar"
                .items=${this.entries}
                .renderItem=${
                  this._getRenderRow(
                    this.userIdToName,
                    this.systemUserIds
                  ) as any
                }
              >
              </lit-virtualizer>`
            : this.entries.map((item, index) => this._renderItem(item, index))
        }
      </div>
    `;
  }

  // Memoized on every input the rows render from, so the virtualizer sees a
  // new renderItem and refreshes already-rendered rows when one changes.
  private _getRenderRow = memoizeOne(
    (_userIdToName: Record<string, string>, _systemUserIds: Set<string>) =>
      (item: LogbookEntry, index: number) =>
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
          .userIdToName=${this.userIdToName}
          .systemUserIds=${this.systemUserIds}
          .narrow=${this.narrow}
          .noIcon=${this.noIcon}
          .graphColor=${this.graphColor}
          .nameDetail=${this.nameDetail}
          .firstOfDay=${firstOfDay}
          .lastOfDay=${lastOfDay}
          .showCause=${this.showCause}
          .noDetail=${this.noDetail}
        ></ha-logbook-entry>
      </div>
    `;
  };

  private _handleEntrySelected(ev: HASSDomEvent<LogbookEntrySelectedDetail>) {
    ev.stopPropagation();
    showLogbookDetailDialog(this, {
      entry: ev.detail.item,
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
    this._firstVisibleIndex = Math.max(0, e.first);
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

        /* Floats above the virtualized list and lines up with the inline date
           headers, so they scroll underneath it. */
        .floating-date {
          position: absolute;
          top: 0;
          inset-inline: 0;
          z-index: 2;
          margin: 0;
          padding-bottom: var(--ha-space-2);
          background-color: var(--card-background-color);
        }

        .no-entries {
          text-align: center;
          color: var(--secondary-text-color);
        }

        .container {
          position: relative;
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
