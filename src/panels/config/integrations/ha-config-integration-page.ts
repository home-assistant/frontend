import "@material/mwc-list/mwc-list";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../components/ha-card";
import "../../../components/ha-list-item";
import { ConfigEntry } from "../../../data/config_entries";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";

@customElement("ha-config-integration-page")
class HaConfigIntegrationPage extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public domain!: string;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  @property() public configEntries?: ConfigEntry[];

  private _domainConfigEntries = memoizeOne(
    (domain: string, configEntries: ConfigEntry[]): ConfigEntry[] | undefined =>
      configEntries
        ? configEntries.filter((entry) => entry.domain === domain)
        : undefined
  );

  protected render() {
    if (!this.domain) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${"Integration not Found"}
        ></hass-error-screen>
      `;
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.domain}
      >
        <div class="container">
          <ha-card>
            <mwc-list>
              ${this._domainConfigEntries(
                this.domain,
                this.configEntries ?? []
              )?.map(
                (entry) => html` <ha-list-item>${entry.title}</ha-list-item> `
              )}
            </mwc-list>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          display: flex;
          flex-wrap: wrap;
          margin: auto;
          max-width: 1000px;
          margin-top: 32px;
          margin-bottom: 32px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-integration-page": HaConfigIntegrationPage;
  }
}
