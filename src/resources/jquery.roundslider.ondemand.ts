import { TemplateResult } from "lit-html";

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
