import { customElement, property, state } from "lit/decorators";
import { css, type CSSResultGroup, html, LitElement, nothing } from "lit";
import { mdiDownloadOutline, mdiPencilOutline } from "@mdi/js";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { shouldHandleRequestSelectedEvent } from "../../../../common/mwc/handle-request-selected-event";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import { showImportBlueprintDialog } from "../../../config/blueprint/import-blueprint-dialog/show-dialog-import-blueprint";
import type { Blueprint, BlueprintDomain } from "../../../../data/blueprint";
import { showBlueprintEditor } from "../../../../data/blueprint";

import "@material/mwc-list/mwc-list";
import "../../../../components/ha-md-divider";
import "../../../../components/ha-list-item";
import "../../../../components/ha-textfield";
import "../../../../components/ha-icon-next";

@customElement("ha-dialog-new-blueprint")
class DialogNewBlueprint extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _parameters: unknown;

  showDialog(parameters: unknown): void {
    this._parameters = parameters;
    this._opened = true;
  }

  closeDialog(): boolean {
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    return true;
  }

  private _createEmpty(type: BlueprintDomain) {
    return (ev) => {
      if (!shouldHandleRequestSelectedEvent(ev)) {
        return;
      }

      const editorClass = customElements.get(
        `ha-blueprint-${type}-editor`
      ) as CustomElementConstructor & {
        defaultConfig: Blueprint;
      };

      showBlueprintEditor(type, editorClass.defaultConfig);
    };
  }

  private async _importExternal(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    showImportBlueprintDialog(this, this._parameters);
    this.closeDialog();
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
            `ui.panel.developer-tools.tabs.blueprints.dialog_new.header`
          )
        )}
      >
        <mwc-list
          innerRole="listbox"
          itemRoles="option"
          innerAriaLabel=${this.hass.localize(
            `ui.panel.developer-tools.tabs.blueprints.dialog_new.header`
          )}
          rootTabbable
          dialogInitialFocus
        >
          <ha-list-item
            hasmeta
            twoline
            graphic="icon"
            @request-selected=${this._createEmpty("automation")}
          >
            <ha-svg-icon slot="graphic" .path=${mdiPencilOutline}></ha-svg-icon>
            ${this.hass.localize(
              `ui.panel.developer-tools.tabs.blueprints.dialog_new.create_empty_automation`
            )}
            <span slot="secondary">
              ${this.hass.localize(
                `ui.panel.developer-tools.tabs.blueprints.dialog_new.create_empty_automation_description`
              )}
            </span>
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
          <ha-list-item
            hasmeta
            twoline
            graphic="icon"
            @request-selected=${this._createEmpty("script")}
          >
            <ha-svg-icon slot="graphic" .path=${mdiPencilOutline}></ha-svg-icon>
            ${this.hass.localize(
              `ui.panel.developer-tools.tabs.blueprints.dialog_new.create_empty_script`
            )}
            <span slot="secondary">
              ${this.hass.localize(
                `ui.panel.developer-tools.tabs.blueprints.dialog_new.create_empty_script_description`
              )}
            </span>
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
          <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
          <ha-list-item
            hasmeta
            twoline
            graphic="icon"
            @request-selected=${this._importExternal}
          >
            <ha-svg-icon
              slot="graphic"
              .path=${mdiDownloadOutline}
            ></ha-svg-icon>
            ${this.hass.localize(
              `ui.panel.developer-tools.tabs.blueprints.dialog_new.import_external`
            )}
            <span slot="secondary">
              ${this.hass.localize(
                `ui.panel.developer-tools.tabs.blueprints.dialog_new.import_external_description`
              )}
            </span>
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
        </mwc-list>
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
    "ha-dialog-new-blueprint": DialogNewBlueprint;
  }
}
