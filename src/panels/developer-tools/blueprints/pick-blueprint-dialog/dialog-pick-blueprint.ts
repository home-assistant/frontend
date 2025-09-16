import { customElement, property, state } from "lit/decorators";
import { css, type CSSResultGroup, html, LitElement, nothing } from "lit";
import { mdiPencilOutline, mdiRobot, mdiScript } from "@mdi/js";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { Blueprint, BlueprintDomain } from "../../../../data/blueprint";

import "@material/mwc-list/mwc-list";
import "../../../../components/ha-md-divider";
import "../../../../components/ha-list-item";
import "../../../../components/ha-textfield";
import "../../../../components/ha-icon-next";
import type { PickBlueprintDialogParams } from "./show-dialog-pick-blueprint";
import "@material/mwc-list/mwc-list-item";

@customElement("ha-dialog-pick-blueprint")
class HaDialogPickBlueprint extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _parameters?: PickBlueprintDialogParams;

  @state() private _pickType?: BlueprintDomain;

  showDialog(parameters: PickBlueprintDialogParams): void {
    this._parameters = parameters;
    this._opened = true;
    this._pickType = undefined;
  }

  closeDialog(): boolean {
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    return true;
  }

  private _setPickType(domain: BlueprintDomain) {
    return () => {
      this._pickType = domain;
    };
  }


  private _pickBlueprint(id: string) {
    return () => {
      this._parameters?.handlePickBlueprint(this._pickType!, id);
      this.closeDialog();
    };
  }

  private _pickNew(domain: BlueprintDomain) {
    return () => {
      this._parameters?.handlePickNewBlueprint(domain);
      this.closeDialog();
    }
  }


  private _renderList() {
    if (!this._parameters) {
      return nothing;
    }

    if (!this._pickType) {
      return html`
        <mwc-list
          innerRole="listbox"
          itemRoles="option"
          innerAriaLabel=${this.hass.localize(
            `ui.panel.developer-tools.tabs.blueprints.dialog_pick.header`
          )}
          rootTabbable
          dialogInitialFocus
        >
          <ha-list-item
            hasmeta
            graphic="icon"
            @request-selected=${this._setPickType("automation")}
          >
            <ha-svg-icon slot="graphic" .path=${mdiRobot}></ha-svg-icon>
            ${this.hass.localize(
              `ui.panel.developer-tools.tabs.blueprints.dialog_pick.automation`
            )}
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
          <ha-list-item
            hasmeta
            graphic="icon"
            @request-selected=${this._setPickType("script")}
          >
            <ha-svg-icon slot="graphic" .path=${mdiScript}></ha-svg-icon>
            ${this.hass.localize(
              `ui.panel.developer-tools.tabs.blueprints.dialog_pick.script`
            )}
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
        </mwc-list>
      `;
    }

    const blueprints = Object
      .entries(this._parameters.blueprints[this._pickType])
      .filter(([_, blueprint]) => !("error" in blueprint)) as [string, Blueprint][];
    return html`
      <mwc-list
        innerRole="listbox"
        itemRoles="option"
        innerAriaLabel=${this.hass.localize(
          `ui.panel.developer-tools.tabs.blueprints.dialog_pick.header`
        )}
        rootTabbable
        dialogInitialFocus
      >
        <ha-list-item
          hasmeta
          twoline
          graphic="icon"
          @request-selected=${this._pickNew(this._pickType)}
        >
          <ha-svg-icon slot="graphic" .path=${mdiPencilOutline}></ha-svg-icon>
          ${this.hass.localize(
            `ui.panel.developer-tools.tabs.blueprints.dialog_pick.create_empty_${this._pickType}`
          )}
          <span slot="secondary">
              ${this.hass.localize(
                `ui.panel.developer-tools.tabs.blueprints.dialog_pick.create_empty_${this._pickType}_description`
              )}
            </span>
          <ha-icon-next slot="meta"></ha-icon-next>
        </ha-list-item>
        ${blueprints.map(([id, blueprint]) => html`
          <mwc-list-item 
            graphic="icon"
            @request-selected=${this._pickBlueprint(id)}
          >
            <ha-svg-icon slot="graphic" .path=${mdiPencilOutline}></ha-svg-icon>
            ${blueprint.metadata.name}
          </mwc-list-item>
        `)}
      </mwc-list>
    `;
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            `ui.panel.developer-tools.tabs.blueprints.dialog_pick.header`
          )
        )}
      >
        ${this._renderList()}
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --mdc-dialog-max-height: 60vh;
        }
        @media all and (min-width: 550px) {
          ha-dialog {
            --mdc-dialog-min-width: 500px;
          }
        }
        ha-icon-next {
          width: 24px;
        }
        ha-tip {
          margin-top: 8px;
          margin-bottom: 4px;
        }
        a.item {
          text-decoration: unset;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-pick-blueprint": HaDialogPickBlueprint;
  }
}
