import { mdiDelete, mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing, css } from "lit";
import { customElement, property } from "lit/decorators";
import { assert } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { hasTemplate } from "../../../../../common/string/has-template";
import { slugify } from "../../../../../common/string/slugify";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/input/ha-input";
import type { HaInput } from "../../../../../components/input/ha-input";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../../../common/translations/localize";
import {
  serviceActionStruct,
  type NotifyAction,
} from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import type { ActionElement } from "../ha-automation-action-row";

interface NotifyActionButton {
  action: string;
  title: string;
  uri?: string;
}

// Keys the Advanced section edits directly. Anything else already in
// data.data (another integration's payload) is kept, untouched, alongside.
const ADVANCED_KEYS = [
  "tag",
  "group",
  "channel",
  "importance",
  "priority",
  "visibility",
  "sticky",
  "color",
  "icon",
  "image",
  "subtitle",
  "clickAction",
  "ttl",
  "tts_text",
] as const;

type AdvancedKey = (typeof ADVANCED_KEYS)[number];

// A few keys don't match their translation key 1:1
const ADVANCED_LABEL_KEYS: Partial<Record<AdvancedKey, string>> = {
  clickAction: "click_action",
};

const ADVANCED_SELECT_FIELDS = new Set([
  "importance",
  "priority",
  "visibility",
]);

const translationBaseKey =
  "ui.panel.config.automation.editor.actions.type.notify" as const;

const MAIN_SCHEMA = [
  { name: "message", required: true, selector: { text: { multiline: true } } },
  { name: "title", selector: { text: {} } },
] as const satisfies readonly HaFormSchema[];

