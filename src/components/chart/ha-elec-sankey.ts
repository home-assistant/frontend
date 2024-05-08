import { customElement, property } from "lit/decorators";

import { CSSResultArray, TemplateResult, css, html, nothing } from "lit";
import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import { ElecSankey } from "@davethompson/elec-sankey";
import { HomeAssistant } from "../../types";
import { formatNumber } from "../../common/number/format_number";
import "../ha-icon";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-elec-sankey")
export class HaElecSankey extends ElecSankey {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected _generateLabelDiv(
    id: string | undefined,
    icon: string | undefined,
    _name: string | undefined,
    valueA: number,
    valueB: number | undefined
  ): TemplateResult {
    const _id = id || "";
    return html`
      <div
        class=${id ? "label label-action-clickable" : "label"}
        id=${_id}
        @click=${id ? this._handleMoreInfo : nothing}
      >
        ${_name || nothing}
        ${icon
          ? html`<ha-svg-icon id=${_id} .path=${icon}> </ha-svg-icon><br />`
          : nothing}
        ${valueB !== undefined
          ? html` <span class="return" id=${_id}>
                <ha-svg-icon id=${_id} class="small" .path=${mdiArrowLeft}>
                </ha-svg-icon
                >${formatNumber(valueB, this.hass.locale, {
                  maximumFractionDigits: 1,
                })}&nbsp;${this.unit}</span
              ><br />
              <span class="consumption" id=${_id}>
                <ha-svg-icon id=${_id} class="small" .path=${mdiArrowRight}>
                </ha-svg-icon
                >${formatNumber(valueA, this.hass.locale, {
                  maximumFractionDigits: 1,
                })}&nbsp;${this.unit}
              </span>`
          : html`${formatNumber(valueA, this.hass.locale, {
              maximumFractionDigits: 1,
            })}&nbsp;${this.unit}`}
      </div>
    `;
  }

  private _handleMoreInfo(e: MouseEvent) {
    const div = e.target as HTMLDivElement;
    fireEvent(this, "hass-more-info", {
      entityId: div.id,
    });
  }

  static styles: CSSResultArray = [
    ElecSankey.styles,
    css`
      .label {
        font-size: 12px;
      }
      .label-action-clickable {
        cursor: pointer;
      }
      ha-svg-icon {
        --icon-primary-color: var(--icon-primary-color);
      }
      ha-svg-icon.small {
        --mdc-icon-size: 12px;
      }
      .consumption {
        color: var(--energy-grid-consumption-color);
      }
      .return {
        color: var(--energy-grid-return-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-elec-sankey": HaElecSankey;
  }
}
