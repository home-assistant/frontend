import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../common/color/compute-color";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import type { LabelRegistryEntry } from "../data/label_registry";
import {
  subscribeLabelRegistry,
  updateLabelRegistryEntry,
} from "../data/label_registry";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { showLabelDetailDialog } from "../panels/config/labels/show-dialog-label-detail";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./chips/ha-chip-set";
import "./chips/ha-input-chip";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-label-picker";
import type { HaLabelPicker } from "./ha-label-picker";

@customElement("ha-labels-picker")
export class HaLabelsPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public value?: string[];

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd = false;

  /**
   * Show only labels with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no labels with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only labels with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  /**
   * List of labels to be excluded.
   * @type {Array}
   * @attr exclude-labels
   */
  @property({ type: Array, attribute: "exclude-label" })
  public excludeLabels?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: (entity: HassEntity) => boolean;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() private _labels?: Record<string, LabelRegistryEntry>;

  @query("ha-label-picker", true) public labelPicker!: HaLabelPicker;

  public async open() {
    await this.updateComplete;
    await this.labelPicker?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.labelPicker?.focus();
  }

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeLabelRegistry(this.hass.connection, (labels) => {
        const lookUp = {};
        labels.forEach((label) => {
          lookUp[label.label_id] = label;
        });
        this._labels = lookUp;
      }),
    ];
  }

  private _sortedLabels = memoizeOne(
    (
      value: string[] | undefined,
      labels: Record<string, LabelRegistryEntry> | undefined,
      language: string
    ) =>
      value
        ?.map((id) => labels?.[id])
        .sort((a, b) => stringCompare(a?.name || "", b?.name || "", language))
  );

  protected render(): TemplateResult {
    const labels = this._sortedLabels(
      this.value,
      this._labels,
      this.hass.locale.language
    );
    return html`
      ${labels?.length
        ? html`<ha-chip-set>
            ${repeat(
              labels,
              (label) => label?.label_id,
              (label) => {
                const color = label?.color
                  ? computeCssColor(label.color)
                  : undefined;
                return html`
                  <ha-input-chip
                    .item=${label}
                    @remove=${this._removeItem}
                    @click=${this._openDetail}
                    .label=${label?.name}
                    selected
                    style=${color ? `--color: ${color}` : ""}
                  >
                    ${label?.icon
                      ? html`<ha-icon
                          slot="icon"
                          .icon=${label.icon}
                        ></ha-icon>`
                      : nothing}
                  </ha-input-chip>
                `;
              }
            )}
          </ha-chip-set>`
        : nothing}
      <ha-label-picker
        .hass=${this.hass}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.label-picker.add_label")
          : this.label}
        .placeholder=${this.placeholder}
        .excludeLabels=${this.value}
        @value-changed=${this._labelChanged}
      >
      </ha-label-picker>
    `;
  }

  private get _value() {
    return this.value || [];
  }

  private _removeItem(ev) {
    const label = ev.currentTarget.item;
    this._setValue(this._value.filter((id) => id !== label.label_id));
  }

  private _openDetail(ev) {
    const label = ev.currentTarget.item;
    showLabelDetailDialog(this, {
      entry: label,
      updateEntry: async (values) => {
        const updated = await updateLabelRegistryEntry(
          this.hass,
          label.label_id,
          values
        );
        return updated;
      },
    });
  }

  private _labelChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    if (!newValue || this._value.includes(newValue)) {
      return;
    }
    this._setValue([...this._value, newValue]);
    this.labelPicker.value = "";
  }

  private _setValue(value?: string[]) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }

  static styles = css`
    ha-chip-set {
      margin-bottom: 8px;
    }
    ha-input-chip {
      --md-input-chip-selected-container-color: var(--color, var(--grey-color));
      --ha-input-chip-selected-container-opacity: 0.5;
      --md-input-chip-selected-outline-width: 1px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-labels-picker": HaLabelsPicker;
  }
}