@customElement("ha-automation-action-notify")
export class HaNotifyAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: NotifyAction;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  public static get defaultConfig(): NotifyAction {
    // A placeholder target: getActionType() must see a notify.* action, or a
    // freshly added one would render as a plain service call instead.
    return { action: "notify.send_message", data: { message: "" } };
  }

  public static checkUiSupport(
    localize: LocalizeFunc,
    action: NotifyAction
  ): Error | undefined {
    try {
      assert(action, serviceActionStruct);
    } catch (err: any) {
      return err;
    }
    if (hasTemplate(action.action)) {
      return Error(localize("ui.errors.config.no_template_editor_support"));
    }
    const target = action.target;
    if (target) {
      const keys = Object.keys(target);
      const entityId = target.entity_id;
      if (
        keys.some((key) => key !== "entity_id") ||
        (Array.isArray(entityId) && entityId.length > 1)
      ) {
        return Error(
          localize(`${translationBaseKey}.multiple_targets_not_supported`)
        );
      }
    }
    return undefined;
  }

  // notify.send_message always resolves safely (its target, if any, is a
  // plain entity_id); a legacy action only does when exactly one device's
  // slug matches its name. Run on every hass/action change, including the
  // first, so an unresolvable legacy action never renders this editor at all.
  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    if (changedProps.has("hass") || changedProps.has("action")) {
      const service = this.action.action?.split(".", 2)[1];
      if (service && service !== "send_message") {
        const matches = this._devicesForLegacyService(service);
        if (matches.length !== 1) {
          fireEvent(
            this,
            "ui-mode-not-available",
            Error(
              this.hass.localize(
                matches.length > 1
                  ? `${translationBaseKey}.ambiguous_device`
                  : `${translationBaseKey}.unknown_device`
              )
            )
          );
          return false;
        }
      }
    }
    return true;
  }

  // Devices with a notify entity: the companion app, and anything else
  // that models its notifications the same way.
  private _includeDomains = ["notify"];

  private _advancedSchema(): HaFormSchema[] {
    const importanceOptions = ["min", "low", "default", "high", "max"] as const;
    const priorityOptions = ["default", "high"] as const;
    const visibilityOptions = ["public", "private", "secret"] as const;

    return [
      { name: "tag", selector: { text: {} } },
      { name: "group", selector: { text: {} } },
      { name: "channel", selector: { text: {} } },
      {
        name: "importance",
        selector: {
          select: {
            mode: "dropdown",
            options: importanceOptions.map((value) => ({
              value,
              label: this.hass.localize(
                `${translationBaseKey}.importance.options.${value}`
              ),
            })),
          },
        },
      },
      {
        name: "priority",
        selector: {
          select: {
            mode: "dropdown",
            options: priorityOptions.map((value) => ({
              value,
              label: this.hass.localize(
                `${translationBaseKey}.priority.options.${value}`
              ),
            })),
          },
        },
      },
      {
        name: "visibility",
        selector: {
          select: {
            mode: "dropdown",
            options: visibilityOptions.map((value) => ({
              value,
              label: this.hass.localize(
                `${translationBaseKey}.visibility.options.${value}`
              ),
            })),
          },
        },
      },
      { name: "sticky", selector: { boolean: {} } },
      { name: "color", selector: { text: {} } },
      { name: "icon", selector: { text: {} } },
      { name: "image", selector: { text: {} } },
      { name: "subtitle", selector: { text: {} } },
      { name: "clickAction", selector: { text: {} } },
      { name: "ttl", selector: { number: { mode: "box", min: 0 } } },
      { name: "tts_text", selector: { text: {} } },
    ];
  }

  private _legacyServiceForDevice(deviceId: string): string | undefined {
    const device = this.hass.devices[deviceId];
    if (!device?.name) {
      return undefined;
    }
    const candidate = slugify(`mobile_app_${device.name}`);
    return this.hass.services.notify?.[candidate] ? candidate : undefined;
  }

  private _notifyEntityIdForDevice(deviceId: string): string | undefined {
    return Object.values(this.hass.entities).find(
      (entity) =>
        entity.device_id === deviceId &&
        computeDomain(entity.entity_id) === "notify"
    )?.entity_id;
  }

  // Every device whose legacy service slug matches. More than one means the
  // match can't be trusted (two devices slugify to the same name).
  private _devicesForLegacyService(service: string): string[] {
    return Object.keys(this.hass.devices).filter(
      (deviceId) => this._legacyServiceForDevice(deviceId) === service
    );
  }

  private _currentDeviceId(): string | undefined {
    const action = this.action.action;
    if (!action) {
      return undefined;
    }
    const [domain, service] = action.split(".", 2);
    if (domain !== "notify") {
      return undefined;
    }
    if (action === "notify.send_message") {
      const target = this.action.target?.entity_id;
      const entityId = Array.isArray(target) ? target[0] : target;
      return entityId ? this.hass.entities[entityId]?.device_id : undefined;
    }
    const matches = this._devicesForLegacyService(service);
    return matches.length === 1 ? matches[0] : undefined;
  }

  // The action/target pair the given device resolves to. Always deriving it
  // this way, instead of trusting the action already on the config, keeps
  // the recipient and the advanced payload in sync with each other.
  private _actionFor(deviceId: string | undefined): {
    action: string;
    target?: { entity_id: string };
  } {
    if (deviceId) {
      const legacyService = this._legacyServiceForDevice(deviceId);
      if (legacyService) {
        return { action: `notify.${legacyService}` };
      }
      const entityId = this._notifyEntityIdForDevice(deviceId);
      if (entityId) {
        return {
          action: "notify.send_message",
          target: { entity_id: entityId },
        };
      }
    }
    return { action: "notify.send_message" };
  }

  private _hasAnyNotifyDevice(): boolean {
    return Object.values(this.hass.entities).some(
      (entity) => computeDomain(entity.entity_id) === "notify"
    );
  }

  private _actionsList(): NotifyActionButton[] {
    const raw = (this.action.data?.data as { actions?: unknown })?.actions;
    return Array.isArray(raw) ? (raw as NotifyActionButton[]) : [];
  }

  private _advancedData(): Record<string, unknown> {
    const raw = this.action.data?.data ?? {};
    const data: Record<string, unknown> = {};
    for (const key of ADVANCED_KEYS) {
      if (raw[key] !== undefined) {
        data[key] = raw[key];
      }
    }
    return data;
  }

  protected render() {
    if (!this.action) {
      return nothing;
    }

    const deviceId = this._currentDeviceId();
    const legacyService = deviceId
      ? this._legacyServiceForDevice(deviceId)
      : undefined;
    const advancedAvailable = !!legacyService;

    return html`
      <ha-device-picker
        .hass=${this.hass}
        .value=${deviceId}
        .disabled=${this.disabled}
        .includeDomains=${this._includeDomains}
        .label=${this.hass.localize(`${translationBaseKey}.target`)}
        .helper=${this.hass.localize(`${translationBaseKey}.target_helper`)}
        @value-changed=${this._devicePicked}
      ></ha-device-picker>
      ${
        !deviceId && !this._hasAnyNotifyDevice()
          ? html`<ha-alert alert-type="warning">
              ${this.hass.localize(`${translationBaseKey}.no_target`)}
            </ha-alert>`
          : nothing
      }
      <ha-form
        .hass=${this.hass}
        .data=${{
          message: this.action.data?.message ?? "",
          title: this.action.data?.title,
        }}
        .schema=${MAIN_SCHEMA}
        .disabled=${this.disabled}
        .computeLabel=${this._computeMainLabel}
        @value-changed=${this._mainChanged}
      ></ha-form>
      <ha-expansion-panel
        .header=${this.hass.localize(`${translationBaseKey}.advanced`)}
      >
        ${
          !advancedAvailable
            ? html`<ha-alert alert-type="info">
                ${this.hass.localize(
                  `${translationBaseKey}.advanced_unavailable`
                )}
              </ha-alert>`
            : html`
                <ha-form
                  .hass=${this.hass}
                  .data=${this._advancedData()}
                  .schema=${this._advancedSchema()}
                  .disabled=${this.disabled}
                  .computeLabel=${this._computeAdvancedLabel}
                  .computeHelper=${this._computeAdvancedHelper}
                  @value-changed=${this._advancedChanged}
                ></ha-form>
                <p class="actions-label">
                  ${this.hass.localize(`${translationBaseKey}.actions`)}
                </p>
                ${this._actionsList().map(
                  (item, index) => html`
                    <div class="action-row">
                      <ha-input
                        .label=${this.hass.localize(
                          `${translationBaseKey}.actions_action`
                        )}
                        .value=${item.action}
                        .disabled=${this.disabled}
                        data-index=${index}
                        data-field="action"
                        @change=${this._actionFieldChanged}
                      ></ha-input>
                      <ha-input
                        .label=${this.hass.localize(
                          `${translationBaseKey}.actions_title`
                        )}
                        .value=${item.title}
                        .disabled=${this.disabled}
                        data-index=${index}
                        data-field="title"
                        @change=${this._actionFieldChanged}
                      ></ha-input>
                      <ha-input
                        .label=${this.hass.localize(
                          `${translationBaseKey}.actions_uri`
                        )}
                        .value=${item.uri ?? ""}
                        .disabled=${this.disabled}
                        data-index=${index}
                        data-field="uri"
                        @change=${this._actionFieldChanged}
                      ></ha-input>
                      <ha-icon-button
                        .path=${mdiDelete}
                        .label=${this.hass.localize(
                          `${translationBaseKey}.actions_remove`
                        )}
                        .disabled=${this.disabled}
                        data-index=${index}
                        @click=${this._removeActionButtonClicked}
                      ></ha-icon-button>
                    </div>
                  `
                )}
                <ha-button
                  appearance="plain"
                  size="s"
                  .disabled=${this.disabled}
                  @click=${this._addActionButton}
                >
                  <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                  ${this.hass.localize(`${translationBaseKey}.actions_add`)}
                </ha-button>
              `
        }
      </ha-expansion-panel>
    `;
  }

  private _computeMainLabel = (schema: HaFormSchema) =>
    this.hass.localize(`${translationBaseKey}.${schema.name}` as LocalizeKeys);

  private _computeAdvancedLabel = (schema: HaFormSchema) => {
    const key = ADVANCED_LABEL_KEYS[schema.name as AdvancedKey] ?? schema.name;
    const localizeKey = `${translationBaseKey}.${key}`;
    return this.hass.localize(
      (ADVANCED_SELECT_FIELDS.has(schema.name)
        ? `${localizeKey}.label`
        : localizeKey) as LocalizeKeys
    );
  };

  private _computeAdvancedHelper = (schema: HaFormSchema) => {
    const key = ADVANCED_LABEL_KEYS[schema.name as AdvancedKey] ?? schema.name;
    return (
      this.hass.localize(
        `${translationBaseKey}.${key}_helper` as LocalizeKeys
      ) || undefined
    );
  };

  private _devicePicked(ev: CustomEvent) {
    ev.stopPropagation();
    this._applyDevice(ev.detail.value);
  }

  private _applyDevice(deviceId: string | undefined) {
    const { action, target } = this._actionFor(deviceId);
    const message = this.action.data?.message ?? "";
    const title = this.action.data?.title;
    const data: NotifyAction["data"] = { message };
    if (title) {
      data.title = title;
    }
    // The advanced payload only means something for the legacy action
    if (action !== "notify.send_message" && this.action.data?.data) {
      data.data = this.action.data.data;
    }
    const value = { ...this.action, action, target, data };
    if (!target) {
      delete value.target;
    }
    fireEvent(this, "value-changed", { value });
  }

  private _mainChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const { message, title } = ev.detail.value as {
      message: string;
      title?: string;
    };
    const { action, target } = this._actionFor(this._currentDeviceId());
    const data: NotifyAction["data"] = { message };
    if (title) {
      data.title = title;
    }
    if (action !== "notify.send_message" && this.action.data?.data) {
      data.data = this.action.data.data;
    }
    const value = { ...this.action, action, target, data };
    if (!target) {
      delete value.target;
    }
    fireEvent(this, "value-changed", { value });
  }

  private _advancedChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const formValues = ev.detail.value as Record<string, unknown>;
    this._updateExtraData((extra) => {
      for (const key of ADVANCED_KEYS) {
        const value = formValues[key];
        if (value === undefined || value === "" || value === false) {
          delete extra[key];
        } else {
          extra[key] = value;
        }
      }
    });
  }

  private _addActionButton() {
    const actions = [...this._actionsList(), { action: "", title: "" }];
    this._setActionsList(actions);
  }

  private _removeActionButtonClicked = (ev: Event) => {
    const index = Number((ev.currentTarget as HTMLElement).dataset.index);
    this._setActionsList(this._actionsList().filter((_item, i) => i !== index));
  };

  private _actionFieldChanged = (ev: Event) => {
    const target = ev.currentTarget as HTMLElement & HaInput;
    const index = Number(target.dataset.index);
    const field = target.dataset.field as keyof NotifyActionButton;
    const { value } = target;
    this._setActionsList(
      this._actionsList().map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  private _setActionsList(actions: NotifyActionButton[]) {
    this._updateExtraData((extra) => {
      if (actions.length) {
        extra.actions = actions;
      } else {
        delete extra.actions;
      }
    });
  }

  private _updateExtraData(mutate: (extra: Record<string, unknown>) => void) {
    const extra = { ...(this.action.data?.data ?? {}) };
    mutate(extra);
    const { action, target } = this._actionFor(this._currentDeviceId());
    const data: NotifyAction["data"] = {
      message: this.action.data?.message ?? "",
    };
    if (this.action.data?.title) {
      data.title = this.action.data.title;
    }
    if (Object.keys(extra).length) {
      data.data = extra;
    }
    const value = { ...this.action, action, target, data };
    if (!target) {
      delete value.target;
    }
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    ha-device-picker {
      display: block;
      margin-bottom: 24px;
    }
    ha-form {
      display: block;
      margin-bottom: 16px;
    }
    .actions-label {
      margin: 8px 0;
      color: var(--secondary-text-color);
    }
    .action-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
    .action-row ha-input {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-notify": HaNotifyAction;
  }
}
