import {
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  PropertyDeclarations,
  PropertyValues,
} from "lit-element";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-fab/paper-fab";

import { h, render } from "preact";

import "../../../layouts/ha-app-layout";

import Automation from "../js/automation";
import unmountPreact from "../../../common/preact/unmount";
import computeStateName from "../../../common/entity/compute_state_name";

import { haStyle } from "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";
import { AutomationEntity, AutomationConfig } from "../../../data/automation";
import { navigate } from "../../../common/navigate";

function AutomationEditor(mountEl, props, mergeEl) {
  return render(h(Automation, props), mountEl, mergeEl);
}

class HaAutomationEditor extends LitElement {
  public hass?: HomeAssistant;
  public automation?: AutomationEntity;
  public isWide?: boolean;
  public creatingNew?: boolean;
  private _config?: AutomationConfig;
  private _dirty?: boolean;
  private _rendered?: unknown;
  private _errors?: string;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      automation: {},
      creatingNew: {},
      isWide: {},
      _errors: {},
      _dirty: {},
      _config: {},
    };
  }

  constructor() {
    super();
    this._configChanged = this._configChanged.bind(this);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._rendered) {
      unmountPreact(this._rendered);
      this._rendered = undefined;
    }
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return;
    }
    return html`
      <ha-app-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <paper-icon-button
              icon="hass:arrow-left"
              @click=${this._backTapped}
            ></paper-icon-button>
            <div main-title>
              ${this.automation
                ? computeStateName(this.automation)
                : this.hass.localize(
                    "ui.panel.config.automation.editor.default_name"
                  )}
            </div>
          </app-toolbar>
        </app-header>

        <div class="content">
          ${this._errors
            ? html`
                <div class="errors">${this._errors}</div>
              `
            : ""}
          <div id="root"></div>
        </div>
        <paper-fab
          slot="fab"
          ?is-wide="${this.isWide}"
          ?dirty="${this._dirty}"
          icon="hass:content-save"
          .title="${this.hass.localize(
            "ui.panel.config.automation.editor.save"
          )}"
          @click=${this._saveAutomation}
        ></paper-fab>
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
        .then((config) => {
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
        });
    }

    if (changedProps.has("creatingNew") && this.creatingNew && this.hass) {
      this._dirty = false;
      this._config = {
        alias: this.hass.localize(
          "ui.panel.config.automation.editor.default_name"
        ),
        trigger: [{ platform: "state" }],
        condition: [],
        action: [{ service: "" }],
      };
    }

    if (changedProps.has("_config") && this.hass) {
      this._rendered = AutomationEditor(
        this.shadowRoot!.querySelector("#root"),
        {
          automation: this._config,
          onChange: this._configChanged,
          isWide: this.isWide,
          hass: this.hass,
          localize: this.hass.localize,
        },
        this._rendered
      );
    }
  }

  private _configChanged(config: AutomationConfig): void {
    // onChange gets called a lot during initial rendering causing recursing calls.
    if (!this._rendered) {
      return;
    }
    this._config = config;
    this._errors = undefined;
    this._dirty = true;
    // this._updateComponent();
  }

  private _backTapped(): void {
    if (
      this._dirty &&
      !confirm(
        this.hass!.localize("ui.panel.config.automation.editor.unsaved_confirm")
      )
    ) {
      return;
    }
    history.back();
  }

  private _saveAutomation(): void {
    const id = this.creatingNew
      ? "" + Date.now()
      : this.automation!.attributes.id;
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
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--google-red-500);
        }
        .content {
          padding-bottom: 20px;
        }
        paper-card {
          display: block;
        }
        .triggers,
        .script {
          margin-top: -16px;
        }
        .triggers paper-card,
        .script paper-card {
          margin-top: 16px;
        }
        .add-card paper-button {
          display: block;
          text-align: center;
        }
        .card-menu {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 1;
          color: var(--primary-text-color);
        }
        .card-menu paper-item {
          cursor: pointer;
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        paper-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
          margin-bottom: -80px;
          transition: margin-bottom 0.3s;
        }

        paper-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }

        paper-fab[dirty] {
          margin-bottom: 0;
        }
      `,
    ];
  }
}

customElements.define("ha-automation-editor", HaAutomationEditor);
