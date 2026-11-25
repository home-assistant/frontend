import type { ReactiveController, ReactiveControllerHost } from "lit";

const DRAG_THRESHOLD = 6;

export interface PointerDragHandlers {
  move(ev: PointerEvent): void;
  drop(ev: PointerEvent): void;
  tap(ev: PointerEvent): void;
  cancel(): void;
}

export class PointerDragController implements ReactiveController {
  private _stop?: () => void;

  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }

  public hostDisconnected(): void {
    this._stop?.();
  }

  public start(down: PointerEvent, handlers: PointerDragHandlers): void {
    this._stop?.();
    let dragging = false;
    const onMove = (ev: PointerEvent) => {
      if (
        !dragging &&
        Math.hypot(ev.clientX - down.clientX, ev.clientY - down.clientY) <
          DRAG_THRESHOLD
      ) {
        return;
      }
      dragging = true;
      handlers.move(ev);
    };
    const onUp = (ev: PointerEvent) => {
      this._stop?.();
      if (dragging) {
        handlers.drop(ev);
      } else {
        handlers.tap(ev);
      }
    };
    const onCancel = () => {
      this._stop?.();
      handlers.cancel();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    this._stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      this._stop = undefined;
    };
  }
}
