import { provide } from "@lit/context";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-tip";
import { internationalizationContext } from "../../../../src/data/context";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../../../src/data/translation";
import type { HomeAssistantInternationalization } from "../../../../src/types";
import { THEME_COMPARISON_PANELS } from "../../components/demo-theme-comparison";

const tips: (string | TemplateResult)[] = [
  "Test tip",
  "Bigger test tip, with some random text just to fill up as much space as possible without it looking like I'm really trying to to that",
  html`<i>Tip</i> <b>with</b> <sub>HTML</sub>`,
];

const localize = (key: string) => key;

const DEMO_I18N: HomeAssistantInternationalization = {
  localize,
  language: "en",
  selectedLanguage: null,
  locale: {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
    date_format: DateFormat.language,
    first_weekday: FirstWeekday.language,
    time_zone: TimeZone.local,
  },
  translationMetadata: { fragments: [], translations: {} },
  loadBackendTranslation: async () => localize,
  loadFragmentTranslation: async () => localize,
};

@customElement("demo-components-ha-tip")
export class DemoHaTip extends LitElement {
  @provide({ context: internationalizationContext })
  @state()
  protected _i18n = DEMO_I18N;

  protected render(): TemplateResult {
    return html`
      <demo-theme-comparison>
        ${THEME_COMPARISON_PANELS.map(
          ({ slot }) => html`
            <ha-card slot=${slot}>
              <div class="card-content">
                ${tips.map((tip) => html`<ha-tip>${tip}</ha-tip>`)}
              </div>
            </ha-card>
          `
        )}
      </demo-theme-comparison>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-tip {
      margin-bottom: 14px;
    }
    ha-card {
      margin: 0;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-tip": DemoHaTip;
  }
}
