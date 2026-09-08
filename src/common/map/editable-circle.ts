/** Handle DOM and styles of the editable circle (MapEngine.addEditableCircle) */

/** Hit target for the radius handle; comfortably above touch minimums */
export const RESIZE_HANDLE_SIZE = 24;

/** The visible dot inside the hit target */
export const RESIZE_HANDLE_DOT_SIZE = 12;

/** Relative radius change per arrow key press on the handle */
export const RESIZE_KEY_STEP = 0.1;

/** Advertised slider maximum; a larger radius raises it (see the engine) */
export const RADIUS_ARIA_MAX = 100000;

export const createResizeHandleElement = (label?: string): HTMLElement => {
  const element = document.createElement("div");
  element.className = "editable-circle-resize";
  element.tabIndex = 0;
  element.setAttribute("role", "slider");
  element.setAttribute("aria-valuemin", "1");
  element.setAttribute("aria-valuemax", String(RADIUS_ARIA_MAX));
  if (label) {
    element.setAttribute("aria-label", label);
  }
  const dot = document.createElement("div");
  dot.className = "editable-circle-resize-dot";
  element.appendChild(dot);
  return element;
};

/** Styles for the handles, included by ha-map for both engines */
export const editableCircleStyles = `
  .editable-circle-center {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primary-color);
    border: 2px solid var(--card-background-color, #fff);
    box-sizing: border-box;
    box-shadow: var(--ha-box-shadow-s);
    cursor: move;
  }
  .editable-circle-resize {
    width: ${RESIZE_HANDLE_SIZE}px;
    height: ${RESIZE_HANDLE_SIZE}px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: ew-resize;
  }
  .editable-circle-resize-dot {
    width: ${RESIZE_HANDLE_DOT_SIZE}px;
    height: ${RESIZE_HANDLE_DOT_SIZE}px;
    border-radius: 50%;
    background: var(--card-background-color, #fff);
    border: 2px solid var(--primary-color);
    box-sizing: border-box;
    box-shadow: var(--ha-box-shadow-s);
  }
`;
