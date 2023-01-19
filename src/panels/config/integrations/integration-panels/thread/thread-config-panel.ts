import "@material/mwc-button";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { threadGetInfo, ThreadInfo } from "../../../../../data/thread";

@customElement("thread-config-panel")
export class ThreadConfigPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _info?: ThreadInfo;

  protected render(): TemplateResult {
    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass} header="Thread">
        <div class="content">
          <ha-card header="Thread Border Router">
            <div class="card-content">
              ${!this._info
                ? html`<ha-circular-progress active></ha-circular-progress>`
                : html`
                    <table>
                      <tr>
                        <td>URL</td>
                        <td>${this._info.url}</td>
                      </tr>
                      <tr>
                        <td>Active Dataset TLVs</td>
                        <td>${this._info.active_dataset_tlvs || "-"}</td>
                      </tr>
                    </table>
                  `}
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  protected override firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    threadGetInfo(this.hass).then((info) => {
      this._info = info;
    });
  }

  static styles = [
    haStyle,
    css`
      .content {
        padding: 24px 0 32px;
        max-width: 600px;
        margin: 0 auto;
        direction: ltr;
      }
      ha-card:first-child {
        margin-bottom: 16px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "thread-config-panel": ThreadConfigPanel;
  }
}
