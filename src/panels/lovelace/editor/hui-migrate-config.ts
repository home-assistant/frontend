import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "@polymer/paper-button/paper-button";
import { fireEvent } from "../../../common/dom/fire_event";

import { HomeAssistant } from "../../../types";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { migrateConfig } from "../common/data";

export class HuiMigrateConfig extends hassLocalizeLitMixin(LitElement) {
  protected hass?: HomeAssistant;

  static get properties(): PropertyDeclarations {
    return { hass: {} };
  }

  public async migrateConfig(): Promise<void> {
    try {
      await migrateConfig(this.hass!);
      fireEvent(this, "reload-lovelace");
      fireEvent(this, "close-dialog");
    } catch (err) {
      alert(`Migration failed: ${err.message}`);
    }
  }

  protected render(): TemplateResult {
    return html`
      <div>
        <p>${this.localize("ui.panel.lovelace.editor.migrate.para_no_id")}</p>
        <p>${this.localize("ui.panel.lovelace.editor.migrate.para_migrate")}</p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-migrate-config": HuiMigrateConfig;
  }
}

customElements.define("hui-migrate-config", HuiMigrateConfig);
