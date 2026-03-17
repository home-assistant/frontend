import "@home-assistant/webawesome/dist/components/popover/popover";
import { consume, type ContextType } from "@lit/context";
import { mdiCalendar } from "@mdi/js";
import "cally";
import { isThisYear } from "date-fns";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { tinykeys } from "tinykeys";
import { shiftDateRange } from "../../common/datetime/calc_date";
import type { DateRange } from "../../common/datetime/calc_date_range";
import { calcDateRange } from "../../common/datetime/calc_date_range";
import {
  formatShortDateTime,
  formatShortDateTimeWithYear,
} from "../../common/datetime/format_date_time";
import { fireEvent } from "../../common/dom/fire_event";
import {
  configContext,
  localeContext,
  localizeContext,
} from "../../data/context";
import "../ha-bottom-sheet";
import "../ha-icon-button";
import "../ha-icon-button-next";
import "../ha-icon-button-prev";
import "../ha-textarea";
import "./date-range-picker";

export type DateRangePickerRanges = Record<string, [Date, Date]>;

const RANGE_KEYS: DateRange[] = ["today", "yesterday", "this_week"];
const EXTENDED_RANGE_KEYS: DateRange[] = [
  "this_month",
  "this_year",
  "now-1h",
  "now-12h",
  "now-24h",
  "now-7d",
  "now-30d",
];

@customElement("ha-date-range-picker")
export class HaDateRangePicker extends LitElement {
  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: ContextType<typeof localizeContext>;

  @state()
  @consume({ context: localeContext, subscribe: true })
  private locale!: ContextType<typeof localeContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private hassConfig!: ContextType<typeof configContext>;

  @property({ attribute: false }) public startDate!: Date;

  @property({ attribute: false }) public endDate!: Date;

  @property({ attribute: false }) public ranges?: DateRangePickerRanges | false;

  @state() private _ranges?: DateRangePickerRanges;

  @property({ attribute: "time-picker", type: Boolean })
  public timePicker = false;

  @property({ type: Boolean, reflect: true })
  public backdrop = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public minimal = false;

  @property({ attribute: "extended-presets", type: Boolean })
  public extendedPresets = false;

  @property({ attribute: "popover-placement" })
  public popoverPlacement:
    | "bottom"
    | "top"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "right-start"
    | "right-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end" = "bottom-start";

  @state() private _opened = false;

  @state() private _pickerWrapperOpen = false;

  @state() private _openedNarrow = false;

  @state() private _popoverWidth = 0;

  @query(".container") private _containerElement?: HTMLDivElement;

  private _narrow = false;

  private _unsubscribeTinyKeys?: () => void;

  public connectedCallback() {
    super.connectedCallback();

    this._handleResize();
    window.addEventListener("resize", this._handleResize);

    const rangeKeys = this.extendedPresets
      ? [...RANGE_KEYS, ...EXTENDED_RANGE_KEYS]
      : RANGE_KEYS;

    this._ranges = {};
    rangeKeys.forEach((key) => {
      this._ranges![
        this.localize(`ui.components.date-range-picker.ranges.${key}`)
      ] = calcDateRange(this.locale, this.hassConfig, key);
    });
  }

  public open(): void {
    this._openPicker();
  }

  protected render(): TemplateResult {
    return html`
      <div class="container">
        <div class="date-range-inputs">
          ${!this.minimal
            ? html`<ha-textarea
                  id="field"
                  mobile-multiline
                  @click=${this._openPicker}
                  @keydown=${this._handleKeydown}
                  .value=${(isThisYear(this.startDate)
                    ? formatShortDateTime(
                        this.startDate,
                        this.locale,
                        this.hassConfig
                      )
                    : formatShortDateTimeWithYear(
                        this.startDate,
                        this.locale,
                        this.hassConfig
                      )) +
                  (window.innerWidth >= 459 ? " - " : " - \n") +
                  (isThisYear(this.endDate)
                    ? formatShortDateTime(
                        this.endDate,
                        this.locale,
                        this.hassConfig
                      )
                    : formatShortDateTimeWithYear(
                        this.endDate,
                        this.locale,
                        this.hassConfig
                      ))}
                  .label=${this.localize(
                    "ui.components.date-range-picker.start_date"
                  ) +
                  " - " +
                  this.localize("ui.components.date-range-picker.end_date")}
                  .disabled=${this.disabled}
                  readonly
                ></ha-textarea>
                <ha-icon-button-prev
                  .label=${this.localize("ui.common.previous")}
                  @click=${this._handlePrev}
                >
                </ha-icon-button-prev>
                <ha-icon-button-next
                  .label=${this.localize("ui.common.next")}
                  @click=${this._handleNext}
                >
                </ha-icon-button-next>`
            : html`<ha-icon-button
                @click=${this._openPicker}
                .disabled=${this.disabled}
                id="field"
                .label=${this.localize(
                  "ui.components.date-range-picker.select_date_range"
                )}
                .path=${mdiCalendar}
              ></ha-icon-button>`}
        </div>
        ${this._pickerWrapperOpen || this._opened
          ? this._openedNarrow
            ? html`
                <ha-bottom-sheet
                  flexcontent
                  .open=${this._pickerWrapperOpen}
                  @wa-after-show=${this._dialogOpened}
                  @closed=${this._hidePicker}
                >
                  ${this._renderPicker()}
                </ha-bottom-sheet>
              `
            : html`
                <wa-popover
                  .open=${this._pickerWrapperOpen}
                  style="--body-width: ${this._popoverWidth}px;"
                  without-arrow
                  distance="0"
                  .placement=${this.popoverPlacement}
                  for="field"
                  auto-size="vertical"
                  auto-size-padding="16"
                  @wa-after-show=${this._dialogOpened}
                  @wa-after-hide=${this._hidePicker}
                  trap-focus
                >
                  ${this._renderPicker()}
                </wa-popover>
              `
          : nothing}
      </div>
    `;
  }

