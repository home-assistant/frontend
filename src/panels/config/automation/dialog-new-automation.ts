import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import {
  mdiAccount,
  mdiHomeAssistant,
  mdiPencilOutline,
  mdiWeb,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { stringCompare } from "../../../common/string/compare";
import "../../../components/ha-blueprint-picker";
import "../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import { showAutomationEditor } from "../../../data/automation";
import {
  Blueprint,
  Blueprints,
  fetchBlueprints,
  isHABlueprint,
} from "../../../data/blueprint";
import { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("ha-dialog-new-automation")
class DialogNewAutomation extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() public blueprints?: Blueprints;

  public showDialog(): void {
    this._opened = true;
    if (this.blueprints === undefined) {
      fetchBlueprints(this.hass!, "automation").then((blueprints) => {
        this.blueprints = blueprints;
      });
    }
  }

  public closeDialog(): void {
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
  }

  private _processedBlueprints = memoizeOne((blueprints?: Blueprints) => {
    if (!blueprints) {
      return [];
    }
    const result = Object.entries(blueprints)
      .filter((entry): entry is [string, Blueprint] => !("error" in entry[1]))
      .map(([path, blueprint]) => ({
        ...blueprint.metadata,
        path,
      }));
    return result.sort((a, b) =>
      stringCompare(a.name, b.name, this.hass!.locale.language)
    );
  });

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }

    const processedBlueprints = this._processedBlueprints(this.blueprints);

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.automation.dialog_new.header")
        )}
      >
        <mwc-list
          innerRole="listbox"
          itemRoles="option"
          innerAriaLabel=${this.hass.localize(
            "ui.panel.config.automation.dialog_new.header"
          )}
          rootTabbable
          dialogInitialFocus
        >
          <ha-list-item
            hasmeta
            twoline
            graphic="icon"
            @request-selected=${this._blank}
          >
            <ha-svg-icon slot="graphic" .path=${mdiPencilOutline}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.automation.dialog_new.create_empty"
            )}
            <span slot="secondary">
              ${this.hass.localize(
                "ui.panel.config.automation.dialog_new.create_empty_description"
              )}
            </span>
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
          <li divider role="separator"></li>
          ${processedBlueprints.length > 0 ? html`` : null}
          ${processedBlueprints.map(
            (blueprint) => html`
              <ha-list-item
                hasmeta
                twoline
                graphic="icon"
                @request-selected=${this._blueprint}
                .path=${blueprint.path}
              >
                <ha-svg-icon
                  slot="graphic"
                  .path=${isHABlueprint(blueprint.path)
                    ? mdiHomeAssistant
                    : mdiAccount}
                ></ha-svg-icon>
                ${blueprint.name}
                <span slot="secondary">${blueprint.path}</span>
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            `
          )}
          ${processedBlueprints.length === 0
            ? html`
                <ha-list-item hasmeta twoline graphic="icon">
                  <ha-svg-icon slot="graphic" .path=${mdiWeb}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.automation.dialog_new.create_blueprint"
                  )}
                  <span slot="secondary">
                    ${this.hass.localize(
                      "ui.panel.config.automation.dialog_new.create_blueprint_description"
                    )}</span
                  >
                  <ha-icon-next slot="meta"></ha-icon-next>
                </ha-list-item>
              `
            : null}
        </mwc-list>
      </ha-dialog>
    `;
  }

  private async _blueprint(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const path = (ev.currentTarget! as any).path;
    this.closeDialog();
    showAutomationEditor({ use_blueprint: { path } });
  }

  private async _blank(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this.closeDialog();
    showAutomationEditor();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 12px 0;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-new-automation": DialogNewAutomation;
  }
}
