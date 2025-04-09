import type { IconMetaFile } from "../types.js";

import * as iconMetadata_ from "../../build/mdi/iconMetadata.json";

export const iconMetadata = (iconMetadata_ as any).default as IconMetaFile;
