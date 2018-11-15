import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "@polymer/paper-button/paper-button";
import { fireEvent } from "../../../common/dom/fire_event";

import { HomeAssistant } from "../../../types";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { migrateConfig } from "../common/data";

export class HuiMigrateConfig extends hassLocalizeLitMixin(LitElement) {
  public loading?: boolean;
  protected hass?: HomeAssistant;

  static get properties(): PropertyDeclarations {
    return { hass: {}, loading: {} };
  }

  public async migrateConfig(): Promise<void> {
    try {
      await migrateConfig(this.hass!);
      fireEvent(this, "close-dialog");
      fireEvent(this, "reload-lovelace");
    } catch (err) {
      alert(`Migration failed: ${err.message}`);
      fireEvent(this, "migrate-done");
    }
  }

  protected updated() {
    if (this.loading) {
      fireEvent(this, "loaded-dialog");
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
