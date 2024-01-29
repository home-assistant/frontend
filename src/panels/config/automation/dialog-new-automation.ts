import "@material/mwc-list/mwc-list";
import {
  mdiAccount,
  mdiFile,
  mdiOpenInNew,
  mdiPencilOutline,
  mdiWeb,
} from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { stringCompare } from "../../../common/string/compare";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../components/ha-tip";
import { showAutomationEditor } from "../../../data/automation";
import {
  Blueprint,
  BlueprintDomain,
  BlueprintSourceType,
  Blueprints,
  fetchBlueprints,
  getBlueprintSourceType,
} from "../../../data/blueprint";
import { showScriptEditor } from "../../../data/script";
import { HassDialog } from "../../../dialogs/make-dialog-manager";
import { mdiHomeAssistant } from "../../../resources/home-assistant-logo-svg";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import type { NewAutomationDialogParams } from "./show-dialog-new-automation";

const SOURCE_TYPE_ICONS: Record<BlueprintSourceType, string> = {
  local: mdiFile,
  community: mdiAccount,
  homeassistant: mdiHomeAssistant,
};

@customElement("ha-dialog-new-automation")
class DialogNewAutomation extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _mode: BlueprintDomain = "automation";

  @state() public blueprints?: Blueprints;

  public showDialog(params: NewAutomationDialogParams): void {
    this._opened = true;
    this._mode = params?.mode || "automation";

    fetchBlueprints(this.hass!, this._mode).then((blueprints) => {
      this.blueprints = blueprints;
    });
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
      .map(([path, blueprint]) => {
        const sourceType = getBlueprintSourceType(blueprint);

        return {
          ...blueprint.metadata,
          sourceType,
          path,
        };
      });
    return result.sort((a, b) =>
      stringCompare(a.name, b.name, this.hass!.locale.language)
    );
  });

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    const processedBlueprints = this._processedBlueprints(this.blueprints);

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(`ui.panel.config.${this._mode}.dialog_new.header`)
        )}
      >
        <mwc-list
          innerRole="listbox"
          itemRoles="option"
          innerAriaLabel=${this.hass.localize(
            `ui.panel.config.${this._mode}.dialog_new.header`
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
              `ui.panel.config.${this._mode}.dialog_new.create_empty`
            )}
            <span slot="secondary">
              ${this.hass.localize(
                `ui.panel.config.${this._mode}.dialog_new.create_empty_description`
              )}
            </span>
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
          <li divider role="separator"></li>
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
                  .path=${SOURCE_TYPE_ICONS[blueprint.sourceType]}
                ></ha-svg-icon>
                ${blueprint.name}
                <span slot="secondary">
                  ${blueprint.author
                    ? this.hass.localize(
                        `ui.panel.config.${this._mode}.dialog_new.blueprint_source.author`,
                        { author: blueprint.author }
                      )
                    : this.hass.localize(
                        `ui.panel.config.${this._mode}.dialog_new.blueprint_source.${blueprint.sourceType}`
                      )}
                </span>
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            `
          )}
          ${processedBlueprints.length === 0
            ? html`
                <a
                  href=${documentationUrl(this.hass, "/get-blueprints")}
                  target="_blank"
                  rel="noreferrer noopener"
                  class="item"
                >
                  <ha-list-item hasmeta twoline graphic="icon">
                    <ha-svg-icon slot="graphic" .path=${mdiWeb}></ha-svg-icon>
                    ${this.hass.localize(
                      `ui.panel.config.${this._mode}.dialog_new.create_blueprint`
                    )}
                    <span slot="secondary">
                      ${this.hass.localize(
                        `ui.panel.config.${this._mode}.dialog_new.create_blueprint_description`
                      )}
                    </span>
                    <ha-svg-icon slot="meta" path=${mdiOpenInNew}></ha-svg-icon>
                  </ha-list-item>
                </a>
              `
            : html`
                <ha-tip .hass=${this.hass}>
                  <a
                    href=${documentationUrl(this.hass, "/get-blueprints")}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    ${this.hass.localize(
                      `ui.panel.config.${this._mode}.dialog_new.discover_blueprint_tip`
                    )}
                  </a>
                </ha-tip>
              `}
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
    if (this._mode === "script") {
      showScriptEditor({ use_blueprint: { path } });
    } else {
      showAutomationEditor({ use_blueprint: { path } });
    }
  }

  private async _blank(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this.closeDialog();
    if (this._mode === "script") {
      showScriptEditor();
    } else {
      showAutomationEditor();
    }
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
    "ha-dialog-new-automation": DialogNewAutomation;
  }
}
