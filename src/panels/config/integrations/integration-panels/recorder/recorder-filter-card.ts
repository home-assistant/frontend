import "@material/mwc-button";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/entity/ha-entities-picker";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { PolymerChangedEvent } from "../../../../../polymer-types";
import { updateRecorderConfig } from "../../../../../data/recorder";

export interface Filter {
  domains: string[];
  entities: string[];
  entity_globs: string[];
}

@customElement("recorder-filter-card")
class RecorderFilterCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public filter?: Filter;

  @property() public header = "";

  @property() public name = "";

  @property({ type: Boolean }) public hasAll = false;

  @state() private value: Record<string, string[]> = {};

  @state() private _includeAll = false;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <ha-card header=${this.header}>
        <div class="card-content">
          ${this.hasAll
            ? html`
            <ha-formfield
              label=${this.hass.localize(
                "ui.panel.config.recorder.include_all_label"
              )}>
              <ha-checkbox
                .checked=${this._includeAll}
                @change=${this._includeAllChanged}
              >
            </ha-formfield>
          `
            : ""}
          ${this.hasAll && this._includeAll
            ? ""
            : html`
                <paper-textarea
                  .value=${this._domains}
                  label=${this.hass.localize(
                    "ui.panel.config.recorder.filter.domains"
                  )}
                  name="domains"
                  @value-changed=${this._valueChanged}
                  autocapitalize="none"
                  autocomplete="off"
                  spellcheck="false"
                ></paper-textarea>

                <paper-textarea
                  .value=${this._entity_globs}
                  label=${this.hass.localize(
                    "ui.panel.config.recorder.filter.entity_globs"
                  )}
                  name="entity_globs"
                  @value-changed=${this._valueChanged}
                  autocapitalize="none"
                  autocomplete="off"
                  spellcheck="false"
                ></paper-textarea>

                <p>
                  ${this.hass.localize(
                    "ui.panel.config.recorder.filter.entities"
                  )}
                </p>
                <ha-entities-picker
                  .hass=${this.hass!}
                  .value=${this._entities}
                  @value-changed=${this._entitiesChanged}
                  label="with concrete list"
                >
                </ha-entities-picker>
              `}
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._submit}
            >${this.hass.localize("ui.common.save")}</mwc-button
          >
        </div>
      </ha-card>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("filter") && this.filter) {
      this._includeAll =
        this.filter.entity_globs.length === 0 &&
        this.filter.entities.length === 0 &&
        this.filter.domains.length === 0;
      this.value = { ...this.filter };
    }
  }

  private _includeAllChanged(ev: Event): void {
    if (!this.filter) {
      return;
    }
    this._includeAll = (ev.target as HaCheckbox).checked;
    if (this._includeAll) {
      this.value = {
        domains: [],
        entities: [],
        entity_globs: [],
      };
    } else {
      this.value = { ...this.filter };
    }
  }

  private get _domains() {
    return (this.value.domains || this.filter?.domains || []).join("\n");
  }

  private get _entity_globs() {
    return (this.value.entity_globs || this.filter?.entity_globs || []).join(
      "\n"
    );
  }

  private get _entities() {
    return this.value.entities || this.filter?.entities || [];
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;
    if (target.name) {
      this.value[target.name] = (target.value || "")
        .split("\n")
        .filter(Boolean);
    }
  }

  private _entitiesChanged(ev: PolymerChangedEvent<string[]>) {
    this.value.entities = ev.detail.value;
  }

  private _submit(): void {
    if (!this.hass) {
      return;
    }
    updateRecorderConfig(this.hass, {
      [this.name]: this.value,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
          display: block;
        }
        paper-textarea {
          padding-bottom: 16px;
        }
        .card-actions {
          text-align: right;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "recorder-filter-card": RecorderFilterCard;
  }
}
