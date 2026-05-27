import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { consume, type ContextType } from "@lit/context";
import { mdiArrowRight, mdiRoomService } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-combo-box-item";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../../components/ha-picker-combo-box";
import type { PickerValueRenderer } from "../../../../components/ha-picker-field";
import "../../../../components/ha-service-icon";
import "../../../../components/ha-svg-icon";
import "../../../../components/radio/ha-radio-group";
import "../../../../components/radio/ha-radio-option";
import {
  ACTION_BUILDING_BLOCKS,
  ACTION_COMBINED_BLOCKS,
  ACTION_ICONS,
  YAML_ONLY_ACTION_TYPES,
} from "../../../../data/action";
import {
  internationalizationContext,
  servicesContext,
} from "../../../../data/context";
import { domainToName } from "../../../../data/integration";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import type { HomeAssistant } from "../../../../types";
import {
  buildActionFromKey,
  convertAction,
  getActionKey,
} from "./convert-action";
import type { ConvertActionDialogParams } from "./show-dialog-convert-action";

interface ConvertItem extends PickerComboBoxItem {
  isService: boolean;
}

const EXCLUDED_TYPES = new Set<string>([
  ...ACTION_BUILDING_BLOCKS,
  ...ACTION_COMBINED_BLOCKS,
  ...YAML_ONLY_ACTION_TYPES,
  // Generic catch-all action types covered by the services list below
  "service",
  // Umbrella repeat — not a leaf type
  "repeat",
]);

