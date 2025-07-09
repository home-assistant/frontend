import { mdiClose, mdiLightbulb, mdiLightbulbOff } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeGroupEntitiesState } from "../../../common/entity/group_entities";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-header";
import "../../../components/ha-domain-icon";
import "../../../components/ha-header-bar";
import { forwardHaptic } from "../../../data/haptics";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import "../../../dialogs/more-info/components/ha-more-info-state-header";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { TileCardConfig } from "../cards/types";
import "../sections/hui-section";
import type { GroupToggleDialogParams } from "./show-group-toggle-dialog";

@customElement("hui-dialog-group-toggle")
class HuiGroupToggleDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: GroupToggleDialogParams;

  public async showDialog(params: GroupToggleDialogParams): Promise<void> {
    this._params = params;
  }

  public async closeDialog(): Promise<void> {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _sectionConfig = memoizeOne(
    (entities: string[]): LovelaceSectionConfig => ({
      type: "grid",
      cards: entities.map<TileCardConfig>((entity) => ({
        type: "tile",
        entity: entity,
        icon_tap_action: {
          action: "toggle",
        },
        tap_action: {
          action: "more-info",
        },
        grid_options: {
          columns: 12,
        },
      })),
    })
  );

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const sectionConfig = this._sectionConfig(this._params.entityIds);

    const entities = this._params.entityIds
      .map((entityId) => this.hass!.states[entityId] as HassEntity | undefined)
      .filter((v): v is HassEntity => Boolean(v));

    const mainStateObj = entities[0];

    const groupState = computeGroupEntitiesState(entities);
    const formattedGroupState = this.hass.formatEntityState(
      mainStateObj,
      groupState
    );

    const domain = computeStateDomain(mainStateObj);

    const deviceClass = mainStateObj.attributes.device_class;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this._params.title}
        hideActions
        flexContent
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">${this._params.title}</span>
          ${this._params.subtitle
            ? html`<span slot="subtitle">${this._params.subtitle}</span>`
            : nothing}
        </ha-dialog-header>
        <div class="content">
          <ha-more-info-state-header
            .hass=${this.hass}
            .stateObj=${mainStateObj}
            .stateOverride=${formattedGroupState}
          ></ha-more-info-state-header>
          <ha-control-button-group vertical>
            <ha-control-button vertical @click=${this._turnAllOn}>
              ${domain !== "light"
                ? html`<ha-domain-icon
                    .hass=${this.hass}
                    .domain=${domain}
                    .state=${domain === "cover" ? "open" : "on"}
                    .deviceClass=${deviceClass}
                  ></ha-domain-icon>`
                : html` <ha-svg-icon .path=${mdiLightbulb}></ha-svg-icon> `}
              <p>${domain === "cover" ? "Open all" : "Turn all on"}</p>
            </ha-control-button>
            <ha-control-button vertical @click=${this._turnAllOff}>
              ${domain !== "light"
                ? html`<ha-domain-icon
                    .hass=${this.hass}
                    .domain=${domain}
                    .state=${domain === "cover" ? "closed" : "off"}
                    .deviceClass=${deviceClass}
                  ></ha-domain-icon>`
                : html` <ha-svg-icon .path=${mdiLightbulbOff}></ha-svg-icon>`}
              <p>${domain === "cover" ? "Close all" : "Turn all off"}</p>
            </ha-control-button>
          </ha-control-button-group>
          <hui-section
            .config=${sectionConfig}
            .hass=${this.hass}
          ></hui-section>
        </div>
      </ha-dialog>
    `;
  }

  private _turnAllOff() {
    if (!this._params) {
      return;
    }

    forwardHaptic("light");
    const domain = computeDomain(this._params.entityIds[0]);
    if (domain === "cover") {
      this.hass.callService("cover", "close_cover", {
        entity_id: this._params.entityIds,
      });
      return;
    }
    this.hass.callService("homeassistant", "turn_off", {
      entity_id: this._params.entityIds,
    });
  }

  private _turnAllOn() {
    if (!this._params) {
      return;
    }

    forwardHaptic("light");
    const domain = computeDomain(this._params.entityIds[0]);
    if (domain === "cover") {
      this.hass.callService("cover", "open_cover", {
        entity_id: this._params.entityIds,
      });
      return;
    }
    this.hass.callService("homeassistant", "turn_on", {
      entity_id: this._params.entityIds,
    });
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        /* Set the top top of the dialog to a fixed position, so it doesnt jump when the content changes size */
        --vertical-align-dialog: flex-start;
        --dialog-surface-margin-top: 40px;
        --dialog-content-padding: 0;
      }
      @media all and (max-width: 450px), all and (max-height: 500px) {
        /* When in fullscreen dialog should be attached to top */
        ha-dialog {
          --dialog-surface-margin-top: 0px;
        }
      }
      .content {
        padding: 0 16px 16px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      }
      ha-control-button-group {
        --control-button-group-spacing: 12px;
        --control-button-group-thickness: 130px;
        margin-bottom: 32px;
      }
      ha-control-button {
        --control-button-border-radius: 16px;
        --mdc-icon-size: 24px;
        color: #006787;
        --control-button-padding: 16px 8px;
        --control-button-icon-color: #006787;
        --control-button-background-color: #eff9fe;
        --control-button-background-opacity: 1;
        --control-button-focus-color: #006787;
        --ha-ripple-color: #006787;
      }
      ha-control-button p {
        margin: 0;
      }
      hui-section {
        width: 100%;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-group-toggle": HuiGroupToggleDialog;
  }
}
