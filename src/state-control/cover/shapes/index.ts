import type { CoverControlMode } from "../../../data/cover";
import { awningShape } from "./awning";
import { curtainShape } from "./curtain";
import { garageShape, panelShape, rollerShape, shutterShape } from "./roller";
import type { CoverShape } from "./shared";
import { slatsShape } from "./slats";
import { slideShape } from "./slide";
import { venetianShape } from "./venetian";

const POSITION_SHAPES: Record<string, CoverShape | undefined> = {
  awning: awningShape,
  blind: venetianShape,
  curtain: curtainShape,
  garage: garageShape,
  gate: slideShape,
  shade: rollerShape,
  shutter: shutterShape,
};

export const coverShape = (
  deviceClass: string | undefined,
  mode: CoverControlMode
): CoverShape => {
  if (mode === "tilt") {
    return slatsShape;
  }
  return (deviceClass && POSITION_SHAPES[deviceClass]) || panelShape;
};
