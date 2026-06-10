import type { VisibilityChangedEvent } from "@lit-labs/virtualizer";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, eventOptions, property } from "lit/decorators";
import { formatDate } from "../../common/datetime/format_date";
import { restoreScroll } from "../../common/decorators/restore-scroll";
import { fireEvent } from "../../common/dom/fire_event";
import type { LogbookEntry } from "../../data/logbook";
import type { TraceContexts } from "../../data/trace";
import { haStyle, haStyleScrollbar } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import type { HomeAssistant } from "../../types";
import "./ha-logbook-entry";
import type { LogbookScope } from "./logbook-entry-model";
import { sameDay } from "./logbook-entry-model";

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

  @property({ attribute: false }) public traceContexts: TraceContexts = {};

  @property({ attribute: false }) public entries: LogbookEntry[] = [];

  @property({ type: Boolean, attribute: "narrow" }) public narrow = false;

  @property({ type: Boolean, attribute: "virtualize", reflect: true })
  public virtualize = false;

  @property({ type: Boolean, attribute: "no-icon" }) public noIcon = false;

  @property({ type: Boolean, attribute: "no-name" }) public noName = false;

  @property({ attribute: false }) public scope?: LogbookScope;

  // @ts-ignore
  @restoreScroll(".container") private _savedScrollPos?: number;

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (!this.hasUpdated) {
      // Names of integration-provided triggers (component.<domain>.triggers.*).
      this.hass.loadBackendTranslation("triggers");
    }
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
      <div class="container ha-scrollbar" @scroll=${this._saveScrollPos}>
        ${this.virtualize
          ? html`<lit-virtualizer
              @visibilityChanged=${this._visibilityChanged}
              scroller
              class="ha-scrollbar"
              .items=${this.entries}
              .renderItem=${this._renderRow}
            >
            </lit-virtualizer>`
          : this.entries.map((item, index) => this._renderRow(item, index))}
      </div>
    `;
  }

  private _renderRow = (item: LogbookEntry, index: number) => {
    if (!item) {
      return nothing;
    }
    const previous = this.entries[index - 1] as LogbookEntry | undefined;
    const next = this.entries[index + 1] as LogbookEntry | undefined;
    const firstOfDay = index === 0 || !sameDay(item, previous);
    const lastOfDay = index === this.entries.length - 1 || !sameDay(item, next);

    // The virtualizer positions one element per item, so the date header and
    // the row share a single wrapper.
    return html`
      <div class="entry-container">
        ${firstOfDay
          ? html`<h4 class="date">
              ${formatDate(
                new Date(item.when * 1000),
                this.hass.locale,
                this.hass.config
              )}
            </h4>`
          : nothing}
        <ha-logbook-entry
          .hass=${this.hass}
          .item=${item}
          .userIdToName=${this.userIdToName}
          .traceContexts=${this.traceContexts}
          .narrow=${this.narrow}
          .noIcon=${this.noIcon}
          .noName=${this.noName}
          .scope=${this.scope}
          .firstOfDay=${firstOfDay}
          .lastOfDay=${lastOfDay}
        ></ha-logbook-entry>
      </div>
    `;
  };

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

        /* The virtualizer positions items shrink-to-fit, so force full width. */
        .entry-container {
          width: 100%;
        }

        .date {
          margin: var(--ha-space-2) 0 0;
          padding: var(--ha-space-2) var(--ha-space-4) 0;
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
