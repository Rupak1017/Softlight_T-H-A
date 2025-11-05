import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "..", "output");

describe("Figma → HTML generator", () => {
  it("should generate index.html", () => {
    const htmlPath = path.join(outputDir, "index.html");
    expect(fs.existsSync(htmlPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, "utf-8");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<div class=\"artboard\"");
  });

  it("should generate styles.css", () => {
    const cssPath = path.join(outputDir, "styles.css");
    expect(fs.existsSync(cssPath)).toBe(true);

    const css = fs.readFileSync(cssPath, "utf-8");
    expect(css.length).toBeGreaterThan(10);
  });
});
