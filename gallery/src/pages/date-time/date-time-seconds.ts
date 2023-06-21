import { html, css, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-select";
import { translationMetadata } from "../../../../src/resources/translations-metadata";
import { formatDateTimeWithSeconds } from "../../../../src/common/datetime/format_date_time";
import { timeOptions } from "../../data/date-options";
import { demoConfig } from "../../../../src/fake_data/demo_config";
import {
  FrontendLocaleData,
  NumberFormat,
  TimeFormat,
  DateFormat,
  FirstWeekday,
  TimeZone,
} from "../../../../src/data/translation";

@customElement("demo-date-time-date-time-seconds")
export class DemoDateTimeDateTimeSeconds extends LitElement {
  @state() private selection?: string = "now";

  @state() private date: Date = new Date();

  handleValueChanged(e: CustomEvent) {
    this.selection = e.detail.value as string;
    this.date = new Date();
    if (this.selection !== "now") {
      const [hours, minutes, seconds] = this.selection.split(":").map(Number);
      this.date.setHours(hours);
      this.date.setMinutes(minutes);
      this.date.setSeconds(seconds);
    }
  }

  protected render() {
    const defaultLocale: FrontendLocaleData = {
      language: "en",
      number_format: NumberFormat.language,
      time_format: TimeFormat.language,
      date_format: DateFormat.language,
      first_weekday: FirstWeekday.language,
      time_zone: TimeZone.local,
    };
    return html`
      <ha-control-select
        .value=${this.selection}
        .options=${timeOptions}
        @value-changed=${this.handleValueChanged}
      >
      </ha-control-select>
      <mwc-list>
        <div class="container header">
          <div>Language</div>
          <div class="center">Default (lang)</div>
          <div class="center">12 Hours</div>
          <div class="center">24 Hours</div>
        </div>
        ${Object.entries(translationMetadata.translations)
          .filter(([key, _]) => key !== "test")
          .map(
            ([key, value]) => html`
              <div class="container">
                <div>${value.nativeName}</div>
                <div class="center">
                  ${formatDateTimeWithSeconds(
                    this.date,
                    {
                      ...defaultLocale,
                      language: key,
                      time_format: TimeFormat.language,
                    },
                    demoConfig
                  )}
                </div>
                <div class="center">
                  ${formatDateTimeWithSeconds(
                    this.date,
                    {
                      ...defaultLocale,
                      language: key,
                      time_format: TimeFormat.am_pm,
                    },
                    demoConfig
                  )}
                </div>
                <div class="center">
                  ${formatDateTimeWithSeconds(
                    this.date,
                    {
                      ...defaultLocale,
                      language: key,
                      time_format: TimeFormat.twenty_four,
                    },
                    demoConfig
                  )}
                </div>
              </div>
            `
          )}
      </mwc-list>
    `;
  }

  static get styles() {
    return css`
      ha-control-select {
        max-width: 800px;
        margin: 12px auto;
      }
      .header {
        font-weight: bold;
      }
      .center {
        text-align: center;
      }
      .container {
        max-width: 900px;
        margin: 12px auto;
        display: flex;
        align-items: center;
        justify-content: space-evenly;
      }

      .container > div {
        flex-grow: 1;
        width: 20%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-date-time-date-time-seconds": DemoDateTimeDateTimeSeconds;
  }
}
