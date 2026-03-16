"use client";

import { useState } from "react";
import SketchCanvas from "@/components/SketchCanvas";

type Tab = "draw" | "result";

function makeFilename(prefix: string, prompt: string, ext: string) {
  const date = new Date().toISOString().slice(0, 10); // 2026-03-16
  const slug = prompt.trim().slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
  return `${prefix}_${slug}_${date}.${ext}`;
}

export default function Home() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [sketchData, setSketchData] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("draw");

  const handleGenerate = async (imageData: string, prompt: string) => {
    setIsLoading(true);
    setError(null);
    setSketchData(imageData);
    setLastPrompt(prompt);
    setTab("result");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setGeneratedImage(data.image);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      <header className="py-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-indigo-700">🎨 Sketch to Image</h1>
        <p className="text-gray-400 text-xs mt-1">随手涂鸦，AI 帮你变成精美图片</p>
      </header>

      <div className="md:hidden flex mx-4 mb-3 bg-white rounded-xl shadow-sm p-1">
        <button
          onClick={() => setTab("draw")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "draw" ? "bg-indigo-500 text-white shadow" : "text-gray-400"
          }`}
        >
          ✏️ 画布
        </button>
        <button
          onClick={() => setTab("result")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors relative ${
            tab === "result" ? "bg-indigo-500 text-white shadow" : "text-gray-400"
          }`}
        >
          🖼️ 结果
          {isLoading && <span className="absolute top-1 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
        </button>
      </div>

      <main className="flex-1 px-4 pb-6 max-w-5xl w-full mx-auto">
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h2 className="font-semibold text-gray-700 mb-3">✏️ 画布</h2>
            <SketchCanvas onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col">
            <h2 className="font-semibold text-gray-700 mb-3">🖼️ 生成结果</h2>
            <ResultPanel
              isLoading={isLoading} error={error} image={generatedImage}
              sketchData={sketchData} prompt={lastPrompt}
            />
          </div>
        </div>

        <div className="md:hidden bg-white rounded-2xl shadow-md p-4">
          <div className={tab === "draw" ? "block" : "hidden"}>
            <SketchCanvas onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className={tab === "result" ? "block" : "hidden"}>
            <div className="min-h-72">
              <ResultPanel
                isLoading={isLoading} error={error} image={generatedImage}
                sketchData={sketchData} prompt={lastPrompt}
              />
              {!isLoading && (
                <button
                  onClick={() => setTab("draw")}
                  className="mt-4 w-full py-2.5 border border-indigo-300 text-indigo-500 rounded-xl text-sm font-medium"
                >
                  ← 返回画布
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SaveButton({
  imageUrl, sketchData, prompt,
}: {
  imageUrl: string;
  sketchData: string | null;
  prompt: string;
}) {
  const [saveSketch, setSaveSketch] = useState(false);

  const saveFile = async (url: string, filename: string) => {
    // 尝试 Web Share API（移动端存相册）
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
    // Fallback: 普通下载
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.click();
  };

  const handleSave = async () => {
    const generatedName = makeFilename("generated", prompt, "jpg");
    await saveFile(imageUrl, generatedName);

    if (saveSketch && sketchData) {
      const sketchName = makeFilename("sketch", prompt, "jpg");
      await saveFile(sketchData, sketchName);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none px-1">
        <input
          type="checkbox"
          checked={saveSketch}
          onChange={(e) => setSaveSketch(e.target.checked)}
          className="w-4 h-4 accent-indigo-500 rounded"
        />
        同时保存草图
      </label>
      <button
        onClick={handleSave}
        className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-600 font-medium rounded-xl text-sm transition-colors"
      >
        ⬇️ 保存图片
      </button>
    </div>
  );
}

function ResultPanel({
  isLoading, error, image, sketchData, prompt,
}: {
  isLoading: boolean;
  error: string | null;
  image: string | null;
  sketchData: string | null;
  prompt: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl min-h-64 bg-gray-50 p-4">
      {isLoading && (
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-spin">⚙️</div>
          <p className="text-sm">AI 正在创作中（约 20-40 秒）...</p>
        </div>
      )}
      {!isLoading && error && <p className="text-red-400 text-sm text-center">{error}</p>}
      {!isLoading && !error && !image && <p className="text-gray-300 text-sm">结果将在此显示</p>}
      {!isLoading && !error && image && (
        <>
          <img src={image} alt="Generated" className="w-full rounded-lg object-contain" />
          <SaveButton imageUrl={image} sketchData={sketchData} prompt={prompt} />
        </>
      )}
    </div>
  );
}
