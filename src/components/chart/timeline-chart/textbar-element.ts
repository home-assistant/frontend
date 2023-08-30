import { BarElement, BarOptions, BarProps } from "chart.js";
import { hex2rgb } from "../../../common/color/convert-color";
import { luminosity } from "../../../common/color/rgb";

export interface TextBarProps extends BarProps {
  text?: string | null;
  options?: Partial<TextBaroptions>;
}

export interface TextBaroptions extends BarOptions {
  textPad?: number;
  textColor?: string;
  backgroundColor: string;
}

export class TextBarElement extends BarElement {
  static id = "textbar";

  draw(ctx: CanvasRenderingContext2D) {
    super.draw(ctx);
    const options = this.options as TextBaroptions;
    const { x, y, base, width, text } = (
      this as BarElement<TextBarProps, TextBaroptions>
    ).getProps(["x", "y", "base", "width", "text"]);

    if (!text) {
      return;
    }

    ctx.beginPath();
    const textRect = ctx.measureText(text);
    if (
      textRect.width === 0 ||
      textRect.width + (options.textPad || 4) + 2 > width
    ) {
      return;
    }
    const textColor =
      options.textColor ||
      (options?.backgroundColor === "transparent"
        ? "transparent"
        : luminosity(hex2rgb(options.backgroundColor)) > 0.5
        ? "#000"
        : "#fff");

    // ctx.font = "12px arial";
    ctx.fillStyle = textColor;
    ctx.lineWidth = 0;
    ctx.strokeStyle = textColor;
    ctx.textBaseline = "middle";
    ctx.fillText(
      text,
      x - width / 2 + (options.textPad || 4),
      y + (base - y) / 2
    );
  }

  tooltipPosition(useFinalPosition: boolean) {
    const { x, y, base } = this.getProps(["x", "y", "base"], useFinalPosition);
    return { x, y: y + (base - y) / 2 };
  }
}
