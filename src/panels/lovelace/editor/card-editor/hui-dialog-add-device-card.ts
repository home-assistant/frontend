import memoizeOne from "memoize-one";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../../common/entity/compute_device_name";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/chips/ha-filter-chip";
import type { HaFilterChip } from "../../../../components/chips/ha-filter-chip";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { computeDeviceEntityCategory } from "../../../../data/device/device_entity_category";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import {
  haStyleDialog,
  haStyleDialogFixedTop,
} from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../../cards/hui-card";
import type { DeviceSectionCategory } from "../../strategies/device/device-section-strategy";
import {
  DEFAULT_DEVICE_SECTION_CATEGORIES,
  DEVICE_SECTION_CATEGORIES,
  DeviceSectionStrategy,
} from "../../strategies/device/device-section-strategy";
import { addCards } from "../config-util";
import type { AddDeviceCardDialogParams } from "./show-add-device-card-dialog";

@customElement("hui-dialog-add-device-card")
export class HuiDialogAddDeviceCard
  extends LitElement
  implements HassDialog<AddDeviceCardDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: AddDeviceCardDialogParams;

  @state() private _open = false;

  @state() private _categories: DeviceSectionCategory[] =
    DEFAULT_DEVICE_SECTION_CATEGORIES;

  @state() private _cardConfig?: LovelaceCardConfig[];

  @state() private _saving = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  public showDialog(params: AddDeviceCardDialogParams): void {
    this._params = params;
    this._open = true;
    const available = this._availableCategories(
      params.deviceId,
      this.hass.entities
    );
    const categories = DEFAULT_DEVICE_SECTION_CATEGORIES.filter((category) =>
      available.includes(category)
    );
    this._updateCategories(categories.length ? categories : available);
  }

  private _availableCategories = memoizeOne(
    (
      deviceId: string,
      entities: HomeAssistant["entities"]
    ): DeviceSectionCategory[] => {
      const categories = new Set(
        Object.values(entities)
          .filter((entry) => entry.device_id === deviceId && !entry.hidden)
          .map(computeDeviceEntityCategory)
      );
      return DEVICE_SECTION_CATEGORIES.filter((category) =>
        categories.has(category)
      );
    }
  );

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._cardConfig = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const device = this.hass.devices[this._params.deviceId];
    const deviceName = device
      ? computeDeviceNameDisplay(device, this.hass.localize)
      : this._params.deviceId;
    const availableCategories = this._availableCategories(
      this._params.deviceId,
      this.hass.entities
    );

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.lovelace.editor.add_device_card.header",
          { device: deviceName }
        )}
        @closed=${this._dialogClosed}
      >
        ${
          availableCategories.length > 1
            ? html`
                <p class="label">
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.strategy.device.categories"
                  )}
                </p>
                <ha-chip-set>
                  ${availableCategories.map(
                    (category) => html`
                      <ha-filter-chip
                        .value=${category}
                        .selected=${this._categories.includes(category)}
                        .label=${this.hass.localize(
                          `ui.panel.lovelace.strategy.device.categories.${category}`
                        )}
                        @click=${this._categoryToggled}
                      ></ha-filter-chip>
                    `
                  )}
                </ha-chip-set>
              `
            : nothing
        }
        <div class="preview">
          ${this._cardConfig?.map(
            (cardConfig) => html`
              <hui-card
                .hass=${this.hass}
                .config=${cardConfig}
                preview
              ></hui-card>
            `
          )}
        </div>
        ${
          this._params.yaml && this._cardConfig
            ? html`
                <div class="editor">
                  <ha-yaml-editor
                    .defaultValue=${this._cardConfig}
                    in-dialog
                  ></ha-yaml-editor>
                </div>
              `
            : nothing
        }
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            @click=${this.closeDialog}
            appearance="plain"
          >
            ${this.hass.localize(
              this._params.yaml ? "ui.common.close" : "ui.common.cancel"
            )}
          </ha-button>
          ${
            this._params.yaml
              ? nothing
              : html`
                  <ha-button
                    slot="primaryAction"
                    .disabled=${this._saving || !this._cardConfig?.length}
                    .loading=${this._saving}
                    @click=${this._save}
                  >
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.add_device_card.add"
                    )}
                  </ha-button>
                `
          }
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _categoryToggled(ev: MouseEvent): void {
    const chip = ev.currentTarget as HaFilterChip;
    const category = chip.value as DeviceSectionCategory;
    this._updateCategories(
      this._availableCategories(
        this._params!.deviceId,
        this.hass.entities
      ).filter((item) =>
        item === category ? chip.selected : this._categories.includes(item)
      )
    );
  }

  private async _updateCategories(
    categories: DeviceSectionCategory[]
  ): Promise<void> {
    this._categories = categories;
    const deviceId = this._params!.deviceId;
    const section = await DeviceSectionStrategy.generate(
      {
        type: "device",
        device_id: deviceId,
        categories,
        display: "list",
        heading: "none",
        group_by_category: true,
      },
      this.hass
    );
    if (
      this._categories !== categories ||
      this._params?.deviceId !== deviceId
    ) {
      return;
    }
    const device = this.hass.devices[deviceId];
    const title = device
      ? computeDeviceNameDisplay(device, this.hass.localize)
      : undefined;
    this._cardConfig = (section.cards ?? []).map((card) => ({
      ...card,
      title,
    }));
    this._yamlEditor?.setValue(this._cardConfig);
  }

  private async _save(): Promise<void> {
    if (
      !this._params?.lovelaceConfig ||
      !this._params.path ||
      !this._params.saveConfig ||
      !this._cardConfig?.length
    ) {
      return;
    }
    this._saving = true;
    await this._params.saveConfig(
      addCards(this._params.lovelaceConfig, this._params.path, this._cardConfig)
    );
    this._saving = false;
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      haStyleDialogFixedTop,
      css`
        ha-dialog {
          --dialog-z-index: 6;
        }
        .label {
          margin: 0 0 var(--ha-space-2);
          color: var(--secondary-text-color);
        }
        ha-chip-set {
          margin-bottom: var(--ha-space-4);
        }
        .preview {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
          padding: var(--ha-space-4);
          border-radius: var(--ha-border-radius-lg);
          background-color: var(--secondary-background-color);
        }
        hui-card {
          display: block;
          width: 100%;
          max-width: 390px;
          margin: 0 auto;
        }
        .editor {
          padding-top: var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-add-device-card": HuiDialogAddDeviceCard;
  }
}
