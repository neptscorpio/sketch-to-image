export function makeFilename(prefix: string, prompt: string, ext: string) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = prompt.trim().slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
  return `${prefix}_${slug}_${date}.${ext}`;
}
