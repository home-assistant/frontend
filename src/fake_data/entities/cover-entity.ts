import { supportsFeatureFromAttributes } from "../../common/entity/supports-feature";
import { CoverEntityFeature } from "../../data/cover";
import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

const TRANSITION_STEP_MS = 400;
const POSITION_STEP = 10;

export class MockCoverEntity extends MockBaseEntity {
  private _positionTimer?: ReturnType<typeof setInterval>;

  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    if (service === "open_cover") {
      this._startTransition(100);
      return;
    }

    if (service === "close_cover") {
      this._startTransition(0);
      return;
    }

    if (service === "toggle") {
      if (this.state === "open" || this.state === "opening") {
        this._startTransition(0);
      } else {
        this._startTransition(100);
      }
      return;
    }

    if (service === "stop_cover") {
      this._stopTransition();
      return;
    }

    if (service === "set_cover_position") {
      this._startTransition(data.position);
      return;
    }

    if (service === "open_cover_tilt") {
      this.update({ attributes: { current_tilt_position: 100 } });
      return;
    }

    if (service === "close_cover_tilt") {
      this.update({ attributes: { current_tilt_position: 0 } });
      return;
    }

    if (service === "stop_cover_tilt") {
      return;
    }

    if (service === "set_cover_tilt_position") {
      this.update({
        attributes: { current_tilt_position: data.tilt_position },
      });
      return;
    }

    if (service === "toggle_cover_tilt") {
      const currentTilt = this.attributes.current_tilt_position ?? 0;
      this.update({
        attributes: { current_tilt_position: currentTilt > 0 ? 0 : 100 },
      });
      return;
    }

    super.handleService(domain, service, data);
  }

  private _startTransition(targetPosition: number): void {
    this._stopTransition();
    const hasPosition = supportsFeatureFromAttributes(
      this.attributes,
      CoverEntityFeature.SET_POSITION
    );

    if (!hasPosition) {
      this.update({ state: targetPosition > 0 ? "open" : "closed" });
      return;
    }

    const currentPosition = this.attributes.current_position ?? 0;

    if (currentPosition === targetPosition) {
      return;
    }

    const direction = targetPosition > currentPosition ? 1 : -1;
    const transitionState = direction > 0 ? "opening" : "closing";

    this.update({ state: transitionState });

    this._positionTimer = setInterval(() => {
      const pos = this.attributes.current_position ?? 0;
      const nextPos = pos + POSITION_STEP * direction;

      const reachedTarget =
        direction > 0 ? nextPos >= targetPosition : nextPos <= targetPosition;

      if (reachedTarget) {
        clearInterval(this._positionTimer);
        this._positionTimer = undefined;
        this.update({
          state: targetPosition > 0 ? "open" : "closed",
          attributes: { current_position: targetPosition },
        });
      } else {
        this.update({
          attributes: { current_position: nextPos },
        });
      }
    }, TRANSITION_STEP_MS);
  }

  private _stopTransition(): void {
    if (this._positionTimer) {
      clearInterval(this._positionTimer);
      this._positionTimer = undefined;
    }

    if (this.state === "opening" || this.state === "closing") {
      const pos = this.attributes.current_position ?? 0;
      this.update({ state: pos > 0 ? "open" : "closed" });
    }
  }

  protected _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const stateAttrs: EntityAttributes = {};

    if (supportsFeatureFromAttributes(attrs, CoverEntityFeature.SET_POSITION)) {
      stateAttrs.current_position = attrs.current_position ?? null;
    }

    if (
      supportsFeatureFromAttributes(attrs, CoverEntityFeature.SET_TILT_POSITION)
    ) {
      stateAttrs.current_tilt_position = attrs.current_tilt_position ?? null;
    }

    return stateAttrs;
  }
}
