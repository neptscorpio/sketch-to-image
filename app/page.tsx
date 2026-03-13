"use client";

import { useState } from "react";
import SketchCanvas from "@/components/SketchCanvas";

type Tab = "draw" | "result";

export default function Home() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("draw");

  const handleGenerate = async (imageData: string, prompt: string) => {
    setIsLoading(true);
    setError(null);
    // 手机上自动切换到结果 tab
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
      setTab("result");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="py-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-indigo-700">🎨 Sketch to Image</h1>
        <p className="text-gray-400 text-xs mt-1">随手涂鸦，AI 帮你变成精美图片</p>
      </header>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex mx-4 mb-3 bg-white rounded-xl shadow-sm p-1">
        <button
          onClick={() => setTab("draw")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "draw"
              ? "bg-indigo-500 text-white shadow"
              : "text-gray-400"
          }`}
        >
          ✏️ 画布
        </button>
        <button
          onClick={() => setTab("result")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors relative ${
            tab === "result"
              ? "bg-indigo-500 text-white shadow"
              : "text-gray-400"
          }`}
        >
          🖼️ 结果
          {isLoading && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pb-6 max-w-5xl w-full mx-auto">
        {/* Desktop: side by side */}
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h2 className="font-semibold text-gray-700 mb-3">✏️ 画布</h2>
            <SketchCanvas onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col">
            <h2 className="font-semibold text-gray-700 mb-3">🖼️ 生成结果</h2>
            <ResultPanel isLoading={isLoading} error={error} image={generatedImage} />
          </div>
        </div>

        {/* Mobile: tab view — 两个面板始终挂载，用 CSS 控制显隐 */}
        <div className="md:hidden bg-white rounded-2xl shadow-md p-4">
          <div className={tab === "draw" ? "block" : "hidden"}>
            <SketchCanvas onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className={tab === "result" ? "block" : "hidden"}>
            <div className="min-h-72">
              <ResultPanel isLoading={isLoading} error={error} image={generatedImage} />
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

function SaveButton({ imageUrl }: { imageUrl: string }) {
  const handleSave = async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], "sketch-to-image.jpg", { type: "image/jpeg" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Sketch to Image" });
        return;
      }
    } catch {
      // share 被取消或不支持，fallback 到下载
    }
    // Fallback: 普通下载
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "sketch-to-image.jpg";
    a.target = "_blank";
    a.click();
  };

  return (
    <button
      onClick={handleSave}
      className="mt-3 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-600 font-medium rounded-xl text-sm transition-colors"
    >
      ⬇️ 保存图片
    </button>
  );
}

function ResultPanel({
  isLoading, error, image,
}: {
  isLoading: boolean;
  error: string | null;
  image: string | null;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl min-h-64 bg-gray-50 p-4">
      {isLoading && (
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-spin">⚙️</div>
          <p className="text-sm">AI 正在创作中（约 20-40 秒）...</p>
        </div>
      )}
      {!isLoading && error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}
      {!isLoading && !error && !image && (
        <p className="text-gray-300 text-sm">结果将在此显示</p>
      )}
      {!isLoading && !error && image && (
        <>
          <img src={image} alt="Generated" className="w-full rounded-lg object-contain" />
          <SaveButton imageUrl={image} />
        </>
      )}
    </div>
  );
}
