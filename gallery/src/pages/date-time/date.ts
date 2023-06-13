import "@material/mwc-list/mwc-list";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { formatDateNumeric } from "../../../../src/common/datetime/format_date";
import "../../../../src/components/ha-card";
import {
  DateFormat,
  FirstWeekday,
  FrontendLocaleData,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../../../src/data/translation";
import { demoConfig } from "../../../../src/fake_data/demo_config";
import { translationMetadata } from "../../../../src/resources/translations-metadata";

@customElement("demo-date-time-date")
export class DemoDateTimeDate extends LitElement {
  protected render() {
    const defaultLocale: FrontendLocaleData = {
      language: "en",
      number_format: NumberFormat.language,
      time_format: TimeFormat.language,
      date_format: DateFormat.language,
      time_zone: TimeZone.local,
      first_weekday: FirstWeekday.language,
    };
    const date = new Date();
    return html`
      <mwc-list>
        <div class="container header">
          <div>Language</div>
          <div class="center">Default (lang)</div>
          <div class="center">Day-Month-Year</div>
          <div class="center">Month-Day-Year</div>
          <div class="center">Year-Month-Day</div>
        </div>
        ${Object.entries(translationMetadata.translations)
          .filter(([key, _]) => key !== "test")
          .map(
            ([key, value]) => html`
              <div class="container">
                <div>${value.nativeName}</div>
                <div class="center">
                  ${formatDateNumeric(
                    date,
                    {
                      ...defaultLocale,
                      language: key,
                      date_format: DateFormat.language,
                    },
                    demoConfig
                  )}
                </div>
                <div class="center">
                  ${formatDateNumeric(
                    date,
                    {
                      ...defaultLocale,
                      language: key,
                      date_format: DateFormat.DMY,
                    },
                    demoConfig
                  )}
                </div>
                <div class="center">
                  ${formatDateNumeric(
                    date,
                    {
                      ...defaultLocale,
                      language: key,
                      date_format: DateFormat.MDY,
                    },
                    demoConfig
                  )}
                </div>
                <div class="center">
                  ${formatDateNumeric(
                    date,
                    {
                      ...defaultLocale,
                      language: key,
                      date_format: DateFormat.YMD,
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
      .header {
        font-weight: bold;
      }
      .center {
        text-align: center;
      }
      .container {
        max-width: 600px;
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
    "demo-date-time-date": DemoDateTimeDate;
  }
}
