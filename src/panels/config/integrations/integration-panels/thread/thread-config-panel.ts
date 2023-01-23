import "@material/mwc-button";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { getOTBRInfo, OTBRInfo } from "../../../../../data/otbr";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { showConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-config-flow";

@customElement("thread-config-panel")
export class ThreadConfigPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _info?: OTBRInfo;

  protected render(): TemplateResult {
    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass} header="Thread">
        <div class="content">
          <ha-card header="Open Thread Border Router">
            ${isComponentLoaded(this.hass, "otbr")
              ? html`
                  <div class="card-content">
                    ${!this._info
                      ? html`<ha-circular-progress
                          active
                        ></ha-circular-progress>`
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
                `
              : html`
                  <div class="card-content">No border routers found.</div>
                  <div class="card-actions">
                    <mwc-button
                      @click=${this._addOTBR}
                      label="Add border router"
                    ></mwc-button>
                  </div>
                `}
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  protected override firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this._refresh();
  }

  private _refresh() {
    if (isComponentLoaded(this.hass, "otbr")) {
      getOTBRInfo(this.hass).then((info) => {
        this._info = info;
      });
    }
  }

  private _addOTBR() {
    showConfigFlowDialog(this, {
      dialogClosedCallback: () => {
        this._refresh();
      },
      startFlowHandler: "otbr",
      showAdvanced: this.hass.userData?.showAdvanced,
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
