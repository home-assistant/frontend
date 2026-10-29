import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../common/decorators/consume";
import { resolveTimeZone } from "../../common/datetime/resolve-time-zone";
import { fireEvent } from "../../common/dom/fire_event";
import { configContext, internationalizationContext } from "../../data/context";
import type { UiClockDateFormatSelector } from "../../data/selector";
import {
  CLOCK_CARD_DATE_PRESETS,
  formatClockCardDatePreset,
  getClockCardDatePresetParts,
  isClockCardDatePreset,
} from "../../panels/lovelace/cards/clock/clock-date-format";
import type { ClockCardDatePreset } from "../../panels/lovelace/cards/types";
import "../ha-clock-date-format-picker";
import "../ha-select";
import type { HaSelectOption, HaSelectSelectEvent } from "../ha-select";

type ClockDateFormatMode = ClockCardDatePreset | "custom";

@customElement("ha-selector-ui_clock_date_format")
export class HaSelectorUiClockDateFormat extends LitElement {
  @property({ attribute: false }) public selector!: UiClockDateFormatSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  // Keeps custom mode open while its parts list is still empty.
  @state() private _custom = false;

  private get _mode(): ClockDateFormatMode | undefined {
    if (isClockCardDatePreset(this.value)) {
      return this.value;
    }

    if ((Array.isArray(this.value) && this.value.length) || this._custom) {
      return "custom";
    }

    return undefined;
  }

  private _options = memoizeOne(
    (
      i18n: ContextType<typeof internationalizationContext>,
      serverTimeZone: string
    ): HaSelectOption[] => {
      const now = new Date();
      const timeZone = resolveTimeZone(i18n.locale.time_zone, serverTimeZone);

      return [
        ...CLOCK_CARD_DATE_PRESETS.map((preset) => ({
          value: preset,
          label: i18n.localize(
            `ui.panel.lovelace.editor.card.clock.date.presets.${preset}`
          ),
          secondary: formatClockCardDatePreset(
            now,
            preset,
            i18n.locale.language,
            timeZone
          ),
        })),
        {
          value: "custom",
          label: i18n.localize(
            "ui.panel.lovelace.editor.card.clock.date.presets.custom"
          ),
        },
      ];
    }
  );

  protected render() {
    const mode = this._mode;

    return html`
      <ha-select
        .label=${this.label}
        .value=${mode}
        .options=${this._options(this._i18n, this._hassConfig.config.time_zone)}
        .disabled=${this.disabled}
        .required=${this.required}
        .clearable=${!this.required}
        @selected=${this._modeSelected}
      ></ha-select>
      ${
        mode === "custom"
          ? html`
              <ha-clock-date-format-picker
                .value=${this.value}
                .helper=${this.helper}
                .disabled=${this.disabled}
                .required=${this.required}
              ></ha-clock-date-format-picker>
            `
          : nothing
      }
    `;
  }

  private _modeSelected(
    ev: HaSelectSelectEvent<ClockDateFormatMode, true>
  ): void {
    ev.stopPropagation();
    const mode = ev.detail.value;
    const currentValue = this.value;

    this._custom = mode === "custom";

    if (mode === "custom") {
      if (isClockCardDatePreset(currentValue)) {
        fireEvent(this, "value-changed", {
          value: getClockCardDatePresetParts(
            currentValue,
            this._i18n.locale.language
          ),
        });
      }

      return;
    }

    fireEvent(this, "value-changed", { value: mode });
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }

    ha-select {
      display: block;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-ui_clock_date_format": HaSelectorUiClockDateFormat;
  }
}
