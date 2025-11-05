// Node 18+ has global fetch
const BASE = "https://api.figma.com/v1";

function authHeaders(token) {
  return { "X-Figma-Token": token };
}

export async function fetchFigmaFile(fileKey, token) {
  const res = await fetch(`${BASE}/files/${fileKey}`, { headers: authHeaders(token) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Figma /files failed ${res.status}: ${t}`);
  }
  return res.json(); // huge JSON (document tree)
}

// ids: array of node ids you want bitmaps for
export async function fetchImages(fileKey, ids, token, format = "png", scale = 2) {
  const url = new URL(`${BASE}/images/${fileKey}`);
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("format", format);
  url.searchParams.set("scale", String(scale));

  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Figma /images failed ${res.status}: ${await res.text()}`);
  return res.json(); // { images: { [nodeId]: tempUrl }, err: null }
}

export function listTopFrames(fileJson) {
  const pages = fileJson.document?.children || [];
  const frames = [];
  for (const page of pages) {
    for (const node of page.children || []) {
      if (["FRAME", "GROUP", "COMPONENT", "INSTANCE"].includes(node.type)) {
        frames.push({ page: page.name, id: node.id, name: node.name, node });
      }
    }
  }
  return frames;
}
