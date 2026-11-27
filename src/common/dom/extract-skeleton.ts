/**
 * Read a skeleton from rendered content, such as a dashboard card: where its
 * text lines, icons, images, controls and drawings are, inside shadow roots
 * too. The content stays the source of truth for layout, so the skeleton
 * can't drift from it.
 *
 * Any element can say how it's read with a `data-skeleton` attribute:
 * - `text`, `round` or `block`: one piece of that kind, the size of the element
 * - `none`: left out and left showing, such as a card's own chrome
 * - `keep`: left showing, but what's inside it is still read
 *
 * Skeletons a component already draws itself (`ha-skeleton` and its
 * variants) are left out and left showing, as `none`.
 */

export type SkeletonPieceKind = "text" | "round" | "block" | "shape" | "scrim";

type SkeletonOverride = "text" | "round" | "block" | "none" | "keep";

const OVERRIDES = new Set<string>(["text", "round", "block", "none", "keep"]);

const isOverride = (value: string | null): value is SkeletonOverride =>
  value !== null && OVERRIDES.has(value);

const skeletonOverride = (element: Element): SkeletonOverride | undefined => {
  if (element.localName.startsWith("ha-skeleton")) {
    return "none";
  }

  const value = element.getAttribute("data-skeleton");

  return isOverride(value) ? value : undefined;
};

export interface SkeletonPiece {
  kind: SkeletonPieceKind;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: string;
  /* An SVG mask for a drawing, such as a gauge arc */
  mask?: string;
  /* Where that mask sits in the piece, when something cuts the drawing short:
     still the drawing's whole size and place, with the piece only its part */
  maskBox?: { x: number; y: number; width: number; height: number };
  /* The part sits on a dark overlay, such as a picture card's name bar */
  onDark?: boolean;
  /* A see-through bar laid over a picture, kept as it is */
  background?: string;
}

export interface ExtractedSkeleton {
  pieces: SkeletonPiece[];
  /* The elements the pieces stand in for, hidden while loading */
  parts: (HTMLElement | SVGElement)[];
  /* Elements holding text: hide only the text colour, as the same element
     often draws a frame, such as a badge's pill, that has to stay */
  textParts: HTMLElement[];
}

const ROUND_TAGS = new Set([
  "ha-tile-icon",
  "ha-state-icon",
  "ha-svg-icon",
  "ha-icon",
  "state-badge",
]);

const BLOCK_TAGS = new Set(["img", "video", "canvas", "ha-camera-stream"]);

/* A canvas to measure fonts with, made on first use */
let measuringContext: CanvasRenderingContext2D | null | undefined;

const fontContext = (style: CSSStyleDeclaration, size: string) => {
  measuringContext ??= document.createElement("canvas").getContext("2d");

  if (measuringContext) {
    measuringContext.font = `${style.fontStyle} ${style.fontWeight} ${size} ${style.fontFamily}`;
  }

  return measuringContext;
};

/**
 * Where a text bar goes on a line of this font: from the top of the
 * capitals down to the baseline, measured from the font itself.
 * `size` is the size as drawn, after any SVG scaling.
 */
const capitalBand = (style: CSSStyleDeclaration, size: number) => {
  const context = fontContext(style, `${size}px`);

  if (!context) {
    return { top: size * 0.2, height: size * 0.7 };
  }

  const metrics = context.measureText("H");

  return {
    // The line box holds the font's ascent, so the baseline sits that far down
    top: metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent,
    height: metrics.actualBoundingBoxAscent,
  };
};

/* How wide "…" is in this font, the room cut-off text leaves at its end */
const ellipsisWidth = (style: CSSStyleDeclaration) =>
  fontContext(style, style.fontSize)?.measureText("…").width ??
  parseFloat(style.fontSize);

/* The icon as drawn, not its box, which a line of text can crop */
const findGlyph = (element: Element, depth = 4): Element | undefined => {
  if (depth === 0) {
    return undefined;
  }

  for (const child of [
    ...(element.shadowRoot?.children ?? []),
    ...element.children,
  ]) {
    if (child instanceof SVGSVGElement) {
      return child;
    }

    const found = findGlyph(child, depth - 1);

    if (found) {
      return found;
    }
  }

  return undefined;
};

