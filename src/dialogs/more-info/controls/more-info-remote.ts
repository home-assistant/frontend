import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { HaSelectSelectEvent } from "../../../components/ha-select";
import "../../../components/ha-select";
import { apiContext, formattersContext } from "../../../data/context";
import type { RemoteEntity } from "../../../data/remote";
import { REMOTE_SUPPORT_ACTIVITY } from "../../../data/remote";
import type { HomeAssistantApi, HomeAssistantFormatters } from "../../../types";

@customElement("more-info-remote")
class MoreInfoRemote extends LitElement {
  @property({ attribute: false }) public stateObj?: RemoteEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  protected render() {
    if (!this._localize || !this._formatters || !this.stateObj) {
      return nothing;
    }

    const stateObj = this.stateObj;

    return html`
      ${supportsFeature(stateObj, REMOTE_SUPPORT_ACTIVITY)
        ? html`
            <ha-select
              .label=${this._localize(
                "ui.dialogs.more_info_control.remote.activity"
              )}
              .value=${stateObj.attributes.current_activity || ""}
              @selected=${this._handleActivityChanged}
              .options=${stateObj.attributes.activity_list?.map((activity) => ({
                value: activity,
                label: this._formatters.formatEntityAttributeValue(
                  stateObj,
                  "activity",
                  activity
                ),
              }))}
            >
            </ha-select>
          `
        : nothing}
    `;
  }

  private _handleActivityChanged(ev: HaSelectSelectEvent) {
    const oldVal = this.stateObj!.attributes.current_activity;
    const newVal = ev.detail.value;

    if (!newVal || oldVal === newVal) {
      return;
    }

    this._api.callService("remote", "turn_on", {
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
