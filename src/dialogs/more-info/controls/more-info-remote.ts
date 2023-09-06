import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import { REMOTE_SUPPORT_ACTIVITY, RemoteEntity } from "../../../data/remote";
import { HomeAssistant } from "../../../types";

const filterExtraAttributes = "activity_list,current_activity";

@customElement("more-info-remote")
class MoreInfoRemote extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: RemoteEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const stateObj = this.stateObj;

    return html`
      ${supportsFeature(stateObj, REMOTE_SUPPORT_ACTIVITY)
        ? html`
            <mwc-list
              .label=${this.hass!.localize(
                "ui.dialogs.more_info_control.remote.activity"
              )}
              .value=${stateObj.attributes.current_activity}
              @selected=${this.handleActivityChanged}
              fixedMenuPosition
              naturalMenuWidth
              @closed=${stopPropagation}
            >
              ${stateObj.attributes.activity_list!.map(
                (activity) => html`
                  <mwc-list-item .value=${activity}>
                    ${this.hass.formatEntityAttributeValue(
                      stateObj,
                      "activity",
                      activity
                    )}
                  </mwc-list-item>
                `
              )}
            </mwc-list>
          `
        : nothing}

      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .extraFilters=${filterExtraAttributes}
      ></ha-attributes>
    `;
  }

  private handleActivityChanged(ev) {
    const oldVal = this.stateObj!.attributes.current_activity;
    const newVal = ev.target.value;

    if (!newVal || oldVal === newVal) {
      return;
    }

    this.hass.callService("remote", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      activity: newVal,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-remote": MoreInfoRemote;
  }
}
