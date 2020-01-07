import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-fab";
import "../../../components/ha-paper-icon-button-arrow-prev";
import {
  Action,
  ScriptEntity,
  ScriptConfig,
  deleteScript,
} from "../../../data/script";
import { showConfirmationDialog } from "../../../dialogs/confirmation/show-dialog-confirmation";
import "../../../layouts/ha-app-layout";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../automation/action/ha-automation-action";
import { computeObjectId } from "../../../common/entity/compute_object_id";

export class HaScriptEditor extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public script!: ScriptEntity;
  @property() public isWide?: boolean;
  @property() public creatingNew?: boolean;
  @property() private _config?: ScriptConfig;
  @property() private _dirty?: boolean;
  @property() private _errors?: string;

  protected render(): TemplateResult | void {
    return html`
      <ha-app-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-paper-icon-button-arrow-prev
              @click=${this._backTapped}
            ></ha-paper-icon-button-arrow-prev>
            <div main-title>
              ${this.script
                ? computeStateName(this.script)
                : this.hass.localize(
                    "ui.panel.config.script.editor.default_name"
                  )}
            </div>
            ${this.creatingNew
              ? ""
              : html`
                  <paper-icon-button
                    title="${this.hass.localize(
                      "ui.panel.config.script.editor.delete_script"
                    )}"
                    icon="hass:delete"
                    @click=${this._delete}
                  ></paper-icon-button>
                `}
          </app-toolbar>
        </app-header>

        <div class="content">
          ${this._errors
            ? html`
                <div class="errors">${this._errors}</div>
              `
            : ""}
          <div
            class="${classMap({
              rtl: computeRTL(this.hass),
            })}"
          >
            ${this._config
              ? html`
                  <ha-config-section .isWide=${this.isWide}>
                    <span slot="header">${this._config.alias}</span>
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
                        >
                        </paper-input>
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
        <ha-fab
          slot="fab"
          ?is-wide="${this.isWide}"
          ?dirty="${this._dirty}"
          icon="hass:content-save"
          .title="${this.hass.localize("ui.common.save")}"
          @click=${this._saveScript}
          class="${classMap({
            rtl: computeRTL(this.hass),
          })}"
        ></ha-fab>
      </ha-app-layout>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const oldScript = changedProps.get("script") as ScriptEntity;
    if (
      changedProps.has("script") &&
      this.script &&
      this.hass &&
      // Only refresh config if we picked a new script. If same ID, don't fetch it.
      (!oldScript || oldScript.entity_id !== this.script.entity_id)
    ) {
      this.hass
        .callApi<ScriptConfig>(
          "GET",
          `config/script/config/${computeObjectId(this.script.entity_id)}`
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

    if (changedProps.has("creatingNew") && this.creatingNew && this.hass) {
      this._dirty = false;
      this._config = {
        alias: this.hass.localize("ui.panel.config.script.editor.default_name"),
        sequence: [{ service: "" }],
      };
    }
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const name = (ev.target as any)?.name;
    if (!name) {
      return;
    }
    const newVal = ev.detail.value;

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
        confirmBtnText: this.hass!.localize("ui.common.yes"),
        cancelBtnText: this.hass!.localize("ui.common.no"),
        confirm: () => history.back(),
      });
    } else {
      history.back();
    }
  }

  private async _delete() {
    if (
      !confirm(
        this.hass.localize("ui.panel.config.script.editor.delete_confirm")
      )
    ) {
      return;
    }
    await deleteScript(this.hass, computeObjectId(this.script.entity_id));
    history.back();
  }

  private _saveScript(): void {
    const id = this.creatingNew
      ? "" + Date.now()
      : computeObjectId(this.script.entity_id);
    this.hass!.callApi("POST", "config/script/config/" + id, this._config).then(
      () => {
        this._dirty = false;

        if (this.creatingNew) {
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
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--google-red-500);
        }
        .content {
          padding-bottom: 20px;
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        ha-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
          margin-bottom: -80px;
          transition: margin-bottom 0.3s;
        }

        ha-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }

        ha-fab[dirty] {
          margin-bottom: 0;
        }

        ha-fab.rtl {
          right: auto;
          left: 16px;
        }

        ha-fab[is-wide].rtl {
          bottom: 24px;
          right: auto;
          left: 24px;
        }
      `,
    ];
  }
}

customElements.define("ha-script-editor", HaScriptEditor);
