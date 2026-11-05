import { isComponentLoaded } from "../common/config/is_component_loaded";
import {
  consumeContext,
  ContextController,
} from "../common/decorators/consume";
import type { HomeAssistantApi } from "../types";
import type { AITaskPreferences, GenDataTask } from "./ai_task";
import { fetchAITaskPreferences, generateDataAITask } from "./ai_task";
import { apiContext, configContext } from "./context";

/**
 * Reactive controller that tells whether AI can generate data, and generates
 * it with the entity set in the AI task preferences.
 */
export class AITaskController extends ContextController {
  @consumeContext({
    context: configContext,
    subscribe: true,
    transform: (value) =>
      !!value?.config && isComponentLoaded(value.config, "ai_task"),
  })
  private _loaded?: boolean;

  @consumeContext({ context: apiContext, subscribe: true })
  private _api?: HomeAssistantApi;

  private _prefs?: AITaskPreferences;

  private _fetching = false;

  get canGenerateData(): boolean {
    return !!this._prefs?.gen_data_entity_id;
  }

  generateData<T>(task: GenDataTask) {
    return generateDataAITask<T>(this._api!.callService, task);
  }

  protected contextUpdated(): void {
    if (!this._loaded || !this._api || this._prefs || this._fetching) {
      return;
    }
    this._fetching = true;
    fetchAITaskPreferences(this._api.callWS)
      .then((prefs) => {
        this._prefs = prefs;
        this.host.requestUpdate();
      })
      .finally(() => {
        this._fetching = false;
      });
  }
}
