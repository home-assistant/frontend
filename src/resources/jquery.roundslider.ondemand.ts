import { TemplateResult } from "lit-element";

interface LoadedRoundSlider {
  roundSliderStyle: TemplateResult;
  jQuery: any;
}

let loaded: Promise<LoadedRoundSlider>;

export const loadRoundslider = async (): Promise<LoadedRoundSlider> => {
  if (!loaded) {
    loaded = import(/* webpackChunkName: "jquery-roundslider" */ "./jquery.roundslider");
  }
  return loaded;
};
