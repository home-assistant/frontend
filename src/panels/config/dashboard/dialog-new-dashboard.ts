import { mdiHome, mdiMap, mdiPencilOutline, mdiShape, mdiWeb } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../components/ha-list";
import type { LovelaceRawConfig } from "../../../data/lovelace/config/types";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { NewDashboardDialogParams } from "./show-dialog-new-dashboard";

const EMPTY_CONFIG: LovelaceRawConfig = { views: [{ title: "Home" }] };

interface Strategy {
  type: string;
  iconPath: string;
}

const STRATEGIES = [
  {
    type: "map",
    iconPath: mdiMap,
  },
  {
    type: "iframe",
    iconPath: mdiWeb,
  },
  {
    type: "areas",
    iconPath: mdiHome,
  },
] as const satisfies Strategy[];

@customElement("ha-dialog-new-dashboard")
class DialogNewDashboard extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _params?: NewDashboardDialogParams;

  public showDialog(params: NewDashboardDialogParams): void {
    this._opened = true;
    this._params = params;
  }

  public closeDialog() {
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    this._params = undefined;
    return true;
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
            `ui.panel.config.lovelace.dashboards.dialog_new.header`
          )
        )}
      >
        <ha-list
          innerRole="listbox"
          itemRoles="option"
          innerAriaLabel=${this.hass.localize(
            `ui.panel.config.lovelace.dashboards.dialog_new.header`
          )}
          rootTabbable
          dialogInitialFocus
          @selected=${this._selected}
        >
          <ha-list-item
            hasmeta
            twoline
            graphic="icon"
            .config=${EMPTY_CONFIG}
            @request-selected=${this._selected}
          >
            <ha-svg-icon slot="graphic" .path=${mdiPencilOutline}></ha-svg-icon>
            ${this.hass.localize(
              `ui.panel.config.lovelace.dashboards.dialog_new.create_empty`
            )}
            <span slot="secondary">
              ${this.hass.localize(
                `ui.panel.config.lovelace.dashboards.dialog_new.create_empty_description`
              )}
            </span>
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
          <li divider role="separator"></li>
          <ha-list-item
            hasmeta
            twoline
            graphic="icon"
            .config=${null}
            @request-selected=${this._selected}
          >
            <ha-svg-icon slot="graphic" .path=${mdiShape}></ha-svg-icon>
            ${this.hass.localize(
              `ui.panel.config.lovelace.dashboards.dialog_new.default`
            )}
            <span slot="secondary"
              >${this.hass.localize(
                `ui.panel.config.lovelace.dashboards.dialog_new.default_description`
              )}</span
            >
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
          ${STRATEGIES.map(
            (strategy) => html`
              <ha-list-item
                hasmeta
                twoline
                graphic="icon"
                .strategy=${strategy.type}
                @request-selected=${this._selected}
              >
                <ha-svg-icon
                  slot="graphic"
                  .path=${strategy.iconPath}
                ></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.lovelace.dashboards.dialog_new.strategy.${strategy.type}.title`
                )}
                <span slot="secondary">
                  ${this.hass.localize(
                    `ui.panel.config.lovelace.dashboards.dialog_new.strategy.${strategy.type}.description`
                  )}
                </span>
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            `
          )}
        </ha-list>
      </ha-dialog>
    `;
  }

  private _generateStrategyConfig(strategy: string) {
    return {
      strategy: {
        type: strategy,
      },
    };
  }

  private async _selected(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    const target = ev.currentTarget as any;
    const config =
      target.config ||
      (target.strategy && this._generateStrategyConfig(target.strategy)) ||
      null;

    this._params?.selectConfig(config);
    this.closeDialog();
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-new-dashboard": DialogNewDashboard;
  }
}