/* Near-white text or icons, as on a picture card's dark name bar */
const isNearWhite = (color: string): boolean => {
  const channels = color
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);

  return channels?.length === 3 && channels.every((channel) => channel >= 200);
};

const isRendered = (style: CSSStyleDeclaration) =>
  style.display !== "none" && style.visibility !== "hidden";

const isSeeThrough = (color: string) => {
  const alpha = Number(color.match(/rgba\(.*,\s*([\d.]+)\)/)?.[1] ?? 1);

  return alpha > 0 && alpha < 1;
};

/* The first element, inside shadow roots too, that rounds its corners */
const findRounded = (element: Element, depth = 4): Element | undefined => {
  if (depth === 0) {
    return undefined;
  }

  const children = [
    ...(element.shadowRoot?.children ?? []),
    ...element.children,
  ];

  for (const child of children) {
    if (parseFloat(getComputedStyle(child).borderTopLeftRadius) > 0) {
      return child;
    }

    const found = findRounded(child, depth - 1);

    if (found) {
      return found;
    }
  }

  return undefined;
};

/* Join the pieces of one line of text, such as "Heat", "·" and "21 °C" */
const mergeLines = (pieces: SkeletonPiece[]): SkeletonPiece[] => {
  const merged: SkeletonPiece[] = [];

  for (const piece of pieces) {
    const previous = merged[merged.length - 1];

    // Either side, so right-to-left lines join too
    const gap = previous
      ? Math.max(
          piece.x - (previous.x + previous.width),
          previous.x - (piece.x + piece.width)
        )
      : Infinity;

    const sameLine =
      previous?.kind === "text" &&
      piece.kind === "text" &&
      Math.abs(previous.y - piece.y) < 2 &&
      Math.abs(previous.height - piece.height) < 2 &&
      gap < 12;

    if (sameLine) {
      const left = Math.min(previous.x, piece.x);

      const right = Math.max(
        previous.x + previous.width,
        piece.x + piece.width
      );

      previous.x = left;
      previous.width = right - left;
      continue;
    }

    merged.push({ ...piece });
  }

  return merged;
};

