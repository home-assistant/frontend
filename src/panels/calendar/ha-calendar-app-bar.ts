import { html, LitElement, css, CSSResultGroup, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@material/mwc-button";
import "../../components/ha-button-toggle-group";
import "../../components/ha-fab";
import "../../components/ha-icon-button-next";
import "../../components/ha-icon-button-prev";
import memoize from "memoize-one";
import {
  mdiRefresh,
  mdiViewAgenda,
  mdiViewDay,
  mdiViewModule,
  mdiViewWeek,
} from "@mdi/js";
import { fireEvent } from "../../common/dom/fire_event";
import { computeRTLDirection } from "../../common/util/compute_rtl";
import type {
  HomeAssistant,
  ToggleButton,
  FullCalendarView,
} from "../../types";
import { haStyle } from "../../resources/styles";
import { LocalizeFunc } from "../../common/translations/localize";

@customElement("ha-calendar-app-bar")
export class CalendarAppBar extends LitElement {
  @property() public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property() public label: string = "";

  @property() public navigation?: boolean = true;

  @property() public controls?: boolean = true;

  @property() public refresh?: boolean = true;

  @property({ attribute: false }) public views: FullCalendarView[] = [
    "dayGridMonth",
    "dayGridWeek",
    "dayGridDay",
    "listWeek",
  ];

  @property() public initialView: FullCalendarView = "dayGridMonth";

  @state() private _activeView = this.initialView;

  private _viewButtons?: ToggleButton[];

  protected render() {
    const viewToggleButtons = this._viewToggleButtons(
      this.views,
      this.hass.localize
    );
    return html`
      <div class="row">
        ${this.navigation
          ? html`
              <div class="navigation">
                ${this.label}
                <ha-icon-button-prev
                  .label=${this.hass.localize("ui.common.previous")}
                  class="prev"
                  @click=${this._handlePrev}
                >
                </ha-icon-button-prev>
                <ha-icon-button-next
                  .label=${this.hass.localize("ui.common.next")}
                  class="next"
                  @click=${this._handleNext}
                >
                </ha-icon-button-next>
                <mwc-button outlined class="today" @click=${this._handleToday}
                  >${this.hass.localize(
                    "ui.components.calendar.today"
                  )}</mwc-button
                >
              </div>
            `
          : nothing}
        ${this.controls
          ? html`
              <div class="control">
                <ha-button-toggle-group
                  .buttons=${viewToggleButtons}
                  .active=${this._activeView}
                  @value-changed=${this._handleSelectView}
                  .dir=${computeRTLDirection(this.hass)}
                ></ha-button-toggle-group>
                ${this.refresh
                  ? html`
                      <ha-icon-button
                        .path=${mdiRefresh}
                        .label=${this.hass.localize("ui.common.refresh")}
                        @click=${this._handleRefresh}
                      ></ha-icon-button>
                    `
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _handlePrev() {
    fireEvent(this, "prev");
  }

  private _handleNext() {
    fireEvent(this, "next");
  }

  private _handleToday() {
    fireEvent(this, "today");
  }

  private _handleRefresh() {
    fireEvent(this, "refresh");
  }

  private _handleSelectView(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "calendar-view-selected", ev.detail.value);
  }

  private _viewToggleButtons = memoize((views, localize: LocalizeFunc) => {
    if (!this._viewButtons) {
      this._viewButtons = [
        {
          label: localize(
            "ui.panel.lovelace.editor.card.calendar.views.dayGridMonth"
          ),
          value: "dayGridMonth",
          iconPath: mdiViewModule,
        },
        {
          label: localize(
            "ui.panel.lovelace.editor.card.calendar.views.dayGridWeek"
          ),
          value: "dayGridWeek",
          iconPath: mdiViewWeek,
        },
        {
          label: localize(
            "ui.panel.lovelace.editor.card.calendar.views.dayGridDay"
          ),
          value: "dayGridDay",
          iconPath: mdiViewDay,
        },
        {
          label: localize(
            "ui.panel.lovelace.editor.card.calendar.views.listWeek"
          ),
          value: "listWeek",
          iconPath: mdiViewAgenda,
        },
      ];
    }

    return this._viewButtons.filter((button) =>
      views.includes(button.value as FullCalendarView)
    );
  });

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        :host([narrow]) .row {
          flex-direction: column-reverse;
          width: 100%;
        }
        :host {
          --mdc-button-outline-color: currentColor;
          --primary-color: currentColor;
          --mdc-theme-primary: currentColor;
          --mdc-theme-on-primary: currentColor;
          --mdc-button-disabled-outline-color: var(--disabled-text-color);
          --mdc-button-disabled-ink-color: var(--disabled-text-color);
          --mdc-icon-button-ripple-opacity: 0.2;
        }

        .navigation {
          display: flex;
          align-items: center;
          flex-grow: 0;
          justify-content: flex-end;
          font-size: 20px;
        }
        :host([narrow]) .navigation {
          width: 100%;
        }

        .control {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        :host([narrow]) .control {
          width: 100%;
        }

        .today {
          direction: var(--direction);
          align-items: center;
          height: 38px;
        }

        .prev,
        .next {
          --mdc-icon-button-size: 48px;
        }

        ha-button-toggle-group {
          padding-left: 8px;
          direction: var(--direction);
          align-items: center;
        }

        mwc-button {
          flex-shrink: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-calendar-app-bar": CalendarAppBar;
  }
  interface HASSDomEvents {
    next: unknown;
    prev: unknown;
    today: unknown;
    "calendar-view-selected": FullCalendarView;
    refresh: unknown;
  }
}
