import type { HaSlider } from "../../components/ha-slider";

interface VolumeSliderControllerOptions {
  getSlider: () => HaSlider | undefined;
  step: number;
  onSetVolume: (value: number) => void;
  onSetVolumeDebounced?: (value: number) => void;
  onValueUpdated?: (value: number) => void;
}

export class VolumeSliderController {
  private _touchStartX = 0;

  private _touchStartY = 0;

  private _touchStartValue = 0;

  private _touchDragging = false;

  private _touchScrolling = false;

  private _dragging = false;

  private _lastValue = 0;

  private _options: VolumeSliderControllerOptions;

  constructor(options: VolumeSliderControllerOptions) {
    this._options = options;
  }

  public get isInteracting(): boolean {
    return this._touchDragging || this._dragging;
  }

  public setStep(step: number): void {
    this._options.step = step;
  }

  public handleInput = (ev: Event): void => {
    ev.stopPropagation();
    const value = Number((ev.target as HaSlider).value);
    this._dragging = true;
    this._updateValue(value);
    this._options.onSetVolumeDebounced?.(value);
  };

  public handleChange = (ev: Event): void => {
    ev.stopPropagation();
    const value = Number((ev.target as HaSlider).value);
    this._dragging = false;
    this._updateValue(value);
    this._options.onSetVolume(value);
  };

  public handleTouchStart = (ev: TouchEvent): void => {
    ev.stopPropagation();
    const touch = ev.touches[0];
    this._touchStartX = touch.clientX;
    this._touchStartY = touch.clientY;
    this._touchStartValue = this._getSliderValue();
    this._touchDragging = false;
    this._touchScrolling = false;
    this._showTooltip();
  };

  public handleTouchMove = (ev: TouchEvent): void => {
    if (this._touchScrolling) {
      return;
    }
    const touch = ev.touches[0];
    const deltaX = touch.clientX - this._touchStartX;
    const deltaY = touch.clientY - this._touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (!this._touchDragging) {
      if (absDeltaY > 10 && absDeltaY > absDeltaX * 2) {
        this._touchScrolling = true;
        return;
      }
      if (absDeltaX > 8) {
        this._touchDragging = true;
      }
    }

    if (this._touchDragging) {
      ev.preventDefault();
      const newValue = this._getVolumeFromTouch(touch.clientX);
      this._updateValue(newValue);
    }
  };

  public handleTouchEnd = (ev: TouchEvent): void => {
    if (this._touchScrolling) {
      this._touchScrolling = false;
      this._hideTooltip();
      return;
    }

    const touch = ev.changedTouches[0];
    if (!this._touchDragging) {
      const tapValue = this._getVolumeFromTouch(touch.clientX);
      const delta =
        tapValue > this._touchStartValue
          ? this._options.step
          : -this._options.step;
      const newValue = this._roundVolumeValue(this._touchStartValue + delta);
      this._updateValue(newValue);
      this._options.onSetVolume(newValue);
    } else {
      const finalValue = this._getVolumeFromTouch(touch.clientX);
      this._updateValue(finalValue);
      this._options.onSetVolume(finalValue);
    }

    this._touchDragging = false;
    this._dragging = false;
    this._hideTooltip();
  };

  public handleTouchCancel = (): void => {
    this._touchDragging = false;
    this._touchScrolling = false;
    this._dragging = false;
    this._updateValue(this._touchStartValue);
    this._hideTooltip();
  };

  public handleWheel = (ev: WheelEvent): void => {
    ev.preventDefault();
    ev.stopPropagation();
    const direction = ev.deltaY > 0 ? -1 : 1;
    const currentValue = this._getSliderValue();
    const newValue = this._roundVolumeValue(
      currentValue + direction * this._options.step
    );
    this._updateValue(newValue);
    this._options.onSetVolume(newValue);
  };

  private _getVolumeFromTouch(clientX: number): number {
    const slider = this._options.getSlider();
    if (!slider) {
      return 0;
    }
    const rect = slider.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const percentage = (x / rect.width) * 100;
    return this._roundVolumeValue(percentage);
  }

  private _roundVolumeValue(value: number): number {
    return Math.min(
      Math.max(Math.round(value / this._options.step) * this._options.step, 0),
      100
    );
  }

  private _getSliderValue(): number {
    const slider = this._options.getSlider();
    if (slider) {
      return Number(slider.value);
    }
    return this._lastValue;
  }

  private _updateValue(value: number): void {
    this._lastValue = value;
    this._options.onValueUpdated?.(value);
    const slider = this._options.getSlider();
    if (slider) {
      slider.value = value;
    }
  }

  private _showTooltip(): void {
    const slider = this._options.getSlider() as any;
    slider?.showTooltip?.();
  }

  private _hideTooltip(): void {
    const slider = this._options.getSlider() as any;
    slider?.hideTooltip?.();
  }
}