const svgMask = (svg: SVGSVGElement, width: number, height: number) => {
  const clone = svg.cloneNode(true);

  if (!(clone instanceof SVGSVGElement)) {
    return undefined;
  }

  const originals = [svg, ...svg.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  let drawnPaths = 0;

  originals.forEach((original, index) => {
    const copy = copies[index];
    const style = getComputedStyle(original);

    if (original.localName === "text" || !isRendered(style)) {
      copy.setAttribute("display", "none");

      return;
    }

    if (original !== svg && original.localName !== "g") {
      drawnPaths++;
    }

    copy.removeAttribute("class");
    copy.removeAttribute("style");
    copy.setAttribute("fill", style.fill === "none" ? "none" : "#000");
    copy.setAttribute("stroke", style.stroke === "none" ? "none" : "#000");
    copy.setAttribute("stroke-width", style.strokeWidth);
    copy.setAttribute("stroke-linecap", style.strokeLinecap);

    // Keep what moves or cuts a shape, such as a gauge's needle and the
    // dashes that draw its value arc
    if (style.transform !== "none") {
      copy.setAttribute(
        "style",
        `transform: ${style.transform}; transform-origin: ${style.transformOrigin}; transform-box: ${style.transformBox}`
      );
    }

    if (style.strokeDasharray !== "none") {
      copy.setAttribute("stroke-dasharray", style.strokeDasharray);
      copy.setAttribute("stroke-dashoffset", style.strokeDashoffset);
    }
  });

  if (drawnPaths === 0) {
    return undefined;
  }

  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const markup = new XMLSerializer().serializeToString(clone);

  return `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
};

export const extractSkeleton = (
  root: Element,
  origin: DOMRect
): ExtractedSkeleton => {
  const pieces: SkeletonPiece[] = [];
  const parts = new Set<HTMLElement | SVGElement>();
  const textParts = new Set<HTMLElement>();

  /* The card's own background, the first solid one found */
  let surface: string | undefined;

  const box = (rect: DOMRect) => ({
    x: rect.left - origin.left,
    y: rect.top - origin.top,
    width: rect.width,
    height: rect.height,
  });

  /* Near-white content on a light card must sit on a dark bar */
  const onDark = (style: CSSStyleDeclaration) =>
    surface !== undefined && isNearWhite(surface) && isNearWhite(style.color);

  /* An element that cuts off its overflow, such as a scrolling list, cuts the
     pieces read inside it too, as the overlay draws them on a layer of its
     own where that clip doesn't reach */
  const clipPieces = (from: number, rect: DOMRect) => {
    const bounds = box(rect);

    const clipped = pieces.splice(from).flatMap((piece): SkeletonPiece[] => {
      const x = Math.max(piece.x, bounds.x);
      const y = Math.max(piece.y, bounds.y);
      const right = Math.min(piece.x + piece.width, bounds.x + bounds.width);
      const bottom = Math.min(piece.y + piece.height, bounds.y + bounds.height);

      if (right <= x || bottom <= y) {
        return [];
      }

      const cut = { ...piece, x, y, width: right - x, height: bottom - y };

      // A drawing's mask is made for its whole box, so it keeps that box
      if (piece.kind === "shape") {
        const mask = piece.maskBox ?? {
          x: 0,
          y: 0,
          width: piece.width,
          height: piece.height,
        };

        return [
          {
            ...cut,
            maskBox: {
              ...mask,
              x: piece.x + mask.x - x,
              y: piece.y + mask.y - y,
            },
          },
        ];
      }

      return [cut];
    });

    pieces.push(...clipped);
  };

  const addText = (element: Element | ShadowRoot) => {
    const owner = element instanceof ShadowRoot ? element.host : element;

    // Text cut short with an ellipsis reaches past its box, so clip to it.
    // An owner with no box of its own, such as one with display: contents,
    // cuts nothing off.
    const clip = owner.getBoundingClientRect();
    const clips = clip.width > 0 || clip.height > 0;

    element.childNodes.forEach((node) => {
      if (!(node instanceof Text) || !node.textContent?.trim()) {
        return;
      }

      // Slotted text takes its font and colour from the slot it shows in,
      // so that's where it's measured and hidden
      const slot = node.assignedSlot;
      const hideTarget = slot ?? owner;
      const style = getComputedStyle(hideTarget);
      const band = capitalBand(style, parseFloat(style.fontSize));

      if (hideTarget instanceof HTMLElement) {
        textParts.add(hideTarget);
      }

      const range = document.createRange();
      range.selectNodeContents(node);

      for (const rect of range.getClientRects()) {
        // Cut-off text ends in "…", on the right or, right to left, on the
        // left, so stop the bar where that starts
        const left =
          clips && rect.left < clip.left - 1
            ? clip.left + ellipsisWidth(style)
            : rect.left;

        const right =
          clips && rect.right > clip.right + 1
            ? clip.right - ellipsisWidth(style)
            : rect.right;

        if (right <= left) {
          continue;
        }

        pieces.push({
          kind: "text",
          x: left - origin.left,
          width: right - left,
          y: rect.top - origin.top + band.top,
          height: band.height,
          onDark: onDark(style),
        });
      }
    });
  };

  const walk = (node: Element | ShadowRoot) => {
    // Text straight inside a shadow root, as state-display renders its state
    if (node instanceof ShadowRoot) {
      addText(node);
    }

    for (const child of node.children) {
      const style = getComputedStyle(child);

      if (!isRendered(style)) {
        continue;
      }

      const rect = child.getBoundingClientRect();
      const tag = child.localName;
      // Elements such as slots take no space but their content does
      const hasSize = rect.width > 0 && rect.height > 0;
      const override = skeletonOverride(child);

      if (override === "none") {
        continue;
      }

      const clipsOverflow =
        hasSize &&
        (style.overflowX !== "visible" || style.overflowY !== "visible");

      const from = pieces.length;

      // Read what's inside, cut to the child where it hides its overflow
      const descend = () => {
        if (child instanceof HTMLElement) {
          addText(child);
        }

        if (child.shadowRoot) {
          walk(child.shadowRoot);
        }

        walk(child);

        if (clipsOverflow) {
          clipPieces(from, rect);
        }
      };

      if (override === "keep") {
        // Its frame stays, but its own text is read like any other
        descend();
        continue;
      }

      if (override !== undefined) {
        if (
          hasSize &&
          (child instanceof HTMLElement || child instanceof SVGElement)
        ) {
          const size = Math.min(rect.width, rect.height);
          const piece = box(rect);

          pieces.push(
            override === "round"
              ? {
                  kind: "round",
                  x: piece.x + (piece.width - size) / 2,
                  y: piece.y + (piece.height - size) / 2,
                  width: size,
                  height: size,
                }
              : { kind: override, ...piece, radius: style.borderRadius }
          );
          parts.add(child);
        }

        continue;
      }

      if (
        surface === undefined &&
        hasSize &&
        style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        !isSeeThrough(style.backgroundColor)
      ) {
        surface = style.backgroundColor;
      }

      if (child instanceof HTMLElement && ROUND_TAGS.has(tag)) {
        // Use the circle itself, such as the tile icon's 36px background
        const circle = (
          findRounded(child) ??
          findGlyph(child) ??
          child
        ).getBoundingClientRect();

        const size =
          Math.min(circle.width, circle.height) ||
          Math.max(circle.width, circle.height);

        const piece = box(circle);

        if (size > 0) {
          pieces.push({
            kind: "round",
            x: piece.x + (piece.width - size) / 2,
            y: piece.y + (piece.height - size) / 2,
            width: size,
            height: size,
            onDark: onDark(style),
          });
          parts.add(child);
        }

        continue;
      }

      // A see-through bar over a picture stays, so text keeps its contrast
      if (
        child instanceof HTMLElement &&
        hasSize &&
        style.position === "absolute" &&
        isSeeThrough(style.backgroundColor)
      ) {
        pieces.push({
          kind: "scrim",
          ...box(rect),
          radius: style.borderRadius,
          background: style.backgroundColor,
        });
      }

      // Pictures drawn as a background, as hui-image does in a fixed ratio
      if (
        child instanceof HTMLElement &&
        hasSize &&
        style.backgroundImage.startsWith("url(")
      ) {
        pieces.push({
          kind: "block",
          ...box(rect),
          radius: style.borderRadius,
        });
        parts.add(child);
        continue;
      }

      if (child instanceof HTMLElement && hasSize && BLOCK_TAGS.has(tag)) {
        pieces.push({
          kind: "block",
          ...box(rect),
          radius: style.borderRadius,
        });
        parts.add(child);
        continue;
      }

      if (
        child instanceof HTMLElement &&
        hasSize &&
        tag.endsWith("-card-feature")
      ) {
        const control = findRounded(child);

        const radius = control
          ? getComputedStyle(control).borderRadius
          : style.borderRadius;

        pieces.push({ kind: "block", ...box(rect), radius });
        parts.add(child);
        continue;
      }

      if (child instanceof SVGSVGElement && hasSize) {
        const piece = box(rect);
        const mask = svgMask(child, piece.width, piece.height);

        if (mask) {
          pieces.push({ kind: "shape", ...piece, mask });
        }

        child.querySelectorAll("text").forEach((text) => {
          const textRect = text.getBoundingClientRect();

          if (textRect.width === 0) {
            return;
          }

          // SVG text is scaled with its drawing, as the gauge value is
          const scale = text.getScreenCTM()?.a ?? 1;
          const textStyle = getComputedStyle(text);

          const band = capitalBand(
            textStyle,
            parseFloat(textStyle.fontSize) * scale
          );

          pieces.push({
            kind: "text",
            ...box(textRect),
            y: textRect.top - origin.top + band.top,
            height: band.height,
          });
        });

        parts.add(child);
        continue;
      }

      descend();
    }
  };

  // Text straight inside the root, such as plain text in an overlay
  addText(root);
  walk(root);

  return {
    pieces: mergeLines(pieces),
    parts: [...parts],
    textParts: [...textParts],
  };
};
