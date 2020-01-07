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
  AutomationConfig,
  AutomationEntity,
  Condition,
  deleteAutomation,
  getAutomationEditorInitData,
  Trigger,
} from "../../../data/automation";
import { Action } from "../../../data/script";
import { showConfirmationDialog } from "../../../dialogs/confirmation/show-dialog-confirmation";
import "../../../layouts/ha-app-layout";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "./action/ha-automation-action";
import "./condition/ha-automation-condition";
import "./trigger/ha-automation-trigger";

export class HaAutomationEditor extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public automation!: AutomationEntity;
  @property() public isWide?: boolean;
  @property() public creatingNew?: boolean;
  @property() private _config?: AutomationConfig;
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
              ${this.automation
                ? computeStateName(this.automation)
                : this.hass.localize(
                    "ui.panel.config.automation.editor.default_name"
                  )}
            </div>
            ${this.creatingNew
              ? ""
              : html`
                  <paper-icon-button
                    title="${this.hass.localize(
                      "ui.panel.config.automation.picker.delete_automation"
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
                        "ui.panel.config.automation.editor.introduction"
                      )}
                    </span>
                    <ha-card>
                      <div class="card-content">
                        <paper-input
                          .label=${this.hass.localize(
                            "ui.panel.config.automation.editor.alias"
                          )}
                          name="alias"
                          .value=${this._config.alias}
                          @value-changed=${this._valueChanged}
                        >
                        </paper-input>
                        <ha-textarea
                          .label=${this.hass.localize(
                            "ui.panel.config.automation.editor.description.label"
                          )}
                          .placeholder=${this.hass.localize(
                            "ui.panel.config.automation.editor.description.placeholder"
                          )}
                          name="description"
                          .value=${this._config.description}
                          @value-changed=${this._valueChanged}
                        ></ha-textarea>
                      </div>
                    </ha-card>
                  </ha-config-section>

                  <ha-config-section .isWide=${this.isWide}>
                    <span slot="header">
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.triggers.header"
                      )}
                    </span>
                    <span slot="introduction">
                      <p>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.triggers.introduction"
                        )}
                      </p>
                      <a
                        href="https://home-assistant.io/docs/automation/trigger/"
                        target="_blank"
                      >
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.triggers.learn_more"
                        )}
                      </a>
                    </span>
                    <ha-automation-trigger
                      .triggers=${this._config.trigger}
                      @value-changed=${this._triggerChanged}
                      .hass=${this.hass}
                    ></ha-automation-trigger>
                  </ha-config-section>

                  <ha-config-section .isWide=${this.isWide}>
                    <span slot="header">
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.conditions.header"
                      )}
                    </span>
                    <span slot="introduction">
                      <p>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.conditions.introduction"
                        )}
                      </p>
                      <a
                        href="https://home-assistant.io/docs/scripts/conditions/"
                        target="_blank"
                      >
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.conditions.learn_more"
                        )}
                      </a>
                    </span>
                    <ha-automation-condition
                      .conditions=${this._config.condition || []}
                      @value-changed=${this._conditionChanged}
                      .hass=${this.hass}
                    ></ha-automation-condition>
                  </ha-config-section>

                  <ha-config-section .isWide=${this.isWide}>
                    <span slot="header">
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.actions.header"
                      )}
                    </span>
                    <span slot="introduction">
                      <p>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.introduction"
                        )}
                      </p>
                      <a
                        href="https://home-assistant.io/docs/automation/action/"
                        target="_blank"
                      >
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.learn_more"
                        )}
                      </a>
                    </span>
                    <ha-automation-action
                      .actions=${this._config.action}
                      @value-changed=${this._actionChanged}
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
          .title="${this.hass.localize(
            "ui.panel.config.automation.editor.save"
          )}"
          @click=${this._saveAutomation}
          class="${classMap({
            rtl: computeRTL(this.hass),
          })}"
        ></ha-fab>
      </ha-app-layout>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const oldAutomation = changedProps.get("automation") as AutomationEntity;
    if (
      changedProps.has("automation") &&
      this.automation &&
      this.hass &&
      // Only refresh config if we picked a new automation. If same ID, don't fetch it.
      (!oldAutomation ||
        oldAutomation.attributes.id !== this.automation.attributes.id)
    ) {
      this.hass
        .callApi<AutomationConfig>(
          "GET",
          `config/automation/config/${this.automation.attributes.id}`
        )
        .then(
          (config) => {
            // Normalize data: ensure trigger, action and condition are lists
            // Happens when people copy paste their automations into the config
            for (const key of ["trigger", "condition", "action"]) {
              const value = config[key];
              if (value && !Array.isArray(value)) {
                config[key] = [value];
              }
            }
            this._dirty = false;
            this._config = config;
          },
          (resp) => {
            alert(
              resp.status_code === 404
                ? this.hass.localize(
                    "ui.panel.config.automation.editor.load_error_not_editable"
                  )
                : this.hass.localize(
                    "ui.panel.config.automation.editor.load_error_unknown",
                    "err_no",
                    resp.status_code
                  )
            );
            history.back();
          }
        );
    }

    if (changedProps.has("creatingNew") && this.creatingNew && this.hass) {
      const initData = getAutomationEditorInitData();
      this._dirty = initData ? true : false;
      this._config = {
        alias: this.hass.localize(
          "ui.panel.config.automation.editor.default_name"
        ),
        description: "",
        trigger: [{ platform: "state" }],
        condition: [],
        action: [{ service: "" }],
        ...initData,
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

  private _triggerChanged(ev: CustomEvent): void {
    this._config = { ...this._config!, trigger: ev.detail.value as Trigger[] };
    this._errors = undefined;
    this._dirty = true;
  }

  private _conditionChanged(ev: CustomEvent): void {
    this._config = {
      ...this._config!,
      condition: ev.detail.value as Condition[],
    };
    this._errors = undefined;
    this._dirty = true;
  }

  private _actionChanged(ev: CustomEvent): void {
    this._config = { ...this._config!, action: ev.detail.value as Action[] };
    this._errors = undefined;
    this._dirty = true;
  }

  private _backTapped(): void {
    if (this._dirty) {
      showConfirmationDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.automation.editor.unsaved_confirm"
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
        this.hass.localize("ui.panel.config.automation.picker.delete_confirm")
      )
    ) {
      return;
    }
    await deleteAutomation(this.hass, this.automation.attributes.id!);
    history.back();
  }

  private _saveAutomation(): void {
    const id = this.creatingNew
      ? "" + Date.now()
      : this.automation.attributes.id;
    this.hass!.callApi(
      "POST",
      "config/automation/config/" + id,
      this._config
    ).then(
      () => {
        this._dirty = false;

        if (this.creatingNew) {
          navigate(this, `/config/automation/edit/${id}`, true);
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

customElements.define("ha-automation-editor", HaAutomationEditor);