@customElement("dialog-convert-action")
class DialogConvertAction extends DialogMixin<ConvertActionDialogParams>(
  LitElement
) {
  @state() private _pickedKey?: string;

  @state() private _mode: "current" | "new" = "current";

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: servicesContext, subscribe: true })
  private _services!: ContextType<typeof servicesContext>;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.params) {
      this._pickedKey = getActionKey(this.params.currentAction);
      this._mode = "current";
    }
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    const currentKey = getActionKey(this.params.currentAction);
    const canCommit =
      this._pickedKey !== undefined && this._pickedKey !== currentKey;

    return html`
      <ha-dialog
        open
        header-title=${this._i18n.localize(
          "ui.panel.config.automation.editor.actions.convert_dialog.title"
        )}
      >
        <div class="content">
          ${currentKey
            ? html`
                <div class="preview">
                  ${this._renderActionChip(currentKey)}
                  <ha-svg-icon
                    class="arrow"
                    .path=${mdiArrowRight}
                  ></ha-svg-icon>
                  ${this._pickedKey && this._pickedKey !== currentKey
                    ? this._renderActionChip(this._pickedKey)
                    : "?"}
                </div>
              `
            : nothing}
          <ha-generic-picker
            required
            .value=${this._pickedKey}
            .getItems=${this._getItems}
            .rowRenderer=${this._rowRenderer}
            .valueRenderer=${this._valueRenderer(
              this._i18n.localize,
              this._services
            )}
            .notFoundLabel=${this._i18n.localize(
              "ui.panel.config.automation.editor.actions.convert_dialog.no_matches"
            )}
            @value-changed=${this._pickedKeyChanged}
          ></ha-generic-picker>
          <ha-alert alert-type="warning">
            ${this._i18n.localize(
              "ui.panel.config.automation.editor.actions.convert_dialog.warning"
            )}
          </ha-alert>
          <ha-radio-group
            name="mode"
            .value=${this._mode}
            @change=${this._modeChanged}
          >
            <ha-radio-option value="current">
              ${this._i18n.localize(
                "ui.panel.config.automation.editor.actions.convert_dialog.mode_current"
              )}
            </ha-radio-option>
            <ha-radio-option value="new">
              ${this._i18n.localize(
                "ui.panel.config.automation.editor.actions.convert_dialog.mode_new"
              )}
            </ha-radio-option>
          </ha-radio-group>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this._i18n.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .disabled=${!canCommit}
            @click=${this._convert}
          >
            ${this._i18n.localize(
              "ui.panel.config.automation.editor.actions.convert_dialog.convert"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _items = memoizeOne(
    (
      localize: LocalizeFunc,
      services: HomeAssistant["services"]
    ): ConvertItem[] => {
      const items: ConvertItem[] = [];

      for (const type of Object.keys(ACTION_ICONS)) {
        if (EXCLUDED_TYPES.has(type)) {
          continue;
        }
        const label =
          localize(
            `ui.panel.config.automation.editor.actions.type.${type}.label` as any
          ) || type;
        items.push({
          id: type,
          primary: label,
          icon_path: ACTION_ICONS[type as keyof typeof ACTION_ICONS],
          isService: false,
          sorting_label: `0_${label}`,
        });
      }

      if (services) {
        for (const domain of Object.keys(services)) {
          const domainName = domainToName(localize, domain);
          for (const service of Object.keys(services[domain])) {
            const serviceId = `${domain}.${service}`;
            const def = services[domain][service];
            const serviceName =
              localize(
                `component.${domain}.services.${service}.name` as any,
                def.description_placeholders
              ) ||
              def.name ||
              service;
            const description =
              localize(
                `component.${domain}.services.${service}.description` as any,
                def.description_placeholders
              ) ||
              def.description ||
              "";
            items.push({
              id: serviceId,
              primary: `${domainName}: ${serviceName}`,
              secondary: description,
              isService: true,
              search_labels: {
                serviceId,
                domainName,
                serviceName,
                description,
              },
              sorting_label: `1_${domainName}_${serviceName}`,
            });
          }
        }
      }

      return items;
    }
  );

  private _getItems = () => this._items(this._i18n.localize, this._services);

  private _rowRenderer: RenderItemFunction<PickerComboBoxItem> = (
    item,
    index
  ) => {
    const convertItem = item as ConvertItem;
    return html`
      <ha-combo-box-item type="button" .borderTop=${index !== 0}>
        ${convertItem.isService
          ? html`<ha-service-icon
              slot="start"
              .service=${item.id}
            ></ha-service-icon>`
          : html`<ha-svg-icon
              slot="start"
              .path=${item.icon_path}
            ></ha-svg-icon>`}
        <span slot="headline">${item.primary}</span>
        ${item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing}
      </ha-combo-box-item>
    `;
  };

  private _valueRenderer = memoizeOne(
    (
      localize: LocalizeFunc,
      services: HomeAssistant["services"]
    ): PickerValueRenderer =>
      (value) => {
        if (value.includes(".")) {
          const [domain, service] = value.split(".");
          const def = services?.[domain]?.[service];
          const domainName = domainToName(localize, domain);
          const serviceName =
            localize(
              `component.${domain}.services.${service}.name` as any,
              def?.description_placeholders
            ) ||
            def?.name ||
            service;
          return html`
            <ha-service-icon slot="start" .service=${value}></ha-service-icon>
            <span slot="headline">${domainName}: ${serviceName}</span>
          `;
        }
        const iconPath = ACTION_ICONS[value as keyof typeof ACTION_ICONS];
        const label =
          localize(
            `ui.panel.config.automation.editor.actions.type.${value}.label` as any
          ) || value;
        return html`
          ${iconPath
            ? html`<ha-svg-icon slot="start" .path=${iconPath}></ha-svg-icon>`
            : html`<ha-svg-icon
                slot="start"
                .path=${mdiRoomService}
              ></ha-svg-icon>`}
          <span slot="headline">${label}</span>
        `;
      }
  );

  private _renderActionChip(key: string) {
    const localize = this._i18n.localize;
    if (key.includes(".")) {
      const [domain, service] = key.split(".");
      const def = this._services?.[domain]?.[service];
      const domainName = domainToName(localize, domain);
      const serviceName =
        localize(
          `component.${domain}.services.${service}.name` as any,
          def?.description_placeholders
        ) ||
        def?.name ||
        service;
      return html`
        <div class="chip">
          <ha-service-icon .service=${key}></ha-service-icon>
          <span>${domainName}: ${serviceName}</span>
        </div>
      `;
    }
    const iconPath = ACTION_ICONS[key as keyof typeof ACTION_ICONS];
    const label =
      localize(
        `ui.panel.config.automation.editor.actions.type.${key}.label` as any
      ) || key;
    return html`
      <div class="chip">
        <ha-svg-icon .path=${iconPath || mdiRoomService}></ha-svg-icon>
        <span>${label}</span>
      </div>
    `;
  }

  private _pickedKeyChanged = (ev: CustomEvent) => {
    ev.stopPropagation();
    this._pickedKey = ev.detail?.value || undefined;
  };

  private _modeChanged = (ev: Event) => {
    const value = (ev.target as HTMLInputElement).value;
    if (value === "current" || value === "new") {
      this._mode = value;
    }
  };

  private _convert = () => {
    if (!this.params || !this._pickedKey) {
      return;
    }
    const newAction = buildActionFromKey(this._pickedKey);
    const merged = convertAction(
      this.params.currentAction,
      newAction,
      this._services
    );
    if (this._mode === "new") {
      this.params.duplicateConvert(merged);
    } else {
      this.params.convert(merged);
    }
    this.closeDialog();
  };

  static styles = css`
    ha-dialog {
      --mdc-dialog-min-width: min(560px, 100vw);
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3);
    }
    .preview {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      flex-wrap: wrap;
    }
    .preview .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-2);
      padding: var(--ha-space-1) var(--ha-space-3);
      border-radius: 999px;
      background-color: var(--secondary-background-color);
      min-width: 0;
    }
    .preview .chip span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .preview .arrow {
      color: var(--secondary-text-color);
      flex-shrink: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-convert-action": DialogConvertAction;
  }
}