  private _renderPicker() {
    if (!this._opened) {
      return nothing;
    }
    return html`
      <date-range-picker
        .ranges=${this.ranges === false ? false : this.ranges || this._ranges}
        .startDate=${this.startDate}
        .endDate=${this.endDate}
        .timePicker=${this.timePicker}
        @cancel-date-picker=${this._closePicker}
        @value-changed=${this._closePicker}
      >
      </date-range-picker>
    `;
  }

  private _hidePicker(ev: Event) {
    ev.stopPropagation();
    this._opened = false;
    this._pickerWrapperOpen = false;
    this._unsubscribeTinyKeys?.();
    fireEvent(this, "picker-closed");
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._handleResize);
    this._unsubscribeTinyKeys?.();
  }

  private _handleResize = () => {
    this._narrow =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches;

    if (!this._openedNarrow && this._pickerWrapperOpen) {
      this._popoverWidth = this._containerElement?.offsetWidth || 250;
    }
  };

  private _dialogOpened = () => {
    this._opened = true;
    this._setTextareaFocusStyle(true);
  };

  private _handleNext(ev: MouseEvent): void {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    this._shift(true);
  }

  private _handlePrev(ev: MouseEvent): void {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    this._shift(false);
  }

  private _shift(forward: boolean) {
    if (!this.startDate) return;
    const { start, end } = shiftDateRange(
      this.startDate,
      this.endDate,
      forward,
      this.locale,
      this.hassConfig
    );
    this.startDate = start;
    this.endDate = end;
  }

  private _closePicker() {
    this._pickerWrapperOpen = false;
  }

  private _openPicker(ev?: Event) {
    if (this.disabled) {
      return;
    }
    if (this._pickerWrapperOpen) {
      ev?.stopImmediatePropagation();
      return;
    }
    this._openedNarrow = this._narrow;
    this._popoverWidth = this._containerElement?.offsetWidth || 250;
    this._pickerWrapperOpen = true;
    this._unsubscribeTinyKeys = tinykeys(this, {
      Escape: this._handleEscClose,
    });
  }

  private _handleKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.stopPropagation();
      this._openPicker(ev);
    }
  }

  private _handleEscClose = (ev: KeyboardEvent) => {
    ev.stopPropagation();
  };

  private _setTextareaFocusStyle(focused: boolean) {
    const textarea = this.renderRoot.querySelector("ha-textarea");
    if (textarea) {
      const foundation = (textarea as any).mdcFoundation;
      if (foundation) {
        if (focused) {
          foundation.activateFocus();
        } else {
          foundation.deactivateFocus();
        }
      }
    }
  }

  static styles = [
    css`
      ha-icon-button {
        direction: var(--direction);
      }

      .date-range-inputs {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
      }

      ha-textarea {
        display: inline-block;
        width: 340px;
      }
      @media only screen and (max-width: 460px) {
        ha-textarea {
          width: 100%;
        }
      }

      wa-popover {
        --wa-space-l: 0;
      }

      :host(:not([backdrop])) wa-popover::part(dialog)::backdrop {
        background: none;
      }

      wa-popover::part(body) {
        min-width: max(var(--body-width), 250px);
        max-width: calc(
          100vw - var(--safe-area-inset-left) - var(
              --safe-area-inset-right
            ) - var(--ha-space-8)
        );
        overflow: hidden;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-date-range-picker": HaDateRangePicker;
  }
}
