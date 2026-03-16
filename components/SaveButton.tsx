"use client";

import { useState } from "react";
import { makeFilename } from "@/lib/utils";

interface Props {
  imageUrl: string;
  sketchData: string | null;
  prompt: string;
}

async function saveFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = blob.type.includes("jpeg") ? "jpg" : "png";
    const file = new File([blob], filename.replace(/\.\w+$/, `.${ext}`), { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch { /* fallback */ }
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.click();
}

export default function SaveButton({ imageUrl, sketchData, prompt }: Props) {
  const [saveSketch, setSaveSketch] = useState(false);

  const handleSave = async () => {
    await saveFile(imageUrl, makeFilename("generated", prompt, "jpg"));
    if (saveSketch && sketchData) {
      await saveFile(sketchData, makeFilename("sketch", prompt, "jpg"));
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <button
        onClick={handleSave}
        className="w-full py-3.5 bg-indigo-900 hover:bg-indigo-800 active:bg-indigo-700 text-indigo-300 font-bold rounded-xl text-base transition-colors"
      >
        ⬇️ 保存图片
      </button>
      <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none px-1 dark:text-gray-400">
        <input
          type="checkbox"
          checked={saveSketch}
          onChange={(e) => setSaveSketch(e.target.checked)}
          className="w-4 h-4 accent-indigo-500 rounded"
        />
        同时保存草图
      </label>
    </div>
  );
}
