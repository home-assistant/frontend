import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import {
  computeShowHistoryComponent,
  computeShowLogBookComponent,
} from "./const";
import "./ha-more-info-history";
import "./ha-more-info-logbook";
import { getSensorNumericDeviceClasses } from "../../data/sensor";

@customElement("ha-more-info-history-and-logbook")
export class MoreInfoHistoryAndLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @state() private _sensorNumericDeviceClasses?: string[] = [];

  private async _loadNumericDeviceClasses() {
    const deviceClasses = await getSensorNumericDeviceClasses(this.hass);
    this._sensorNumericDeviceClasses = deviceClasses.numeric_device_classes;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._loadNumericDeviceClasses();
  }

  protected render() {
    return html`
      ${computeShowHistoryComponent(this.hass, this.entityId)
        ? html`
            <ha-more-info-history
              .hass=${this.hass}
              .entityId=${this.entityId}
            ></ha-more-info-history>
          `
        : ""}
      ${computeShowLogBookComponent(
        this.hass,
        this.entityId,
        this._sensorNumericDeviceClasses
      )
        ? html`
            <ha-more-info-logbook
              .hass=${this.hass}
              .entityId=${this.entityId}
            ></ha-more-info-logbook>
          `
        : ""}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-more-info-history,
      ha-more-info-logbook {
        display: block;
      }
      ha-more-info-history + ha-more-info-logbook {
        margin-top: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-history-and-logbook": MoreInfoHistoryAndLogbook;
  }
}
