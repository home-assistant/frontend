import type { ContextType } from "@lit/context";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { computeDomain } from "../common/entity/compute_domain";
import type { LocalizeFunc } from "../common/translations/localize";
import { internationalizationContext, statesContext } from "../data/context";
import { computeDeviceClassName } from "../data/entity/device_class";
import { HaFilterStates } from "./ha-filter-states";

@customElement("ha-filter-device-classes")
export class HaFilterDeviceClasses extends HaFilterStates {
  @state()
  @consume({ context: statesContext, subscribe: true })
  private _entityStates?: ContextType<typeof statesContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  @state()
  @consumeLocalize()
  private _localize?: LocalizeFunc;

  private _deviceClasses = memoizeOne(
    (
      states: ContextType<typeof statesContext>,
      localize: LocalizeFunc,
      language: string
    ) => {
      const classes = new Map<string, string>();

      for (const [entityId, stateObj] of Object.entries(states)) {
        const deviceClass = stateObj.attributes.device_class;

        if (typeof deviceClass !== "string" || classes.has(deviceClass)) {
          continue;
        }

        classes.set(
          deviceClass,
          computeDeviceClassName(localize, computeDomain(entityId), deviceClass)
        );
      }

      return [...classes]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, language));
    }
  );

  protected firstUpdated() {
    this._i18n?.loadBackendTranslation("entity_component");
  }

  protected willUpdate() {
    if (this._entityStates && this._localize && this._i18n) {
      this.states = this._deviceClasses(
        this._entityStates,
        this._localize,
        this._i18n.locale.language
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-device-classes": HaFilterDeviceClasses;
  }
}
