import type { ContextType } from "@lit/context";
import { mdiAutoFix, mdiContentPaste, mdiViewGridPlusOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import deepClone from "deep-clone-simple";
import { consume } from "../../../../common/decorators/consume";
import { storage } from "../../../../common/decorators/storage";
import "../../../../components/ha-adaptive-dialog";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-svg-icon";
import "../../../../components/item/ha-list-item-button";
import "../../../../components/list/ha-list-base";
import { internationalizationContext } from "../../../../data/context";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import { generateDefaultSection } from "../../views/default-section";
import { addSection } from "../config-util";
import type { CreateSectionDialogParams } from "./show-create-section-dialog";
import { showSelectSectionStrategyDialog } from "./show-create-section-dialog";

@customElement("hui-dialog-create-section")
export class HuiDialogCreateSection extends DialogMixin<CreateSectionDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @storage({
    key: "dashboardSectionClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  private _clipboard?: LovelaceSectionRawConfig;

  protected render() {
    if (!this.params) {
      return nothing;
    }

    const localize = this._i18n.localize;

    return html`
      <ha-adaptive-dialog
        open
        header-title=${localize("ui.panel.lovelace.editor.create_section.header")}
      >
        <ha-list-base>
          <ha-list-item-button @click=${this._createManual}>
            <ha-svg-icon
              slot="start"
              .path=${mdiViewGridPlusOutline}
            ></ha-svg-icon>
            <span slot="headline">
              ${localize("ui.panel.lovelace.editor.create_section.manual")}
            </span>
            <span slot="supporting-text">
              ${localize(
                "ui.panel.lovelace.editor.create_section.manual_description"
              )}
            </span>
          </ha-list-item-button>
          <ha-list-item-button @click=${this._pickStrategy}>
            <ha-svg-icon slot="start" .path=${mdiAutoFix}></ha-svg-icon>
            <span slot="headline">
              ${localize("ui.panel.lovelace.editor.create_section.automatic")}
            </span>
            <span slot="supporting-text">
              ${localize(
                "ui.panel.lovelace.editor.create_section.automatic_description"
              )}
            </span>
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-list-item-button>
          ${
            this._clipboard
              ? html`
                  <ha-list-item-button @click=${this._paste}>
                    <ha-svg-icon
                      slot="start"
                      .path=${mdiContentPaste}
                    ></ha-svg-icon>
                    <span slot="headline">
                      ${localize("ui.panel.lovelace.editor.create_section.paste")}
                    </span>
                    <span slot="supporting-text">
                      ${localize(
                        "ui.panel.lovelace.editor.create_section.paste_description"
                      )}
                    </span>
                  </ha-list-item-button>
                `
              : nothing
          }
        </ha-list-base>
      </ha-adaptive-dialog>
    `;
  }

  private _createManual() {
    const { lovelace, containerPath } = this.params!;
    this.closeDialog();
    lovelace.saveConfig(
      addSection(
        lovelace.config,
        containerPath,
        generateDefaultSection(this._i18n.localize, true)
      )
    );
  }

  private _pickStrategy() {
    showSelectSectionStrategyDialog(this, this.params!);
    this.closeDialog();
  }

  private async _paste() {
    if (!this._clipboard) {
      return;
    }
    const { lovelace, containerPath } = this.params!;
    const section = deepClone(this._clipboard);
    this.closeDialog();
    try {
      await lovelace.saveConfig(
        addSection(lovelace.config, containerPath, section)
      );
    } catch (_err: unknown) {
      lovelace.showToast({
        message: this._i18n.localize(
          "ui.panel.lovelace.editor.section.paste_error"
        ),
      });
    }
  }

  static styles = css`
    ha-adaptive-dialog {
      --dialog-content-padding: 0;
    }
    ha-list-base {
      --ha-list-padding: 0 0 var(--ha-space-3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-create-section": HuiDialogCreateSection;
  }
}
