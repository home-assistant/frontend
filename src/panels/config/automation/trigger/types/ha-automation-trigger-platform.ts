import { mdiHelpCircle } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-selector/ha-selector";
import "../../../../../components/ha-settings-row";
import "../../../../../components/ha-switch";
import type { PlatformTrigger } from "../../../../../data/automation";
import type { IntegrationManifest } from "../../../../../data/integration";
import { fetchIntegrationManifest } from "../../../../../data/integration";
import type { TargetSelector } from "../../../../../data/selector";
import {
  getTriggerDomain,
  getTriggerObjectId,
  type TriggerDescription,
} from "../../../../../data/trigger";
import type { HomeAssistant } from "../../../../../types";
import { documentationUrl } from "../../../../../util/documentation-url";

const showOptionalToggle = (field: TriggerDescription["fields"][string]) =>
  field.selector &&
  !field.required &&
  !("boolean" in field.selector && field.default);

const DEFAULT_KEYS: (keyof PlatformTrigger)[] = [
  "trigger",
  "target",
  "alias",
  "id",
  "variables",
  "enabled",
  "options",
] as const;

@customElement("ha-automation-trigger-platform")
export class HaPlatformTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: PlatformTrigger;

  @property({ attribute: false }) public description?: TriggerDescription;

  @property({ type: Boolean }) public disabled = false;

  @state() private _checkedKeys = new Set();

  @state() private _manifest?: IntegrationManifest;

  public static get defaultConfig(): PlatformTrigger {
    return { trigger: "" };
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (!this.hasUpdated) {
      this.hass.loadBackendTranslation("triggers");
      this.hass.loadBackendTranslation("selector");
    }
    if (!changedProperties.has("trigger")) {
      return;
    }

    let newValue: PlatformTrigger | undefined;

    for (const key in this.trigger) {
      // Migrate old options to `options`
      if (DEFAULT_KEYS.includes(key as keyof PlatformTrigger)) {
        continue;
      }
      if (newValue === undefined) {
        newValue = {
          ...this.trigger,
          options: { [key]: this.trigger[key] },
        };
      } else {
        newValue.options![key] = this.trigger[key];
      }
      delete newValue[key];
    }
    if (newValue !== undefined) {
      fireEvent(this, "value-changed", {
        value: newValue,
      });
      this.trigger = newValue;
    }

    const oldValue = changedProperties.get("trigger") as
      | undefined
      | this["trigger"];

    // Fetch the manifest if we have a trigger selected and the trigger domain changed.
    // If no trigger is selected, clear the manifest.
    if (this.trigger?.trigger) {
      const domain = getTriggerDomain(this.trigger.trigger);

      const oldDomain = getTriggerDomain(oldValue?.trigger || "");

      if (domain !== oldDomain) {
        this._fetchManifest(domain);
      }
    } else {
      this._manifest = undefined;
    }

    if (
      oldValue?.trigger !== this.trigger?.trigger &&
      this.trigger &&
      this.description?.fields
    ) {
      let updatedDefaultValue = false;
      const updatedOptions = {};
      const loadDefaults = !("options" in this.trigger);
      // Set mandatory bools without a default value to false
      Object.entries(this.description.fields).forEach(([key, field]) => {
        if (
          field.selector &&
          field.required &&
          field.default === undefined &&
          "boolean" in field.selector &&
          updatedOptions[key] === undefined
        ) {
          updatedDefaultValue = true;
          updatedOptions[key] = false;
        } else if (
          loadDefaults &&
          field.selector &&
          field.default !== undefined &&
          updatedOptions[key] === undefined
        ) {
          updatedDefaultValue = true;
          updatedOptions[key] = field.default;
        }
      });

      if (updatedDefaultValue) {
        fireEvent(this, "value-changed", {
          value: {
            ...this.trigger,
            options: updatedOptions,
          },
        });
      }
    }
  }

  protected render() {
    const domain = getTriggerDomain(this.trigger.trigger);
    const triggerName = getTriggerObjectId(this.trigger.trigger);

    const description = this.hass.localize(
      `component.${domain}.triggers.${triggerName}.description`
    );

    const triggerDesc = this.description;

    const shouldRenderDataYaml = !triggerDesc?.fields;

    return html`
      <div class="description">
        ${description ? html`<p>${description}</p>` : nothing}
        ${this._manifest
          ? html`<a
              href=${this._manifest.is_built_in
                ? documentationUrl(
                    this.hass,
                    `/integrations/${this._manifest.domain}`
                  )
                : this._manifest.documentation}
              title=${this.hass.localize(
                "ui.components.service-control.integration_doc"
              )}
              target="_blank"
              rel="noreferrer"
            >
              <ha-icon-button
                .path=${mdiHelpCircle}
                class="help-icon"
              ></ha-icon-button>
            </a>`
          : nothing}
      </div>
      ${triggerDesc && "target" in triggerDesc
        ? html`<ha-settings-row narrow>
            <span slot="heading"
              >${this.hass.localize(
                "ui.components.service-control.target"
              )}</span
            >
            <span slot="description"
              >${this.hass.localize(
                "ui.components.service-control.target_secondary"
              )}</span
            ><ha-selector
              .hass=${this.hass}
              .selector=${this._targetSelector(triggerDesc.target)}
              .disabled=${this.disabled}
              @value-changed=${this._targetChanged}
              .value=${this.trigger?.target}
            ></ha-selector
          ></ha-settings-row>`
        : nothing}
      ${shouldRenderDataYaml
        ? html`<ha-yaml-editor
            .hass=${this.hass}
            .label=${this.hass.localize(
              "ui.components.service-control.action_data"
            )}
            .name=${"data"}
            .readOnly=${this.disabled}
            .defaultValue=${this.trigger?.options}
            @value-changed=${this._dataChanged}
          ></ha-yaml-editor>`
        : Object.entries(triggerDesc.fields).map(([fieldName, dataField]) =>
            this._renderField(fieldName, dataField, domain, triggerName)
          )}
    `;
  }

  private _targetSelector = memoizeOne(
    (targetSelector: TargetSelector["target"] | null | undefined) =>
      targetSelector ? { target: { ...targetSelector } } : { target: {} }
  );

  private _renderField = (
    fieldName: string,
    dataField: TriggerDescription["fields"][string],
    domain: string | undefined,
    triggerName: string | undefined
  ) => {
    const selector = dataField?.selector ?? { text: null };

    const showOptional = showOptionalToggle(dataField);

    const isEnabled =
      !showOptional ||
      this._checkedKeys.has(fieldName) ||
      (this.trigger?.options && this.trigger.options[fieldName] !== undefined);

    return dataField.selector
      ? html`<ha-settings-row
          narrow
          class=${showOptional ? "clickable" : ""}
          .key=${showOptional ? fieldName : undefined}
          @click=${showOptional ? this._rowClicked : nothing}
        >
          <span slot="heading"
            >${this.hass.localize(
              `component.${domain}.triggers.${triggerName}.fields.${fieldName}.name`
            ) || triggerName}</span
          >
          <span slot="description"
            >${this.hass.localize(
              `component.${domain}.triggers.${triggerName}.fields.${fieldName}.description`
            )}</span
          >
          ${showOptional
            ? html`<ha-switch
                slot="suffix"
                .key=${fieldName}
                .checked=${isEnabled}
                .disabled=${this.disabled}
                @change=${this._switchChanged}
                @click=${this._switchClicked}
              ></ha-switch>`
            : nothing}
          ${isEnabled
            ? html`<ha-selector
                .disabled=${this.disabled}
                .hass=${this.hass}
                .selector=${selector}
                .context=${this._generateContext(dataField)}
                .key=${fieldName}
                @value-changed=${this._dataChanged}
                .value=${this.trigger?.options
                  ? this.trigger.options[fieldName]
                  : undefined}
                .placeholder=${dataField.default}
                .localizeValue=${this._localizeValueCallback}
                .required=${dataField.required}
              ></ha-selector>`
            : nothing}
        </ha-settings-row>`
      : nothing;
  };

  private _generateContext(
    field: TriggerDescription["fields"][string]
  ): Record<string, any> | undefined {
    if (!field.context) {
      return undefined;
    }

    const context: Record<string, any> = {};
    for (const [context_key, data_key] of Object.entries(field.context)) {
      if (data_key === "target" && this.description?.target) {
        context.target_selector = this._targetSelector(this.description.target);
      }
      context[context_key] =
        data_key === "target"
          ? this.trigger.target
          : this.trigger.options?.[data_key];
    }
    return context;
  }

  private _dataChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (ev.detail.isValid === false) {
      // Don't clear an object selector that returns invalid YAML
      return;
    }
    const key = (ev.currentTarget as any).key;
    const value = ev.detail.value;
    if (
      this.trigger?.options?.[key] === value ||
      ((!this.trigger?.options || !(key in this.trigger.options)) &&
        (value === "" || value === undefined))
    ) {
      return;
    }

    const options = { ...this.trigger?.options, [key]: value };

    if (
      value === "" ||
      value === undefined ||
      (typeof value === "object" && !Object.keys(value).length)
    ) {
      delete options[key];
    }

    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        options,
      },
    });
  }

  private _targetChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        target: ev.detail.value,
      },
    });
  }

  private _switchClicked(ev: Event) {
    ev.stopPropagation();
  }

  private _rowClicked(ev: Event) {
    if (this.disabled) {
      return;
    }
    const target = ev.target as HTMLElement;
    if (target.closest("ha-selector")) {
      return;
    }
    const key = (ev.currentTarget as any).key;
    const isEnabled =
      this._checkedKeys.has(key) ||
      (this.trigger?.options && this.trigger.options[key] !== undefined);
    this._switchChanged({
      target: { checked: !isEnabled, key },
    } as any);
  }

  private _switchChanged(ev) {
    const checked = ev.target.checked;
    const key = ev.target.key;
    let options;

    if (checked) {
      this._checkedKeys.add(key);
      const field =
        this.description &&
        Object.entries(this.description).find(([k, _value]) => k === key)?.[1];
      let defaultValue = field?.default;

      if (
        defaultValue == null &&
        field?.selector &&
        "constant" in field.selector
      ) {
        defaultValue = field.selector.constant?.value;
      }

      if (
        defaultValue == null &&
        field?.selector &&
        "boolean" in field.selector
      ) {
        defaultValue = false;
      }

      if (defaultValue != null) {
        options = {
          ...this.trigger?.options,
          [key]: defaultValue,
        };
      }
    } else {
      this._checkedKeys.delete(key);
      options = { ...this.trigger?.options };
      delete options[key];
    }
    if (options) {
      fireEvent(this, "value-changed", {
        value: {
          ...this.trigger,
          options,
        },
      });
    }
    this.requestUpdate("_checkedKeys");
  }

  private _localizeValueCallback = (key: string) => {
    if (!this.trigger?.trigger) {
      return "";
    }
    return this.hass.localize(
      `component.${getTriggerDomain(this.trigger.trigger)}.selector.${key}`
    );
  };

  private async _fetchManifest(integration: string) {
    this._manifest = undefined;
    try {
      this._manifest = await fetchIntegrationManifest(this.hass, integration);
    } catch (_err: any) {
      // eslint-disable-next-line no-console
      console.log(`Unable to fetch integration manifest for ${integration}`);
      // Ignore if loading manifest fails. Probably bad JSON in manifest
    }
  }

  static styles = css`
    :host {
      display: block;
      margin: 0px calc(-1 * var(--ha-space-4));
    }
    ha-settings-row {
      padding: 0 var(--ha-space-4);
    }
    ha-settings-row[narrow] {
      padding-bottom: var(--ha-space-2);
    }
    ha-settings-row {
      --settings-row-content-width: 100%;
      border-top: var(
        --service-control-items-border-top,
        1px solid var(--divider-color)
      );
    }
    ha-settings-row.clickable {
      cursor: pointer;
    }
    ha-service-picker,
    ha-entity-picker,
    ha-yaml-editor {
      display: block;
      margin: 0 var(--ha-space-4);
    }
    ha-yaml-editor {
      padding: var(--ha-space-4) 0;
    }
    p {
      margin: 0 var(--ha-space-4);
      padding: var(--ha-space-4) 0;
    }
    :host([hide-picker]) p {
      padding-top: 0;
    }
    .help-icon {
      color: var(--secondary-text-color);
    }
    .description {
      justify-content: space-between;
      display: flex;
      align-items: center;
      padding-right: 2px;
      padding-inline-end: 2px;
      padding-inline-start: initial;
    }
    .description p {
      direction: ltr;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-platform": HaPlatformTrigger;
  }
}
