import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import {
  mdiCheck,
  mdiContentDuplicate,
  mdiContentSave,
  mdiDelete,
  mdiDotsVertical,
} from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import { PaperListboxElement } from "@polymer/paper-listbox";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { navigate } from "../../../common/navigate";
import { slugify } from "../../../common/string/slugify";
import { computeRTL } from "../../../common/util/compute_rtl";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-fab";
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
  showScriptEditor,
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

  @property() public scriptEntityId: string | null = null;

  @property() public route!: Route;

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @state() private _config?: ScriptConfig;

  @state() private _entityId?: string;

  @state() private _idError = false;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _mode: "gui" | "yaml" = "gui";

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
            .label=${this.hass.localize(
              "ui.panel.config.script.picker.duplicate_script"
            )}
            graphic="icon"
          >
            ${this.hass.localize(
              "ui.panel.config.script.picker.duplicate_script"
            )}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiContentDuplicate}
            ></ha-svg-icon>
          </mwc-list-item>

          <mwc-list-item
            .disabled=${!this.scriptEntityId}
            aria-label=${this.hass.localize(
              "ui.panel.config.script.editor.delete_script"
            )}
            class=${classMap({ warning: Boolean(this.scriptEntityId) })}
            graphic="icon"
          >
            ${this.hass.localize("ui.panel.config.script.editor.delete_script")}
            <ha-svg-icon
              class=${classMap({ warning: Boolean(this.scriptEntityId) })}
              slot="graphic"
              .path=${mdiDelete}
            >
            </ha-svg-icon>
          </mwc-list-item>
        </ha-button-menu>
        ${this.narrow
          ? html` <span slot="header">${this._config?.alias}</span> `
          : ""}
        <div
          class="content ${classMap({
            "yaml-mode": this._mode === "yaml",
          })}"
        >
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
                        <ha-config-section vertical .isWide=${this.isWide}>
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
                                    <a
                                      href="/config/script/trace/${this
                                        .scriptEntityId}"
                                    >
                                      <mwc-button>
                                        ${this.hass.localize(
                                          "ui.panel.config.script.editor.show_trace"
                                        )}
                                      </mwc-button>
                                    </a>
                                    <mwc-button
                                      @click=${this._runScript}
                                      title="${this.hass.localize(
                                        "ui.panel.config.script.picker.run_script"
                                      )}"
                                      ?disabled=${this._dirty}
                                    >
                                      ${this.hass.localize(
                                        "ui.panel.config.script.picker.run_script"
                                      )}
                                    </mwc-button>
                                  </div>
                                `
                              : ``}
                          </ha-card>
                        </ha-config-section>

                        <ha-config-section vertical .isWide=${this.isWide}>
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
                ${!this.narrow
                  ? html`
                      <ha-card
                        ><div class="card-header">${this._config?.alias}</div>
                        <div
                          class="card-actions layout horizontal justified center"
                        >
                          <mwc-button
                            @click=${this._runScript}
                            title="${this.hass.localize(
                              "ui.panel.config.script.picker.run_script"
                            )}"
                            ?disabled=${this._dirty}
                          >
                            ${this.hass.localize(
                              "ui.panel.config.script.picker.run_script"
                            )}
                          </mwc-button>
                        </div>
                      </ha-card>
                    `
                  : ``}
                <ha-yaml-editor
                  .defaultValue=${this._preprocessYaml()}
                  @value-changed=${this._yamlChanged}
                ></ha-yaml-editor>
                <ha-card
                  ><div class="card-actions">
                    <mwc-button @click=${this._copyYaml}>
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.copy_to_clipboard"
                      )}
                    </mwc-button>
                  </div>
                </ha-card>
              `
            : ``}
        </div>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.script.editor.save_script"
          )}
          extended
          @click=${this._saveScript}
          class=${classMap({
            dirty: this._dirty,
          })}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </ha-fab>
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
    await triggerScript(this.hass, this.scriptEntityId as string);
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
    if (!newVal) {
      delete this._config![name];
      this._config = { ...this._config! };
    } else {
      this._config = { ...this._config!, [name]: newVal };
    }
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

  private async _copyYaml(): Promise<void> {
    if (this._editor?.yaml) {
      await copyToClipboard(this._editor.yaml);
      showToast(this, {
        message: this.hass.localize("ui.common.copied_clipboard"),
      });
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
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
        confirm: () => history.back(),
      });
    } else {
      history.back();
    }
  }

  private async _duplicate() {
    if (this._dirty) {
      if (
        !(await showConfirmationDialog(this, {
          text: this.hass!.localize(
            "ui.panel.config.common.editor.confirm_unsaved"
          ),
          confirmText: this.hass!.localize("ui.common.yes"),
          dismissText: this.hass!.localize("ui.common.no"),
        }))
      ) {
        return;
      }
      // Wait for dialog to complate closing
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    showScriptEditor({
      ...this._config,
      alias: `${this._config?.alias} (${this.hass.localize(
        "ui.panel.config.script.picker.duplicate"
      )})`,
    });
  }

  private async _deleteConfirm() {
    showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.config.script.editor.delete_confirm"),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(),
    });
  }

  private async _delete() {
    await deleteScript(
      this.hass,
      computeObjectId(this.scriptEntityId as string)
    );
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
        this._duplicate();
        break;
      case 3:
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
          navigate(`/config/script/edit/${id}`, { replace: true });
        }
      },
      (errors) => {
        this._errors = errors.body.message || errors.error || errors.body;
        showToast(this, {
          message: errors.body.message || errors.error || errors.body,
        });
        throw errors;
      }
    );
  }

  protected handleKeyboardSave() {
    this._saveScript();
  }

  static get styles(): CSSResultGroup {
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
        .yaml-mode {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding-bottom: 0;
        }
        ha-yaml-editor {
          flex-grow: 1;
          --code-mirror-height: 100%;
          min-height: 0;
        }
        .yaml-mode ha-card {
          overflow: initial;
          --ha-card-border-radius: 0;
          border-bottom: 1px solid var(--divider-color);
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        ha-fab {
          position: relative;
          bottom: calc(-80px - env(safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        ha-fab.dirty {
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
