import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, TemplateResult, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { computeCssColor } from "../common/color/compute-color";
import { fireEvent } from "../common/dom/fire_event";
import {
  LabelRegistryEntry,
  subscribeLabelRegistry,
  updateLabelRegistryEntry,
} from "../data/label_registry";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { showLabelDetailDialog } from "../panels/config/labels/show-dialog-label-detail";
import { HomeAssistant, ValueChangedEvent } from "../types";
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

  @state() private _labels?: LabelRegistryEntry[];

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
        this._labels = labels;
      }),
    ];
  }

  protected render(): TemplateResult {
    return html`
      ${this.value?.length
        ? html`<ha-chip-set>
            ${repeat(
              this.value,
              (item) => item,
              (item, idx) => {
                const label = this._labels?.find(
                  (lbl) => lbl.label_id === item
                );
                const color = label?.color
                  ? computeCssColor(label.color)
                  : undefined;
                return html`
                  <ha-input-chip
                    .idx=${idx}
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
    this._value.splice(ev.target.idx, 1);
    this._setValue([...this._value]);
  }

  private _openDetail(ev) {
    const label = ev.target.item;
    showLabelDetailDialog(this, {
      entry: label,
      updateEntry: async (values) => {
        const updated = await updateLabelRegistryEntry(
          this.hass,
          label.label_id,
          values
        );
        this._labels = this._labels?.map((lbl) =>
          lbl.label_id === label.label_id ? updated : label
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
      border: 1px solid var(--color);
      --md-input-chip-selected-container-color: var(--color);
      --ha-input-chip-selected-container-opacity: 0.3;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-labels-picker": HaLabelsPicker;
  }
}
