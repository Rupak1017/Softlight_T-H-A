# 🖼️ Softlight Figma → HTML Converter

**Description**  
Convert a Figma design frame into responsive **HTML + CSS** using the official Figma REST API. Useful for fast prototyping and code handoff without manual slicing.

---

## 🚀 How to Get Started

1. **Clone & install**
   ```bash
   git clone https://github.com/Rupak1017/Softlight_T-H-A.git
   cd Softlight_T-H-A
   npm install
   ```

2. **Create a `.env` in the project root**
   ```env
   FIGMA_TOKEN=your_personal_figma_token
   FIGMA_FILE_KEY=your_figma_file_key
 

3. **Generate HTML/CSS**
   ```bash
   npm run generate
   ```
   Open `output/index.html` in a browser (styles in `output/styles.css`).

4. **(Optional) Run tests**
   ```bash
   npm test
   ```

---

## ⚠️ Known Limitations

- **Assets**: Image/SVG extraction not implemented; only paint/gradient styles are mapped.
- **Components/Variants**: Flattened; interactive prototype behavior isn’t preserved.
- **Typography parity**: Fonts and exact text metrics may need minor manual tweaks.
- **Fully fluid responsiveness**: Output aims for visual fidelity to the frame; production-grade responsive CSS may require hand-tuning.
- **Very large/complex files**: Deeply nested or highly customized nodes may need additional mapping rules.
