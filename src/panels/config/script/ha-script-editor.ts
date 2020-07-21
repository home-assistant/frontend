import "@polymer/app-layout/app-header/app-header";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "../../../components/ha-icon-button";
import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { navigate } from "../../../common/navigate";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-card";
import "../../../components/ha-icon-input";
import "@material/mwc-fab";
import {
  Action,
  deleteScript,
  getScriptEditorInitData,
  ScriptConfig,
  MODES,
  MODES_MAX,
} from "../../../data/script";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/ha-app-layout";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import "../automation/action/ha-automation-action";
import { HaDeviceAction } from "../automation/action/types/ha-automation-action-device_id";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "../../../components/ha-svg-icon";
import { mdiContentSave } from "@mdi/js";
import { PaperListboxElement } from "@polymer/paper-listbox";
import { slugify } from "../../../common/string/slugify";

export class HaScriptEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public scriptEntityId!: string;

  @property() public route!: Route;

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @internalProperty() private _config?: ScriptConfig;

  @internalProperty() private _entityId?: string;

  @internalProperty() private _idError = false;

  @internalProperty() private _dirty?: boolean;

  @internalProperty() private _errors?: string;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${() => this._backTapped()}
        .tabs=${configSections.automation}
      >
        ${!this.scriptEntityId
          ? ""
          : html`
              <ha-icon-button
                slot="toolbar-icon"
                title="${this.hass.localize(
                  "ui.panel.config.script.editor.delete_script"
                )}"
                icon="hass:delete"
                @click=${this._deleteConfirm}
              ></ha-icon-button>
            `}
        ${this.narrow
          ? html` <span slot="header">${this._config?.alias}</span> `
          : ""}
        <div class="content">
          ${this._errors
            ? html` <div class="errors">${this._errors}</div> `
            : ""}
          <div
            class="${classMap({
              rtl: computeRTL(this.hass),
            })}"
          >
            ${this._config
              ? html`
                  <ha-config-section .isWide=${this.isWide}>
                    ${!this.narrow
                      ? html` <span slot="header">${this._config.alias}</span> `
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
                          ? html` <paper-input
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
                              href="https://www.home-assistant.io/integrations/script/#script-modes"
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
                          ? html` <paper-input
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
                        href="https://home-assistant.io/docs/scripts/"
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
        </div>
        <mwc-fab
          ?is-wide=${this.isWide}
          ?narrow=${this.narrow}
          ?dirty=${this._dirty}
          .title="${this.hass.localize("ui.common.save")}"
          @click=${this._saveScript}
          class="${classMap({
            rtl: computeRTL(this.hass),
          })}"
        >
          <ha-svg-icon slot="icon" path=${mdiContentSave}></ha-svg-icon>
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

  private _modeChanged(ev: CustomEvent) {
    const mode = ((ev.target as PaperListboxElement)?.selectedItem as any)
      ?.mode;

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
    const aliasSlugify = slugify((ev.target as any).value, "_");
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

  private _saveScript(): void {
    if (this._idError) {
      this._errors = this.hass.localize(
        "ui.panel.config.script.editor.id_already_exists_save_error"
      );
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
        throw errors;
      }
    );
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
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 3;
          margin-bottom: -80px;
          transition: margin-bottom 0.3s;
        }

        mwc-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        mwc-fab[narrow] {
          bottom: 84px;
          margin-bottom: -140px;
        }
        mwc-fab[dirty] {
          margin-bottom: 0;
        }

        mwc-fab.rtl {
          right: auto;
          left: 16px;
        }

        mwc-fab[is-wide].rtl {
          bottom: 24px;
          right: auto;
          left: 24px;
        }
      `,
    ];
  }
}

customElements.define("ha-script-editor", HaScriptEditor);
