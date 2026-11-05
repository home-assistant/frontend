import { customElement } from "lit/decorators";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { HaHomeSummaryPanelBase } from "../home/ha-home-summary-panel-base";

@customElement("ha-panel-security")
class PanelSecurity extends HaHomeSummaryPanelBase<"security"> {
  protected readonly _systemDataKey = "security";

  protected _strategyOptions() {
    return {
      alert_entities: this._config?.alert_entities,
      favorite_entities: this._config?.favorite_entities,
    };
  }

  protected _favoriteChanged(
    ev: HASSDomEvent<HASSDomEvents["entity-favorite-changed"]>
  ) {
    if (!this._config) {
      return;
    }
    const { entity, favorite } = ev.detail;
    const favoriteEntities = (this._config.favorite_entities ?? []).filter(
      (entityId) => entityId !== entity
    );
    if (favorite) {
      favoriteEntities.push(entity);
    }
    this._saveConfig({
      ...this._config,
      favorite_entities: favoriteEntities.length ? favoriteEntities : undefined,
    });
    this._setLovelace();
  }

  protected _alertChanged(
    ev: HASSDomEvent<HASSDomEvents["entity-alert-changed"]>
  ) {
    if (!this._config) {
      return;
    }
    const { entity, severity } = ev.detail;
    const current = this._config.alert_entities ?? [];
    const alertEntities = !severity
      ? current.filter((alertEntity) => alertEntity.entity !== entity)
      : current.some((alertEntity) => alertEntity.entity === entity)
        ? current.map((alertEntity) =>
            alertEntity.entity === entity
              ? { ...alertEntity, severity }
              : alertEntity
          )
        : [...current, { entity, severity }];
    this._saveConfig({
      ...this._config,
      alert_entities: alertEntities.length ? alertEntities : undefined,
    });
    this._setLovelace();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-security": PanelSecurity;
  }
}
