export interface DebugSafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
  highlight: boolean;
}

export const DEBUG_SAFE_AREA_TOOL_STORAGE_KEY = "debugSafeAreaTool";

export const DEBUG_SAFE_AREA_STORAGE_KEY = "debugSafeArea";

const STYLE_ID = "ha-debug-safe-area";

export const applyDebugSafeArea = (config?: DebugSafeArea): void => {
  let style = document.getElementById(STYLE_ID);
  if (
    !config ||
    !(config.top || config.right || config.bottom || config.left)
  ) {
    style?.remove();
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.append(style);
  }
  const { top, right, bottom, left, highlight } = config;
  // Important wins over the insets the companion app sets
  style.textContent = `
    :root {
      --app-safe-area-inset-top: ${top}px !important;
      --app-safe-area-inset-right: ${right}px !important;
      --app-safe-area-inset-bottom: ${bottom}px !important;
      --app-safe-area-inset-left: ${left}px !important;
    }
    ${
      highlight
        ? `html::after {
            content: "";
            position: fixed;
            inset: 0;
            box-sizing: border-box;
            border: solid rgba(255, 0, 0, 0.25);
            border-width: ${top}px ${right}px ${bottom}px ${left}px;
            pointer-events: none;
            z-index: 2147483646;
          }`
        : ""
    }
  `;
};
