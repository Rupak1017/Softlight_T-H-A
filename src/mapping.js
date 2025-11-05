// ---------- Figma → CSS helpers (generalized) ----------

export const px = n => (n == null ? undefined : `${Math.round(n)}px`);

export function colorToRgba(paint) {
  if (!paint || paint.type !== "SOLID" || !paint.color) return null;
  const { r, g, b } = paint.color;
  const a = paint.opacity ?? 1;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

/**
 * Map Figma fills to CSS. For containers/shapes we set background/gradients.
 * NOTE: Text color is handled in textToCss; callers should NOT apply fillToCss to TEXT nodes.
 */
export function fillToCss(fills) {
  if (!Array.isArray(fills) || fills.length === 0) return null;
  const first = fills.find(f => f.visible !== false);
  if (!first) return null;

  if (first.type === "SOLID") {
    return { background: colorToRgba(first) };
  }

  // Basic linear gradient
  if (first.type === "GRADIENT_LINEAR" && first.gradientStops) {
    const stops = first.gradientStops
      .map(s => {
        const { r, g, b, a = 1 } = s.color;
        const pos = Math.round((s.position || 0) * 100);
        return `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, ${a}) ${pos}%`;
      })
      .join(", ");
    return { "background-image": `linear-gradient(${stops})` };
  }

  // TODO: radial/diamond/angular, image paints, multiple fills
  return null;
}

export function borderToCss(strokes, weight) {
  if (!Array.isArray(strokes) || strokes.length === 0 || !weight) return null;
  const s = strokes.find(st => st.visible !== false);
  if (!s || s.type !== "SOLID") return null;
  const color = colorToRgba(s);
  return { border: `${px(weight)} solid ${color}` };
}

// Prefer per-corner when present for generalization
export function radiusToCss(node) {
  if (Array.isArray(node.rectangleCornerRadii) && node.rectangleCornerRadii.length === 4) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    return { "border-radius": `${px(tl)} ${px(tr)} ${px(br)} ${px(bl)}` };
  }
  const r = node.cornerRadius;
  if (r == null) return null;
  return { "border-radius": px(r) };
}

// Autolayout container padding
export function paddingToCss(node) {
  const p = {};
  if (node.paddingLeft != null)   p["padding-left"]   = px(node.paddingLeft);
  if (node.paddingRight != null)  p["padding-right"]  = px(node.paddingRight);
  if (node.paddingTop != null)    p["padding-top"]    = px(node.paddingTop);
  if (node.paddingBottom != null) p["padding-bottom"] = px(node.paddingBottom);
  return p;
}

// Text styles + alignment + color from fills
export function textToCss(node) {
  const css = {};
  const s = node.style || {};
  if (s.fontSize) css["font-size"] = px(s.fontSize);
  if (s.fontWeight) css["font-weight"] = String(s.fontWeight);
  if (s.lineHeightPx) css["line-height"] = px(s.lineHeightPx);
  if (s.letterSpacing) css["letter-spacing"] = px(s.letterSpacing);
  if (s.textDecoration === "UNDERLINE") css["text-decoration"] = "underline";
  if (s.textCase === "UPPER") css["text-transform"] = "uppercase";
  if (s.fontFamily) css["font-family"] = `'${s.fontFamily}', system-ui, sans-serif`;

  if (node.textAlignHorizontal === "LEFT")   css["text-align"] = "left";
  if (node.textAlignHorizontal === "CENTER") css["text-align"] = "center";
  if (node.textAlignHorizontal === "RIGHT")  css["text-align"] = "right";

  // text color from fills
  if (node.fills) {
    const f = fillToCss(node.fills);
    if (f?.background) css.color = f.background;
  }

  // zero default <p> margins for Figma parity
  css["margin"] = "0";

  return css;
}

// Auto-layout containers → CSS flexbox
export function autolayoutToCss(node) {
  if (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL") {
    return {
      display: "flex",
      "flex-direction": node.layoutMode === "HORIZONTAL" ? "row" : "column",
      gap: node.itemSpacing != null ? px(node.itemSpacing) : undefined,
      "align-items": mapAlign(node.counterAxisAlignItems),
      "justify-content": mapAlign(node.primaryAxisAlignItems)
    };
  }
  return {};
}

// Child-specific hints when inside an autolayout parent
export function childInAutoLayoutCss(node) {
  const css = {};
  if (node.layoutGrow === 1) css.flex = "1 1 auto"; // grow/stretch
  switch (node.layoutAlign) {
    case "MIN": css["align-self"] = "flex-start"; break;
    case "CENTER": css["align-self"] = "center"; break;
    case "MAX": css["align-self"] = "flex-end"; break;
    case "STRETCH": css["align-self"] = "stretch"; break;
    default: break; // INHERIT/undefined
  }
  return css;
}

// Effects → basic drop shadow
export function effectsToCss(effects) {
  if (!Array.isArray(effects) || effects.length === 0) return null;
  const sh = effects.find(e => e.type === "DROP_SHADOW" && e.visible !== false);
  if (!sh) return null;
  const { r, g, b, a = 1 } = sh.color || {};
  const x = sh.offset?.x || 0;
  const y = sh.offset?.y || 0;
  const blur = sh.radius || 0;
  const color = `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, ${a})`;
  return { "box-shadow": `${px(x)} ${px(y)} ${px(blur)} 0 ${color}` };
}

function mapAlign(v) {
  switch (v) {
    case "MIN": return "flex-start";
    case "CENTER": return "center";
    case "MAX": return "flex-end";
    case "SPACE_BETWEEN": return "space-between";
    default: return undefined;
  }
}
