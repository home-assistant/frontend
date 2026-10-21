import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { live } from "lit/directives/live";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-blueprint-picker";
import "../../../components/ha-card";
import {
  combineVisible,
  getHiddenFields,
} from "../../../components/ha-form/conditions";
import type {
  HaFormDataContainer,
  HaFormVisible,
} from "../../../components/ha-form/types";
import "../../../components/ha-spinner";
import "../../../components/ha-markdown";
import "../../../components/ha-selector/ha-selector";
import "../../../components/ha-settings-row";
import type { BlueprintAutomationConfig } from "../../../data/automation";
import type {
  BlueprintInput,
  BlueprintInputSection,
  BlueprintMetaData,
  BlueprintOrError,
  Blueprints,
} from "../../../data/blueprint";
import type { BlueprintScriptConfig } from "../../../data/script";
import { resolveSelectorContext } from "../../../data/selector";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("blueprint-generic-editor")
export abstract class HaBlueprintGenericEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() protected _blueprints?: Blueprints;

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._getBlueprints();
  }

  protected get _blueprint(): BlueprintOrError | undefined {
    if (!this._blueprints) {
      return undefined;
    }
    return this._blueprints[this._config.use_blueprint.path];
  }

  // Values of all inputs, including those inside sections, falling back to
  // their defaults, so selector contexts and visible conditions can name any
  // other input
  private _inputValues = memoizeOne(
    (
      input: HaFormDataContainer | undefined,
      metadataInput: BlueprintMetaData["input"]
    ): HaFormDataContainer => {
      const values: HaFormDataContainer = {};
      const addInputs = (inputs: Record<string, BlueprintInput | null>) => {
        for (const [key, value] of Object.entries(inputs)) {
          values[key] =
            input?.[key] !== undefined ? input[key] : value?.default;
        }
      };
      for (const [key, value] of Object.entries(metadataInput ?? {})) {
        if (value && "input" in value) {
          addInputs(value.input ?? {});
        } else {
          addInputs({ [key]: value });
        }
      }
      return values;
    }
  );

  private _hiddenInputs = memoizeOne(
    (
      values: HaFormDataContainer,
      metadataInput: BlueprintMetaData["input"]
    ): Set<string> => {
      const fields: [string, HaFormVisible | undefined][] = [];
      for (const [key, value] of Object.entries(metadataInput ?? {})) {
        if (value && "input" in value) {
          for (const [inputKey, input] of Object.entries(value.input ?? {})) {
            fields.push([
              inputKey,
              combineVisible(value.visible, input?.visible),
            ]);
          }
        } else {
          fields.push([key, value?.visible]);
        }
      }
      return getHiddenFields(fields, values);
    }
  );

  private get _metadataInput() {
    return this._blueprint && "metadata" in this._blueprint
      ? this._blueprint.metadata.input
      : undefined;
  }

  private get _values() {
    return this._inputValues(
      // The input holds the values of the inputs by key
      this._config.use_blueprint.input as HaFormDataContainer | undefined,
      this._metadataInput
    );
  }

  private get _hidden() {
    return this._hiddenInputs(this._values, this._metadataInput);
  }

  protected abstract get _config():
    BlueprintAutomationConfig | BlueprintScriptConfig;

  protected renderCard() {
    const blueprint = this._blueprint;
    let border = true;
    return html`
      <ha-card
        outlined
        class="blueprint"
        .header=${this.hass.localize(
          "ui.panel.config.automation.editor.blueprint.header"
        )}
      >
        <div class="blueprint-picker-container">
          ${
            this._blueprints
              ? Object.keys(this._blueprints).length
                ? html`
                    <ha-blueprint-picker
                      .hass=${this.hass}
                      .label=${this.hass.localize(
                        "ui.panel.config.automation.editor.blueprint.blueprint_to_use"
                      )}
                      .blueprints=${this._blueprints}
                      .value=${this._config.use_blueprint.path}
                      .disabled=${this.disabled}
                      @value-changed=${this._blueprintChanged}
                    ></ha-blueprint-picker>
                  `
                : this.hass.localize(
                    "ui.panel.config.automation.editor.blueprint.no_blueprints"
                  )
              : html`<ha-spinner></ha-spinner>`
          }
        </div>

        ${
          this._config.use_blueprint.path
            ? blueprint && "error" in blueprint
              ? html`<p class="warning padding">
                  There is an error in this Blueprint: ${blueprint.error}
                </p>`
              : html`${
                  blueprint?.metadata.description
                    ? html`<ha-markdown
                        class="card-content"
                        breaks
                        .content=${blueprint.metadata.description}
                      ></ha-markdown>`
                    : ""
                }
                ${
                  blueprint?.metadata?.input &&
                  Object.keys(blueprint.metadata.input).length
                    ? Object.entries(blueprint.metadata.input).map(
                        ([key, value]) => {
                          if (value && "input" in value) {
                            const inputs = Object.entries(
                              value.input ?? {}
                            ).filter(
                              ([inputKey]) => !this._hidden.has(inputKey)
                            );
                            if (!inputs.length) {
                              return nothing;
                            }
                            const section = this._renderSection(
                              key,
                              value,
                              inputs
                            );
                            border = false;
                            return section;
                          }
                          if (this._hidden.has(key)) {
                            return nothing;
                          }
                          const row = this._renderSettingRow(
                            key,
                            value,
                            border
                          );
                          border = true;
                          return row;
                        }
                      )
                    : html`<p class="padding">
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.blueprint.no_inputs"
                        )}
                      </p>`
                }`
            : ""
        }
      </ha-card>
    `;
  }

  private _renderSection(
    sectionKey: string,
    section: BlueprintInputSection,
    inputs: [string, BlueprintInput | null][]
  ) {
    const title = section?.name || sectionKey;
    const anyRequired = inputs.some(
      ([, item]) => item === null || item.default === undefined
    );
    const expanded = !section.collapsed || anyRequired;

    return html`<ha-expansion-panel
      outlined
      .expanded=${anyRequired ? live(true) : expanded}
      .noCollapse=${anyRequired}
    >
      ${
        section?.icon
          ? html`
              <ha-icon
                slot="leading-icon"
                class="section-header"
                .icon=${section.icon}
              ></ha-icon>
            `
          : nothing
      }
      <div slot="header" role="heading" aria-level="3" class="section-header">
        <ha-markdown .content=${title}></ha-markdown>
      </div>
      <div class="content">
        ${
          section?.description
            ? html`<ha-markdown .content=${section.description}></ha-markdown>`
            : nothing
        }
        ${inputs.map(([key, value]) => this._renderSettingRow(key, value, true))}
      </div>
    </ha-expansion-panel>`;
  }

  private _renderSettingRow(
    key: string,
    value: BlueprintInput | null,
    border: boolean
  ) {
    const selector = value?.selector ?? { text: undefined };
    return html`<ha-settings-row
      .narrow=${this.narrow}
      class=${border ? "border" : ""}
    >
      <span slot="heading">${value?.name || key}</span>
      <ha-markdown
        slot="description"
        class="card-content"
        breaks
        .content=${value?.description}
      ></ha-markdown>
      ${html`<ha-selector
        narrow
        .hass=${this.hass}
        .selector=${selector}
        .context=${
          value?.selector
            ? resolveSelectorContext(value.selector, this._values)
            : undefined
        }
        .key=${key}
        .disabled=${this.disabled}
        .required=${value?.default === undefined}
        .placeholder=${value?.default}
        .value=${
          this._config.use_blueprint.input &&
          key in this._config.use_blueprint.input
            ? this._config.use_blueprint.input[key]
            : value?.default
        }
        @value-changed=${this._inputChanged}
      ></ha-selector>`}
    </ha-settings-row>`;
  }

  protected abstract _getBlueprints();

  private _blueprintChanged(ev) {
    ev.stopPropagation();
    if (this._config.use_blueprint.path === ev.detail.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this._config,
        use_blueprint: {
          path: ev.detail.value,
        },
      },
    });
  }

  private _inputChanged(ev) {
    ev.stopPropagation();
    const target = ev.target as any;
    const key = target.key;
    const value = ev.detail ? ev.detail.value : target.value;
    if (
      (this._config.use_blueprint.input &&
        this._config.use_blueprint.input[key] === value) ||
      (!this._config.use_blueprint.input && value === "")
    ) {
      return;
    }
    const input = { ...this._config.use_blueprint.input, [key]: value };

    fireEvent(this, "value-changed", {
      value: {
        ...this._config,
        use_blueprint: {
          ...this._config.use_blueprint,
          input,
        },
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        ha-card.blueprint {
          margin: 0 auto;
          margin-bottom: 64px;
        }
        .padding {
          padding: 16px;
        }
        .link-button-row {
          padding: 14px;
        }
        .blueprint-picker-container {
          padding: 0 16px 16px;
        }
        ha-blueprint-picker {
          display: block;
        }
        h3 {
          margin: 16px;
        }
        .introduction {
          margin-top: 0;
          margin-bottom: 12px;
        }
        .introduction a {
          color: var(--primary-color);
        }
        p {
          margin-bottom: 0;
        }
        .description {
          margin-bottom: 16px;
        }
        ha-settings-row {
          --settings-row-content-width: 100%;
          --settings-row-prefix-display: contents;
        }
        ha-settings-row.border {
          border-top: 1px solid var(--divider-color);
        }
        ha-expansion-panel {
          margin: 8px;
          margin-left: 8px;
          margin-right: 8px;
        }
        div.section-header {
          display: flex;
          vertical-align: middle;
        }
        ha-icon.section-header {
          padding-right: 10px;
        }
        ha-alert {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "blueprint-generic-editor": HaBlueprintGenericEditor;
  }
}
