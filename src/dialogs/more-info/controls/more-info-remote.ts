import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import type { HaSelectSelectEvent } from "../../../components/ha-select";
import "../../../components/ha-select";
import { MORE_INFO_MAIN_VIEW_EXTRA_ATTRIBUTE_FILTERS } from "../../../data/entity/entity_attributes";
import type { RemoteEntity } from "../../../data/remote";
import { REMOTE_SUPPORT_ACTIVITY } from "../../../data/remote";
import type { HomeAssistant } from "../../../types";

const EXTRA_FILTERS =
  MORE_INFO_MAIN_VIEW_EXTRA_ATTRIBUTE_FILTERS.remote.join(",");

@customElement("more-info-remote")
class MoreInfoRemote extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: RemoteEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const stateObj = this.stateObj;

    return html`
      ${supportsFeature(stateObj, REMOTE_SUPPORT_ACTIVITY)
        ? html`
            <ha-select
              .label=${this.hass!.localize(
                "ui.dialogs.more_info_control.remote.activity"
              )}
              .value=${stateObj.attributes.current_activity || ""}
              @selected=${this._handleActivityChanged}
              .options=${stateObj.attributes.activity_list?.map((activity) => ({
                value: activity,
                label: this.hass!.formatEntityAttributeValue(
                  stateObj,
                  "activity",
                  activity
                ),
              }))}
            >
            </ha-select>
          `
        : nothing}

      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .extraFilters=${EXTRA_FILTERS}
      ></ha-attributes>
    `;
  }

  private _handleActivityChanged(ev: HaSelectSelectEvent) {
    const oldVal = this.stateObj!.attributes.current_activity;
    const newVal = ev.detail.value;

    if (!newVal || oldVal === newVal) {
      return;
    }

    this.hass.callService("remote", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      activity: newVal,
    });
  }

  static styles = css`
    ha-select {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-remote": MoreInfoRemote;
  }
}
