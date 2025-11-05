import 'dotenv/config'; // optional — enables .env if you prefer
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchFigmaFile, listTopFrames } from "./figma.js";
import {
  px,
  fillToCss,
  borderToCss,
  radiusToCss,
  textToCss,
  autolayoutToCss,
  paddingToCss,
  childInAutoLayoutCss,
  effectsToCss
} from "./mapping.js";
import { styleObjToText, nextClass } from "./util.js";

// ---- env ----
const FILE_KEY = process.env.FIGMA_FILE_KEY || "n5yLH8Hbf7d6VFqxiAECcn";
const TOKEN = process.env.FIGMA_TOKEN;

if (!TOKEN) {
  console.error("❌ Set FIGMA_TOKEN env var (and optionally FIGMA_FILE_KEY).");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "output");

async function main() {
  const file = await fetchFigmaFile(FILE_KEY, TOKEN);

  // Choose a frame to render (first top-level frame by default; FRAME_NAME to override)
  const frames = listTopFrames(file);
  if (frames.length === 0) throw new Error("No top-level frames in this file.");
  const frameName = process.env.FRAME_NAME;
  const target = frameName
    ? (frames.find(f => f.name === frameName) || frames[0]).node
    : frames[0].node;

  const size = getFrameSize(target);
  const { html, css } = renderTree(target);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "index.html"), htmlBoilerplate(html, size));
  await fs.writeFile(path.join(OUT_DIR, "styles.css"), css.join("\n"));
  console.log("✅ Wrote output/index.html and output/styles.css");
}

function getFrameSize(frameNode) {
  const bb = frameNode?.absoluteBoundingBox;
  return {
    w: Math.round(bb?.width ?? 390),
    h: Math.round(bb?.height ?? 844),
  };
}

function htmlBoilerplate(bodyHtml, size) {
  // We wrap the output in .artboard and auto-scale it to fit viewport (keep as-is)
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Figma → HTML</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./styles.css" />
  <style>
    html,body{margin:0;padding:0}
    *,*::before,*::after{box-sizing:border-box}
    p{margin:0}
    body{display:flex;justify-content:center;align-items:center;background:#ffffff;min-height:100vh}
    .artboard{width:${size.w}px;height:${size.h}px;transform-origin:top center}
  </style>
</head>
<body>
  <div class="artboard" data-frame-w="${size.w}" data-frame-h="${size.h}">
${bodyHtml}
  </div>
  <script>
    (function fitArtboard(){
      const el = document.querySelector('.artboard');
      function fit(){
        const fw = Number(el.getAttribute('data-frame-w')) || el.offsetWidth;
        const fh = Number(el.getAttribute('data-frame-h')) || el.offsetHeight;
        const scale = Math.min(window.innerWidth / fw, window.innerHeight / fh);
        el.style.transform = 'scale(' + scale + ')';
      }
      window.addEventListener('resize', fit);
      fit();
    })();
  </script>
</body>
</html>`;
}

function renderTree(root) {
  const css = [];
  const html = visit(root, css, null);
  return { html, css };
}

function visit(node, css, parent) {
  if (node.visible === false) return ""; // ignore hidden nodes

  const cls = nextClass();
  const style = baseStyle(node, parent);
  css.push(`.${cls}{${styleObjToText(style)}}`);

  if (node.type === "TEXT") {
    const text = (node.characters || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    return `<p class="${cls}">${text}</p>`;
  }

  const children = (node.children || []).map(n => visit(n, css, node)).join("\n");
  return `<div class="${cls}">${children}</div>`;
}

function baseStyle(node, parent) {
  const s = {};

  const bb = node.absoluteBoundingBox;
  const parentIsAuto =
    parent && (parent.layoutMode === "HORIZONTAL" || parent.layoutMode === "VERTICAL");

  // Sizing: if parent is NOT autolayout, size child explicitly; otherwise let flex handle it.
  if (!parentIsAuto && bb) {
    s.width  = px(bb.width);
    s.height = px(bb.height);
  }

  // Fills / borders / radius / effects
  if (node.type !== "TEXT") {
    Object.assign(s, fillToCss(node.fills) || {});
  }
  Object.assign(s, borderToCss(node.strokes, node.strokeWeight) || {});
  const r = radiusToCss(node);
  Object.assign(s, r || {});
  if (r) s.overflow = "hidden";
  Object.assign(s, effectsToCss(node.effects) || {});

  // Layout container styles & padding
  Object.assign(s, autolayoutToCss(node));
  Object.assign(s, paddingToCss(node));

  // Text
  if (node.type === "TEXT") Object.assign(s, textToCss(node));

  // Child tweaks inside autolayout
  if (parentIsAuto) {
    Object.assign(s, childInAutoLayoutCss(node));
  }

  // --- ONLY adjust the specific "Forgot password" text for alignment (center it) ---
  if (node.type === "TEXT" && typeof node.characters === "string") {
    const txt = node.characters.trim().toLowerCase();
    const isForgot = txt.includes("forgot") && txt.includes("password");
    if (isForgot) {
      if (parentIsAuto) {
        // Center within the auto-layout container
        s["align-self"] = "center";
        s.width = "auto";
        s["text-align"] = "center";
      } else if (parent && parent.absoluteBoundingBox && bb) {
        // Parent isn't auto-layout: compute centered left within parent's padding box
        const pbb = parent.absoluteBoundingBox;
        const pl = Number(parent.paddingLeft ?? 0);
        const pr = Number(parent.paddingRight ?? 0);
        const inner = Math.max(0, (pbb.width ?? 0) - pl - pr);
        const left = pl + Math.max(0, (inner - bb.width) / 2);
        s.position = "absolute";
        s.left = px(left);
        s.width = px(bb.width);
        s["text-align"] = "center";
      }
    }
  }
  // -------------------------------------------------------------------------------

  // Positioning: if parent is NOT autolayout, absolutely position child relative to parent
  if (parent && !parentIsAuto && bb && parent.absoluteBoundingBox) {
    s.position = s.position || "absolute";
    s.left = s.left ?? px(bb.x - parent.absoluteBoundingBox.x);
    s.top  = s.top  ?? px(bb.y - parent.absoluteBoundingBox.y);
  } else {
    s.position = s.position || "relative";
  }

  s.boxSizing = "border-box";
  return s;
}

main().catch(err => {
  console.error("Generation failed:", err);
  process.exit(1);
});
