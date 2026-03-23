import {
  mdiAccount,
  mdiFile,
  mdiOpenInNew,
  mdiPencilOutline,
  mdiWeb,
} from "@mdi/js";
import Fuse from "fuse.js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { stringCompare } from "../../../common/string/compare";
import "../../../components/ha-adaptive-dialog";
import "../../../components/ha-icon-next";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-spinner";
import "../../../components/ha-tip";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
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
import {
  type FuseWeightedKey,
  multiTermSearch,
} from "../../../resources/fuseMultiTerm";
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

const BLUEPRINT_SEARCH_KEYS: FuseWeightedKey[] = [
  { name: "name", weight: 10 },
  { name: "description", weight: 7 },
  { name: "author", weight: 5 },
  { name: "sourceType", weight: 3 },
];

@customElement("ha-dialog-new-automation")
class DialogNewAutomation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _params?: NewAutomationDialogParams;

  @state() private _mode: BlueprintDomain = "automation";

  @state() public blueprints?: Blueprints;

  @state() private _loadingBlueprints = false;

  @state() private _filter = "";

  public showDialog(params: NewAutomationDialogParams): void {
    this._params = params;
    this._open = true;
    this._mode = params?.mode || "automation";
    this._filter = "";
    this.blueprints = undefined;
    this._loadingBlueprints = true;

    fetchBlueprints(this.hass!, this._mode)
      .then((blueprints) => {
        this.blueprints = blueprints;
      })
      .finally(() => {
        this._loadingBlueprints = false;
      });
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this.blueprints = undefined;
    this._loadingBlueprints = false;
    this._filter = "";
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

  private _blueprintFuseIndex = memoizeOne(
    (blueprints: ReturnType<DialogNewAutomation["_processedBlueprints"]>) =>
      Fuse.createIndex(BLUEPRINT_SEARCH_KEYS, blueprints)
  );

  private _filteredBlueprints = memoizeOne(
    (
      blueprints: ReturnType<DialogNewAutomation["_processedBlueprints"]>,
      filter: string
    ) =>
      multiTermSearch(
        blueprints,
        filter,
        BLUEPRINT_SEARCH_KEYS,
        this._blueprintFuseIndex(blueprints)
      )
  );

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const processedBlueprints = this._processedBlueprints(this.blueprints);
    const filteredBlueprints = this._filteredBlueprints(
      processedBlueprints,
      this._filter
    );

    return html`
      <ha-adaptive-dialog
        .hass=${this.hass}
        .open=${this._open}
        flexcontent
        header-title=${this.hass.localize(
          `ui.panel.config.${this._mode}.dialog_new.header`
        )}
        @closed=${this._dialogClosed}
      >
        <div class="content-wrapper">
          ${processedBlueprints.length > 5
            ? html`<ha-input-search
                autofocus
                .value=${this._filter}
                .label=${this.hass.localize("ui.common.search")}
                @input=${this._handleSearchChange}
              ></ha-input-search>`
            : nothing}
          <ha-list>
            <ha-list-item
              hasmeta
              twoline
              graphic="icon"
              @request-selected=${this._blank}
            >
              <ha-svg-icon
                slot="graphic"
                .path=${mdiPencilOutline}
              ></ha-svg-icon>
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
          </ha-list>
          <div class="blueprints-container">
            <div class="blueprints-list ha-scrollbar">
              ${this._loadingBlueprints
                ? html`<div class="spinner">
                    <ha-spinner></ha-spinner>
                  </div>`
                : html`
                    <ha-list>
                      ${filteredBlueprints.map(
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
                    </ha-list>
                    ${processedBlueprints.length === 0
                      ? html`
                          <a
                            href=${documentationUrl(
                              this.hass,
                              "/get-blueprints"
                            )}
                            target="_blank"
                            rel="noreferrer noopener"
                            class="item"
                          >
                            <ha-list-item hasmeta twoline graphic="icon">
                              <ha-svg-icon
                                slot="graphic"
                                .path=${mdiWeb}
                              ></ha-svg-icon>
                              ${this.hass.localize(
                                `ui.panel.config.${this._mode}.dialog_new.create_blueprint`
                              )}
                              <span slot="secondary">
                                ${this.hass.localize(
                                  `ui.panel.config.${this._mode}.dialog_new.create_blueprint_description`
                                )}
                              </span>
                              <ha-svg-icon
                                slot="meta"
                                path=${mdiOpenInNew}
                              ></ha-svg-icon>
                            </ha-list-item>
                          </a>
                        `
                      : filteredBlueprints.length === 0
                        ? html`
                            <div class="empty-search">
                              ${this.hass.localize(
                                `ui.panel.config.${this._mode}.dialog_new.no_blueprints_match_search`
                              )}
                            </div>
                          `
                        : nothing}
                    ${processedBlueprints.length > 0
                      ? html`
                          <ha-tip .hass=${this.hass}>
                            <a
                              href=${documentationUrl(
                                this.hass,
                                "/get-blueprints"
                              )}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              ${this.hass.localize(
                                `ui.panel.config.${this._mode}.dialog_new.discover_blueprint_tip`
                              )}
                            </a>
                          </ha-tip>
                        `
                      : nothing}
                  `}
            </div>
          </div>
        </div>
      </ha-adaptive-dialog>
    `;
  }

  private _handleSearchChange(ev: InputEvent) {
    this._filter = (ev.target as HaInputSearch).value ?? "";
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
        ha-adaptive-dialog {
          --dialog-content-padding: 0;
          --ha-dialog-min-height: min(
            720px,
            calc(
              100dvh - max(
                  var(--safe-area-inset-bottom),
                  var(--ha-space-4)
                ) - max(var(--safe-area-inset-top), var(--ha-space-4))
            )
          );
          --ha-dialog-max-height: var(--ha-dialog-min-height);
        }
        :host {
          --ha-bottom-sheet-height: min(85vh, 85dvh);
          --ha-bottom-sheet-max-height: min(85vh, 85dvh);
        }
        @media all and (min-width: 550px) {
          ha-adaptive-dialog {
            --mdc-dialog-min-width: 500px;
          }
        }
        .content-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 0;
          height: 100%;
        }
        .blueprints-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          border-top: 1px solid var(--divider-color);
        }
        ha-input-search {
          display: block;
          --ha-input-padding-bottom: 0;
        }
        .blueprints-list {
          overflow-y: auto;
          min-height: 0;
          padding-bottom: var(--ha-space-2);
        }
        .spinner {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-8) 0;
        }
        ha-icon-next {
          width: 24px;
        }
        ha-tip {
          margin: var(--ha-space-2) var(--ha-space-4);
        }
        .empty-search {
          color: var(--secondary-text-color);
          padding: var(--ha-space-4);
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
