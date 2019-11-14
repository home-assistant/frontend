import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
  css,
  CSSResult,
  query,
} from "lit-element";
import { HomeAssistant } from "../../../../types";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { haStyleDialog } from "../../../../resources/styles";
import { PlaceholderContainer, Placeholder } from "./dialog-thingtalk";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { subscribeEntityRegistry } from "../../../../data/entity_registry";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { HassEntity } from "home-assistant-js-websocket";
import { HaDevicePicker } from "../../../../components/device/ha-device-picker";
import { getPath, applyPatch } from "../../../../common/util/patch";

declare global {
  // for fire event
  interface HASSDomEvents {
    "placeholders-filled": { value: PlaceholderValues };
  }
}

export interface PlaceholderValues {
  [key: string]: { [index: number]: { [key: string]: string } };
}

interface DeviceEntitiesLookup {
  [deviceId: string]: string[];
}

@customElement("ha-thingtalk-placeholders")
export class ThingTalkPlaceholders extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;
  @property() public opened!: boolean;
  public skip!: () => void;
  @property() public placeholders!: PlaceholderContainer;
  @property() private _error?: string;
  private _deviceEntityLookup: DeviceEntitiesLookup = {};
  private _manualEntities: PlaceholderValues = {};
  @property() private _placeholderValues: PlaceholderValues = {};
  @query("#device-entity-picker") private _deviceEntityPicker?: HaDevicePicker;

  public hassSubscribe() {
    return [
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        for (const entity of entries) {
          if (!entity.device_id) {
            continue;
          }
          if (!(entity.device_id in this._deviceEntityLookup)) {
            this._deviceEntityLookup[entity.device_id] = [];
          }
          if (
            !this._deviceEntityLookup[entity.device_id].includes(
              entity.entity_id
            )
          ) {
            this._deviceEntityLookup[entity.device_id].push(entity.entity_id);
          }
        }
      }),
    ];
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-paper-dialog
        with-backdrop
        .opened=${this.opened}
        @opened-changed="${this._openedChanged}"
      >
        <h2>Great! Now we need to link some devices.</h2>
        <paper-dialog-scrollable>
          ${this._error
            ? html`
                <div class="error">${this._error}</div>
              `
            : ""}
          ${Object.entries(this.placeholders).map(
            ([type, placeholders]) =>
              html`
                <h3>
                  ${this.hass.localize(
                    `ui.panel.config.automation.editor.${type}s.name`
                  )}:
                </h3>
                ${placeholders.map((placeholder) => {
                  if (placeholder.fields.includes("device_id")) {
                    return html`
                      <ha-device-picker
                        .type=${type}
                        .placeholder=${placeholder}
                        @change=${this._devicePicked}
                        .hass=${this.hass}
                        .includeDomains=${placeholder.domains}
                        .includeDeviceClasses=${placeholder.device_classes}
                        .label=${this._getLabel(
                          placeholder.domains,
                          placeholder.device_classes
                        )}
                      ></ha-device-picker>
                      ${(getPath(this._placeholderValues, [
                        type,
                        placeholder.index,
                        "device_id",
                      ]) &&
                        placeholder.fields.includes("entity_id") &&
                        getPath(this._placeholderValues, [
                          type,
                          placeholder.index,
                          "entity_id",
                        ]) === undefined) ||
                      getPath(this._manualEntities, [
                        type,
                        placeholder.index,
                        "manual",
                      ]) === true
                        ? html`
                            <ha-entity-picker
                              id="device-entity-picker"
                              .type=${type}
                              .placeholder=${placeholder}
                              @change=${this._entityPicked}
                              .includeDomains=${placeholder.domains}
                              .includeDeviceClasses=${placeholder.device_classes}
                              .hass=${this.hass}
                              .label=${this._getLabel(
                                placeholder.domains,
                                placeholder.device_classes
                              )}
                              .entityFilter=${(state: HassEntity) =>
                                this._deviceEntityLookup[
                                  this._placeholderValues[type][
                                    placeholder.index
                                  ].device_id
                                ].includes(state.entity_id)}
                            ></ha-entity-picker>
                          `
                        : ""}
                    `;
                  } else if (placeholder.fields.includes("entity_id")) {
                    return html`
                      <ha-entity-picker
                        .type=${type}
                        .placeholder=${placeholder}
                        @change=${this._entityPicked}
                        .includeDomains=${placeholder.domains}
                        .includeDeviceClasses=${placeholder.device_classes}
                        .hass=${this.hass}
                        .label=${this._getLabel(
                          placeholder.domains,
                          placeholder.device_classes
                        )}
                      ></ha-entity-picker>
                    `;
                  }
                  return html`
                    <div class="error">
                      Unknown placeholder<br />
                      ${placeholder.domains}<br />
                      ${placeholder.fields.map(
                        (field) =>
                          html`
                            ${field}<br />
                          `
                      )}
                    </div>
                  `;
                })}
              `
          )}
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button class="left" @click="${this.skip}">
            Skip
          </mwc-button>
          <mwc-button @click="${this._done}" .disabled=${!this._isDone}>
            Create automation
          </mwc-button>
        </div>
      </ha-paper-dialog>
    `;
  }

  private get _isDone(): boolean {
    return Object.entries(this.placeholders).every(([type, placeholders]) =>
      placeholders.every((placeholder) =>
        placeholder.fields.every(
          (field) =>
            getPath(this._placeholderValues, [
              type,
              placeholder.index,
              field,
            ]) !== undefined
        )
      )
    );
  }

  private _getLabel(domains: string[], deviceClasses?: string[]) {
    return `${domains
      .map((domain) => this.hass.localize(`domain.${domain}`))
      .join(", ")}${
      deviceClasses ? ` of type ${deviceClasses.join(", ")}` : ""
    }`;
  }

  private _devicePicked(ev: Event): void {
    const target = ev.target as any;
    const placeholder = target.placeholder as Placeholder;
    const value = target.value;
    const type = target.type;
    applyPatch(
      this._placeholderValues,
      [type, placeholder.index, "device_id"],
      value
    );
    if (!placeholder.fields.includes("entity_id")) {
      return;
    }
    if (value === "") {
      delete this._placeholderValues[type][placeholder.index].entity_id;
      if (this._deviceEntityPicker) {
        this._deviceEntityPicker.value = undefined;
      }
      applyPatch(
        this._manualEntities,
        [type, placeholder.index, "manual"],
        false
      );
      this.requestUpdate("_placeholderValues");
      return;
    }
    const devEntities = this._deviceEntityLookup[value];
    const entities = devEntities.filter((eid) => {
      if (placeholder.device_classes) {
        const stateObj = this.hass.states[eid];
        if (!stateObj) {
          return false;
        }
        return (
          placeholder.domains.includes(computeDomain(eid)) &&
          stateObj.attributes.device_class &&
          placeholder.device_classes.includes(stateObj.attributes.device_class)
        );
      }
      return placeholder.domains.includes(computeDomain(eid));
    });
    if (entities.length === 0) {
      // Should not happen because we filter the device picker on domain
      this._error = `No ${placeholder.domains
        .map((domain) => this.hass.localize(`domain.${domain}`))
        .join(", ")} entities found in this device.`;
    } else if (entities.length === 1) {
      applyPatch(
        this._placeholderValues,
        [type, placeholder.index, "entity_id"],
        entities[0]
      );
      applyPatch(
        this._manualEntities,
        [type, placeholder.index, "manual"],
        false
      );
      this.requestUpdate("_placeholderValues");
    } else {
      delete this._placeholderValues[type][placeholder.index].entity_id;
      if (this._deviceEntityPicker) {
        this._deviceEntityPicker.value = undefined;
      }
      applyPatch(
        this._manualEntities,
        [type, placeholder.index, "manual"],
        true
      );
      this.requestUpdate("_placeholderValues");
    }
  }

  private _entityPicked(ev: Event): void {
    const target = ev.target as any;
    const placeholder = target.placeholder as Placeholder;
    const value = target.value;
    const type = target.type;
    applyPatch(
      this._placeholderValues,
      [type, placeholder.index, "entity_id"],
      value
    );
    this.requestUpdate("_placeholderValues");
  }

  private _done(): void {
    fireEvent(this, "placeholders-filled", { value: this._placeholderValues });
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    // The opened-changed event doesn't leave the shadowdom so we re-dispatch it
    this.dispatchEvent(new CustomEvent(ev.type, ev));
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          max-width: 500px;
        }
        mwc-button.left {
          margin-right: auto;
        }
        paper-dialog-scrollable {
          margin-top: 10px;
        }
        h3 {
          margin: 10px 0 0 0;
          font-weight: 500;
        }
        .error {
          color: var(--google-red-500);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-thingtalk-placeholders": ThingTalkPlaceholders;
  }
}
