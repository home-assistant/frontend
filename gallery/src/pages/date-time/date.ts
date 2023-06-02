import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-card";
import { HomeAssistant } from "../../../../src/types";
import { translationMetadata } from "../../../../src/resources/translations-metadata";
import { formatDateNumeric } from "../../../../src/common/datetime/format_date";
import {
  FrontendLocaleData,
  NumberFormat,
  TimeFormat,
  DateFormat,
  FirstWeekday,
} from "../../../../src/data/translation";

@customElement("demo-date-time-date")
export class DemoDateTimeDate extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render() {
    const defaultLocale: FrontendLocaleData = {
      language: "en",
      number_format: NumberFormat.language,
      time_format: TimeFormat.language,
      date_format: DateFormat.language,
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
                  ${formatDateNumeric(date, {
                    ...defaultLocale,
                    language: key,
                    date_format: DateFormat.language,
                  })}
                </div>
                <div class="center">
                  ${formatDateNumeric(date, {
                    ...defaultLocale,
                    language: key,
                    date_format: DateFormat.DMY,
                  })}
                </div>
                <div class="center">
                  ${formatDateNumeric(date, {
                    ...defaultLocale,
                    language: key,
                    date_format: DateFormat.MDY,
                  })}
                </div>
                <div class="center">
                  ${formatDateNumeric(date, {
                    ...defaultLocale,
                    language: key,
                    date_format: DateFormat.YMD,
                  })}
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
