// Compat needs to be first import
import "../resources/compatibility";
import { setCancelSyntheticClickEvents } from "@polymer/polymer/lib/utils/settings";
import "../auth/ha-authorize";
import "../resources/ha-style";
import "../resources/roboto";
import "../resources/safari-14-attachshadow-patch";
import "../resources/array.flat.polyfill";

setCancelSyntheticClickEvents(false);
