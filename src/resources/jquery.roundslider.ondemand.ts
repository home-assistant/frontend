import { TemplateResult } from "lit-element";

type LoadedRoundSlider = Promise<{
  roundSliderStyle: TemplateResult;
  jQuery: any;
}>;

let loaded: LoadedRoundSlider;

export const loadRoundslider = async (): LoadedRoundSlider => {
  if (!loaded) {
    loaded = import(/* webpackChunkName: "jquery-roundslider" */ "./jquery.roundslider");
  }
  return loaded;
};
