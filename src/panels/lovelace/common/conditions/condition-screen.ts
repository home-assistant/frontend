import { HomeAssistant } from "../../../../types";
import { ConditionHandler } from "./handle-condition";
import { LovelaceBaseCondition } from "./types";

export type LovelaceScreenCondition = LovelaceBaseCondition & {
  condition: "screen";
  media_query?: string;
};

export class ScreenConditionHandler
  implements ConditionHandler<LovelaceScreenCondition>
{
  validate(condition: LovelaceScreenCondition): boolean {
    return condition.media_query != null;
  }

  check(condition: LovelaceScreenCondition, _hass: HomeAssistant): boolean {
    return condition.media_query
      ? window.matchMedia(condition.media_query).matches
      : false;
  }
}
