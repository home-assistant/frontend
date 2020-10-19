import "@material/mwc-fab";
import { mdiCheck, mdiContentSave, mdiDelete, mdiDotsVertical } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@material/mwc-list/mwc-list-item";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import { PaperListboxElement } from "@polymer/paper-listbox";
import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  query,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { navigate } from "../../../common/navigate";
import { slugify } from "../../../common/string/slugify";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-input";
import "../../../components/ha-svg-icon";
import "../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../components/ha-yaml-editor";
import {
  Action,
  deleteScript,
  getScriptEditorInitData,
  MODES,
  MODES_MAX,
  ScriptConfig,
  triggerScript,
} from "../../../data/script";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/ha-app-layout";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import "../automation/action/ha-automation-action";
import { HaDeviceAction } from "../automation/action/types/ha-automation-action-device_id";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";

export class HaScriptEditor extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public scriptEntityId!: string;

  @property() public route!: Route;

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @internalProperty() private _config?: ScriptConfig;

  @internalProperty() private _entityId?: string;

  @internalProperty() private _idError = false;

  @internalProperty() private _dirty = false;

  @internalProperty() private _errors?: string;

  @internalProperty() private _mode: "gui" | "yaml" = "gui";

  @query("ha-yaml-editor", true) private _editor?: HaYamlEditor;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${() => this._backTapped()}
        .tabs=${configSections.automation}
      >
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleMenuAction}
          activatable
        >
          <mwc-icon-button
            slot="trigger"
            .title=${this.hass.localize("ui.common.menu")}
            .label=${this.hass.localize("ui.common.overflow_menu")}
            ><ha-svg-icon path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>

          <mwc-list-item
            aria-label=${this.hass.localize(
              "ui.panel.config.automation.editor.edit_ui"
            )}
            graphic="icon"
            ?activated=${this._mode === "gui"}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.edit_ui")}
            ${this._mode === "gui"
              ? html` <ha-svg-icon
                  class="selected_menu_item"
                  slot="graphic"
                  .path=${mdiCheck}
                ></ha-svg-icon>`
              : ``}
          </mwc-list-item>
          <mwc-list-item
            aria-label=${this.hass.localize(
              "ui.panel.config.automation.editor.edit_yaml"
            )}
            graphic="icon"
            ?activated=${this._mode === "yaml"}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.edit_yaml")}
            ${this._mode === "yaml"
              ? html` <ha-svg-icon
                  class="selected_menu_item"
                  slot="graphic"
                  .path=${mdiCheck}
                ></ha-svg-icon>`
              : ``}
          </mwc-list-item>

          <li divider role="separator"></li>

          <mwc-list-item
            .disabled=${!this.scriptEntityId}
            aria-label=${this.hass.localize(
              "ui.panel.config.script.editor.delete_script"
            )}
            class=${classMap({ warning: this.scriptEntityId })}
            graphic="icon"
          >
            ${this.hass.localize("ui.panel.config.script.editor.delete_script")}
            <ha-svg-icon
              class=${classMap({ warning: this.scriptEntityId })}
              slot="graphic"
              .path=${mdiDelete}
            >
            </ha-svg-icon>
          </mwc-list-item>
        </ha-button-menu>
        ${this.narrow
          ? html` <span slot="header">${this._config?.alias}</span> `
          : ""}
        <div class="content">
          ${this._errors
            ? html` <div class="errors">${this._errors}</div> `
            : ""}
          ${this._mode === "gui"
            ? html`
                <div
                  class=${classMap({
                    rtl: computeRTL(this.hass),
                  })}
                >
                  ${this._config
                    ? html`
                        <ha-config-section .isWide=${this.isWide}>
                          ${!this.narrow
                            ? html`
                                <span slot="header">${this._config.alias}</span>
                              `
                            : ""}
                          <span slot="introduction">
                            ${this.hass.localize(
                              "ui.panel.config.script.editor.introduction"
                            )}
                          </span>
                          <ha-card>
                            <div class="card-content">
                              <paper-input
                                .label=${this.hass.localize(
                                  "ui.panel.config.script.editor.alias"
                                )}
                                name="alias"
                                .value=${this._config.alias}
                                @value-changed=${this._valueChanged}
                                @change=${this._aliasChanged}
                              >
                              </paper-input>
                              <ha-icon-input
                                .label=${this.hass.localize(
                                  "ui.panel.config.script.editor.icon"
                                )}
                                .name=${"icon"}
                                .value=${this._config.icon}
                                @value-changed=${this._valueChanged}
                              >
                              </ha-icon-input>
                              ${!this.scriptEntityId
                                ? html`<paper-input
                                    .label=${this.hass.localize(
                                      "ui.panel.config.script.editor.id"
                                    )}
                                    .errorMessage=${this.hass.localize(
                                      "ui.panel.config.script.editor.id_already_exists"
                                    )}
                                    .invalid=${this._idError}
                                    .value=${this._entityId}
                                    @value-changed=${this._idChanged}
                                  >
                                  </paper-input>`
                                : ""}
                              <p>
                                ${this.hass.localize(
                                  "ui.panel.config.script.editor.modes.description",
                                  "documentation_link",
                                  html`<a
                                    href="${documentationUrl(
                                      this.hass,
                                      "/integrations/script/#script-modes"
                                    )}"
                                    target="_blank"
                                    rel="noreferrer"
                                    >${this.hass.localize(
                                      "ui.panel.config.script.editor.modes.documentation"
                                    )}</a
                                  >`
                                )}
                              </p>
                              <paper-dropdown-menu-light
                                .label=${this.hass.localize(
                                  "ui.panel.config.script.editor.modes.label"
                                )}
                                no-animations
                              >
                                <paper-listbox
                                  slot="dropdown-content"
                                  .selected=${this._config.mode
                                    ? MODES.indexOf(this._config.mode)
                                    : 0}
                                  @iron-select=${this._modeChanged}
                                >
                                  ${MODES.map(
                                    (mode) => html`
                                      <paper-item .mode=${mode}>
                                        ${this.hass.localize(
                                          `ui.panel.config.script.editor.modes.${mode}`
                                        ) || mode}
                                      </paper-item>
                                    `
                                  )}
                                </paper-listbox>
                              </paper-dropdown-menu-light>
                              ${this._config.mode &&
                              MODES_MAX.includes(this._config.mode)
                                ? html`<paper-input
                                    .label=${this.hass.localize(
                                      `ui.panel.config.script.editor.max.${this._config.mode}`
                                    )}
                                    type="number"
                                    name="max"
                                    .value=${this._config.max || "10"}
                                    @value-changed=${this._valueChanged}
                                  >
                                  </paper-input>`
                                : html``}
                            </div>
                            ${this.scriptEntityId
                              ? html`
                                  <div
                                    class="card-actions layout horizontal justified center"
                                  >
                                    <span></span>
                                    <mwc-button
                                      @click=${this._runScript}
                                      title="${this.hass.localize(
                                        "ui.panel.config.script.picker.activate_script"
                                      )}"
                                      ?disabled=${this._dirty}
                                    >
                                      ${this.hass.localize(
                                        "ui.card.script.execute"
                                      )}
                                    </mwc-button>
                                  </div>
                                `
                              : ``}
                          </ha-card>
                        </ha-config-section>

                        <ha-config-section .isWide=${this.isWide}>
                          <span slot="header">
                            ${this.hass.localize(
                              "ui.panel.config.script.editor.sequence"
                            )}
                          </span>
                          <span slot="introduction">
                            <p>
                              ${this.hass.localize(
                                "ui.panel.config.script.editor.sequence_sentence"
                              )}
                            </p>
                            <a
                              href="${documentationUrl(
                                this.hass,
                                "/docs/scripts/"
                              )}"
                              target="_blank"
                              rel="noreferrer"
                            >
                              ${this.hass.localize(
                                "ui.panel.config.script.editor.link_available_actions"
                              )}
                            </a>
                          </span>
                          <ha-automation-action
                            .actions=${this._config.sequence}
                            @value-changed=${this._sequenceChanged}
                            .hass=${this.hass}
                          ></ha-automation-action>
                        </ha-config-section>
                      `
                    : ""}
                </div>
              `
            : this._mode === "yaml"
            ? html`
                <ha-config-section .isWide=${false}>
                  ${!this.narrow
                    ? html`<span slot="header">${this._config?.alias}</span>`
                    : ``}
                  <ha-card>
                    <div class="card-content">
                      <ha-yaml-editor
                        .defaultValue=${this._preprocessYaml()}
                        @value-changed=${this._yamlChanged}
                      ></ha-yaml-editor>
                      <mwc-button @click=${this._copyYaml}>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.copy_to_clipboard"
                        )}
                      </mwc-button>
                    </div>
                    ${this.scriptEntityId
                      ? html`
                          <div
                            class="card-actions layout horizontal justified center"
                          >
                            <span></span>
                            <mwc-button
                              @click=${this._runScript}
                              title="${this.hass.localize(
                                "ui.panel.config.script.picker.activate_script"
                              )}"
                              ?disabled=${this._dirty}
                            >
                              ${this.hass.localize("ui.card.script.execute")}
                            </mwc-button>
                          </div>
                        `
                      : ``}
                  </ha-card>
                </ha-config-section>
              `
            : ``}
        </div>
        <mwc-fab
          slot="fab"
          .title=${this.hass.localize(
            "ui.panel.config.script.editor.save_script"
          )}
          @click=${this._saveScript}
          class=${classMap({
            dirty: this._dirty,
          })}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </mwc-fab>
      </hass-tabs-subpage>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const oldScript = changedProps.get("scriptEntityId");
    if (
      changedProps.has("scriptEntityId") &&
      this.scriptEntityId &&
      this.hass &&
      // Only refresh config if we picked a new script. If same ID, don't fetch it.
      (!oldScript || oldScript !== this.scriptEntityId)
    ) {
      this.hass
        .callApi<ScriptConfig>(
          "GET",
          `config/script/config/${computeObjectId(this.scriptEntityId)}`
        )
        .then(
          (config) => {
            // Normalize data: ensure sequence is a list
            // Happens when people copy paste their scripts into the config
            const value = config.sequence;
            if (value && !Array.isArray(value)) {
              config.sequence = [value];
            }
            this._dirty = false;
            this._config = config;
          },
          (resp) => {
            alert(
              resp.status_code === 404
                ? this.hass.localize(
                    "ui.panel.config.script.editor.load_error_not_editable"
                  )
                : this.hass.localize(
                    "ui.panel.config.script.editor.load_error_unknown",
                    "err_no",
                    resp.status_code
                  )
            );
            history.back();
          }
        );
    }

    if (
      changedProps.has("scriptEntityId") &&
      !this.scriptEntityId &&
      this.hass
    ) {
      const initData = getScriptEditorInitData();
      this._dirty = !!initData;
      this._config = {
        alias: this.hass.localize("ui.panel.config.script.editor.default_name"),
        sequence: [{ ...HaDeviceAction.defaultConfig }],
        ...initData,
      };
    }
  }

  private async _runScript(ev) {
    ev.stopPropagation();
    await triggerScript(this.hass, this.scriptEntityId);
    showToast(this, {
      message: this.hass.localize(
        "ui.notification_toast.triggered",
        "name",
        this._config!.alias
      ),
    });
  }

  private _modeChanged(ev: CustomEvent) {
    const mode = ((ev.target as PaperListboxElement)?.selectedItem as any)
      ?.mode;

    if (mode === this._config!.mode) {
      return;
    }

    this._config = { ...this._config!, mode };
    if (!MODES_MAX.includes(mode)) {
      delete this._config.max;
    }
    this._dirty = true;
  }

  private _aliasChanged(ev: CustomEvent) {
    if (this.scriptEntityId || this._entityId) {
      return;
    }
    const aliasSlugify = slugify((ev.target as any).value);
    let id = aliasSlugify;
    let i = 2;
    while (this.hass.states[`script.${id}`]) {
      id = `${aliasSlugify}_${i}`;
      i++;
    }
    this._entityId = id;
  }

  private _idChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._entityId = (ev.target as any).value;
    if (this.hass.states[`script.${this._entityId}`]) {
      this._idError = true;
    } else {
      this._idError = false;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    const name = target.name;
    if (!name) {
      return;
    }
    let newVal = ev.detail.value;
    if (target.type === "number") {
      newVal = Number(newVal);
    }
    if ((this._config![name] || "") === newVal) {
      return;
    }
    this._config = { ...this._config!, [name]: newVal };
    this._dirty = true;
  }

  private _sequenceChanged(ev: CustomEvent): void {
    this._config = { ...this._config!, sequence: ev.detail.value as Action[] };
    this._errors = undefined;
    this._dirty = true;
  }

  private _preprocessYaml() {
    return this._config;
  }

  private async _copyYaml() {
    if (this._editor?.yaml) {
      navigator.clipboard.writeText(this._editor.yaml);
    }
  }

  private _yamlChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    this._config = ev.detail.value;
    this._errors = undefined;
    this._dirty = true;
  }

  private _backTapped(): void {
    if (this._dirty) {
      showConfirmationDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.common.editor.confirm_unsaved"
        ),
        confirmText: this.hass!.localize("ui.common.yes"),
        dismissText: this.hass!.localize("ui.common.no"),
        confirm: () => history.back(),
      });
    } else {
      history.back();
    }
  }

  private async _deleteConfirm() {
    showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.config.script.editor.delete_confirm"),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      confirm: () => this._delete(),
    });
  }

  private async _delete() {
    await deleteScript(this.hass, computeObjectId(this.scriptEntityId));
    history.back();
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._mode = "gui";
        break;
      case 1:
        this._mode = "yaml";
        break;
      case 2:
        this._deleteConfirm();
        break;
    }
  }

  private _saveScript(): void {
    if (this._idError) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.script.editor.id_already_exists_save_error"
        ),
        dismissable: false,
        duration: 0,
        action: {
          action: () => {},
          text: this.hass.localize("ui.dialogs.generic.ok"),
        },
      });
      return;
    }
    const id = this.scriptEntityId
      ? computeObjectId(this.scriptEntityId)
      : this._entityId || Date.now();
    this.hass!.callApi("POST", "config/script/config/" + id, this._config).then(
      () => {
        this._dirty = false;

        if (!this.scriptEntityId) {
          navigate(this, `/config/script/edit/${id}`, true);
        }
      },
      (errors) => {
        this._errors = errors.body.message;
        showToast(this, {
          message: errors.body.message,
        });
        throw errors;
      }
    );
  }

  protected handleKeyboardSave() {
    this._saveScript();
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        p {
          margin-bottom: 0;
        }
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--error-color);
        }
        .content {
          padding-bottom: 20px;
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        mwc-fab {
          position: relative;
          bottom: calc(-80px - env(safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        mwc-fab.dirty {
          bottom: 0;
        }
        .selected_menu_item {
          color: var(--primary-color);
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
      `,
    ];
  }
}

customElements.define("ha-script-editor", HaScriptEditor);
