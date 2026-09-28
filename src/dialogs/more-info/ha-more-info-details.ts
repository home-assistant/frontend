import { mdiCheck, mdiContentCopy } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import checkValidDate from "../../common/datetime/check_valid_date";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import "../../components/ha-attribute-value";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-button";
import type { HaListItemButton } from "../../components/item/ha-list-item-button";
import "../../components/item/ha-list-item-value";
import "../../components/list/ha-grouped-list";
import { copyToClipboard } from "../../common/util/copy-clipboard";
import type { LocalizeKeys } from "../../common/translations/localize";
import type { ExtEntityRegistryEntry } from "../../data/entity/entity_registry";
import type { HomeAssistant } from "../../types";
import "../../components/ha-yaml-editor";
import { computeDomain } from "../../common/entity/compute_domain";
import type { FeatureEnum } from "../../common/entity/get_domain_features";
import { getFeatures } from "../../common/entity/get_domain_features";
import { supportsFeature } from "../../common/entity/supports-feature";
import { titleCase } from "../../common/string/title-case";
import { stringCompare } from "../../common/string/compare";
import { showToast } from "../../util/toast";

interface DetailsViewParams {
  entityId: string;
}

interface DetailEntry {
  translationKey: LocalizeKeys;
  value: string;
  copyable?: boolean;
}

@customElement("ha-more-info-details")
class HaMoreInfoDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public params?: DetailsViewParams;

  @property({ attribute: false }) public yamlMode = false;

  @state() private _stateObj?: HassEntity;

  @state() private _copiedValue?: string;

  private _copyFeedbackTimeout?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._copyFeedbackTimeout);
    this._copyFeedbackTimeout = undefined;
    this._copiedValue = undefined;
  }

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

    const {
      stateEntries,
      attributes,
      yamlData: stateYamlData,
    } = this._getDetailData(
      this._stateObj,
      this.hass.formatEntityAttributeName
    );

    const entityEntries: DetailEntry[] = [
      {
        translationKey: "ui.dialogs.more_info_control.entity_id",
        value: this.params.entityId,
        copyable: true,
      },
    ];

    const yamlData = {
      entity_id: this.params.entityId,
      ...stateYamlData,
    };

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
                    "ui.dialogs.more_info_control.entity"
                  )}
                >
                  ${this._renderEntries(entityEntries)}
                  ${this._renderEntries(stateEntries)}
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
      stateObj: HassEntity,
      // cache key only: a new function is assigned when translation-based
      // format functions reload, invalidating results formatted via this.hass
      _formatEntityAttributeName: HomeAssistant["formatEntityAttributeName"]
    ): {
      stateEntries: DetailEntry[];
      attributes: { name: string; label: string }[];
      yamlData: {
        state: string;
        last_changed: string;
        last_updated: string;
        attributes: Record<string, string>;
      };
    } => {
      const attributes = Object.keys(stateObj.attributes)
        .map((a) => ({
          name: a,
          label: this.hass.formatEntityAttributeName(stateObj, a),
        }))
        .sort((a, b) =>
          stringCompare(a.label, b.label, this.hass.locale.language)
        );

      return {
        stateEntries: [
          {
            translationKey: "ui.dialogs.more_info_control.state",
            value: this.hass.formatEntityState(stateObj),
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
        attributes,
        yamlData: {
          state: stateObj.state,
          last_changed: stateObj.last_changed,
          last_updated: stateObj.last_updated,
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

  private _renderEntries(entries: DetailEntry[]) {
    return entries.map((entry) => {
      const label = this.hass.localize(entry.translationKey);

      if (!entry.copyable) {
        return html`
          <ha-list-item-value .label=${label}
            >${entry.value}</ha-list-item-value
          >
        `;
      }

      return html`
        <ha-list-item-button
          aria-label=${this.hass.localize(
            "ui.dialogs.more_info_control.copy_value",
            { label, value: entry.value }
          )}
          data-value=${entry.value}
          @click=${this._copyValue}
        >
          <div class="link-row" slot="content">
            <div class="label">${label}</div>
            <div class="value">${entry.value}</div>
          </div>
          <ha-svg-icon
            class=${this._copiedValue === entry.value ? "copy-success" : ""}
            slot="end"
            .path=${
              this._copiedValue === entry.value ? mdiCheck : mdiContentCopy
            }
          ></ha-svg-icon>
        </ha-list-item-button>
      `;
    });
  }

  private async _copyValue(ev: HASSDomCurrentTargetEvent<HaListItemButton>) {
    const value = ev.currentTarget.dataset.value;
    if (value === undefined) {
      return;
    }
    await copyToClipboard(value);
    const duration = 4000;
    this._copiedValue = value;
    window.clearTimeout(this._copyFeedbackTimeout);
    this._copyFeedbackTimeout = window.setTimeout(() => {
      this._copiedValue = undefined;
      this._copyFeedbackTimeout = undefined;
    }, duration);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
      duration,
    });
  }

  private _renderAttributes(attributes: { name: string; label: string }[]) {
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
        <ha-list-item-value .label=${attribute.label}>
          ${
            attribute.name === "supported_features" && featureEnum
              ? this._renderFeatures(featureEnum, this._stateObj!)
              : html`
                  <ha-attribute-value
                    .attribute=${attribute.name}
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
            ? titleCase(key.replaceAll("_", " ").toLowerCase())
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
      margin-top: var(--ha-space-6);
    }

    ha-list-item-button {
      --ha-row-item-padding-block: var(--ha-space-2);
      --ha-row-item-min-height: 40px;
      --ha-row-item-gap: var(--ha-space-3);
      --mdc-icon-size: 20px;
    }

    .link-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--ha-space-3);
    }

    .link-row .label {
      flex: 1;
      color: var(--secondary-text-color);
    }

    .link-row .value {
      max-width: 60%;
      min-width: 0;
      text-align: end;
      overflow-wrap: anywhere;
    }

    ha-svg-icon.copy-success {
      color: var(--success-color);
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
