export function styleObjToText(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}:${v};`)
    .join("");
}

let seq = 0;
export function nextClass() {
  seq += 1;
  return `n${seq}`;
}
