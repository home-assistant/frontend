import {
  mdiAccount,
  mdiFile,
  mdiOpenInNew,
  mdiPencilOutline,
  mdiWeb,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { stringCompare } from "../../../common/string/compare";
import "../../../components/ha-icon-next";
import "../../../components/ha-wa-dialog";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-tip";
import { showAutomationEditor } from "../../../data/automation";
import type {
  Blueprint,
  BlueprintDomain,
  BlueprintSourceType,
  Blueprints,
} from "../../../data/blueprint";
import {
  fetchBlueprints,
  getBlueprintSourceType,
} from "../../../data/blueprint";
import { showScriptEditor } from "../../../data/script";
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
class DialogNewAutomation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _params?: NewAutomationDialogParams;

  @state() private _mode: BlueprintDomain = "automation";

  @state() public blueprints?: Blueprints;

  public showDialog(params: NewAutomationDialogParams): void {
    this._params = params;
    this._open = true;
    this._mode = params?.mode || "automation";

    fetchBlueprints(this.hass!, this._mode).then((blueprints) => {
      this.blueprints = blueprints;
    });
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this.blueprints = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
    if (!this._params) {
      return nothing;
    }

    const processedBlueprints = this._processedBlueprints(this.blueprints);

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          `ui.panel.config.${this._mode}.dialog_new.header`
        )}
        @closed=${this._dialogClosed}
      >
        <ha-list
          innerRole="listbox"
          itemRoles="option"
          innerAriaLabel=${this.hass.localize(
            `ui.panel.config.${this._mode}.dialog_new.header`
          )}
          rootTabbable
          autofocus
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
        </ha-list>
      </ha-wa-dialog>
    `;
  }

  private async _blueprint(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const path = (ev.currentTarget! as any).path;
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
        ha-wa-dialog {
          --dialog-content-padding: 0;
          --mdc-dialog-max-height: 60vh;
          --mdc-dialog-max-height: 60dvh;
        }
        @media all and (min-width: 550px) {
          ha-wa-dialog {
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
