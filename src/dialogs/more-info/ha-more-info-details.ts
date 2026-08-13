import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeAttributeNameDisplay } from "../../common/entity/compute_attribute_display";
import checkValidDate from "../../common/datetime/check_valid_date";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import "../../components/ha-attribute-value";
import "../../components/item/ha-list-item-value";
import "../../components/list/ha-grouped-list";
import type { LocalizeKeys } from "../../common/translations/localize";
import { computeShownAttributes } from "../../data/entity/entity_attributes";
import type { ExtEntityRegistryEntry } from "../../data/entity/entity_registry";
import type { HomeAssistant } from "../../types";
import "../../components/ha-yaml-editor";
import { computeDomain } from "../../common/entity/compute_domain";
import type { FeatureEnum } from "../../common/entity/get_domain_features";
import { getFeatures } from "../../common/entity/get_domain_features";
import { supportsFeature } from "../../common/entity/supports-feature";
import { titleCase } from "../../common/string/title-case";

interface DetailsViewParams {
  entityId: string;
}

interface DetailEntry {
  translationKey: LocalizeKeys;
  value: string;
}

@customElement("ha-more-info-details")
class HaMoreInfoDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public params?: DetailsViewParams;

  @property({ attribute: false }) public yamlMode = false;

  @state() private _stateObj?: HassEntity;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("params") || changedProps.has("hass")) {
      if (this.params?.entityId && this.hass) {
        this._stateObj = this.hass.states[this.params.entityId];
      }
    }
  }

  protected render() {
    if (!this.params || !this._stateObj) {
      return nothing;
    }

    const { stateEntries, attributes, yamlData } = this._getDetailData(
      this._stateObj
    );

    return html`
      <div class="content">
        ${
          this.yamlMode
            ? html`<ha-yaml-editor
                .value=${yamlData}
                read-only
                auto-update
                in-dialog
              ></ha-yaml-editor>`
            : html`
                <ha-grouped-list
                  .header=${this.hass.localize(
                    "ui.components.entity.entity-state-picker.state"
                  )}
                >
                  ${stateEntries.map(
                    (entry) =>
                      html`<ha-list-item-value
                        .label=${this.hass.localize(entry.translationKey)}
                      >
                        ${entry.value}
                      </ha-list-item-value>`
                  )}
                </ha-grouped-list>

                <ha-grouped-list
                  .header=${this.hass.localize(
                    "ui.dialogs.more_info_control.attributes"
                  )}
                >
                  ${this._renderAttributes(attributes)}
                </ha-grouped-list>
              `
        }
      </div>
    `;
  }

  private _getDetailData = memoizeOne(
    (
      stateObj: HassEntity
    ): {
      stateEntries: DetailEntry[];
      attributes: string[];
      yamlData: {
        state: {
          translated: string;
          raw: string;
          last_changed: string;
          last_updated: string;
        };
        attributes: Record<string, string>;
      };
    } => {
      const translatedState = this.hass.formatEntityState(stateObj);

      const detailsAttributes = computeShownAttributes(stateObj);
      const detailsAttributeSet = new Set(detailsAttributes);
      const builtInAttributes = Object.keys(stateObj.attributes).filter(
        (attribute) => !detailsAttributeSet.has(attribute)
      );

      return {
        stateEntries: [
          {
            translationKey: "ui.dialogs.more_info_control.translated",
            value: translatedState,
          },
          {
            translationKey: "ui.dialogs.more_info_control.raw",
            value: stateObj.state,
          },
          {
            translationKey: "ui.dialogs.more_info_control.last_changed",
            value: this._formatTimestamp(stateObj.last_changed),
          },
          {
            translationKey: "ui.dialogs.more_info_control.last_updated",
            value: this._formatTimestamp(stateObj.last_updated),
          },
        ],
        attributes: [...detailsAttributes, ...builtInAttributes],
        yamlData: {
          state: {
            translated: translatedState,
            raw: stateObj.state,
            last_changed: stateObj.last_changed,
            last_updated: stateObj.last_updated,
          },
          attributes: stateObj.attributes,
        },
      };
    }
  );

  private _formatTimestamp(value: string): string {
    const date = new Date(value);

    return checkValidDate(date)
      ? formatDateTimeWithSeconds(date, this.hass.locale, this.hass.config)
      : value;
  }

  private _renderAttributes(attributes: string[]) {
    if (attributes.length === 0) {
      return html`<div class="empty">
        ${this.hass.localize("ui.common.none")}
      </div>`;
    }

    let featureEnum: FeatureEnum | undefined;
    if (this._stateObj?.attributes.supported_features !== undefined) {
      const domain = computeDomain(this.params!.entityId);
      featureEnum = getFeatures(domain);
    }

    return attributes.map(
      (attribute) => html`
        <ha-list-item-value
          .label=${computeAttributeNameDisplay(
            this.hass.localize,
            this._stateObj!,
            this.hass.entities,
            attribute
          )}
        >
          ${
            attribute === "supported_features" && featureEnum
              ? this._renderFeatures(featureEnum, this._stateObj!)
              : html`
                  <ha-attribute-value
                    .attribute=${attribute}
                    .stateObj=${this._stateObj}
                  ></ha-attribute-value>
                `
          }
        </ha-list-item-value>
      `
    );
  }

  private _renderFeatures(
    featureEnum: FeatureEnum,
    stateObj: HassEntity
  ): string {
    return (
      Object.entries(featureEnum)
        .filter(([_key, value]) => typeof value === "number")
        .map(([key, value]) =>
          supportsFeature(stateObj, value as number)
            ? titleCase(key.replaceAll("_", "\u00A0").toLowerCase())
            : undefined
        )
        .filter(Boolean)
        .join(", ") || this.hass.localize("ui.common.none")
    );
  }

  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .content {
      padding: var(--ha-space-6);
      padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-6));
    }

    ha-grouped-list + ha-grouped-list {
      margin-top: var(--ha-space-4);
    }

    .empty {
      color: var(--secondary-text-color);
      text-align: center;
      padding: var(--ha-space-3) var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-details": HaMoreInfoDetails;
  }
}
