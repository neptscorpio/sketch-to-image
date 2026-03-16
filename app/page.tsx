"use client";

import { useState } from "react";
import SketchCanvas from "@/components/SketchCanvas";
import ResultPanel from "@/components/ResultPanel";
import type { Model } from "@/lib/types";

type Tab = "draw" | "result";

export default function Home() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [sketchData, setSketchData] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("draw");

  const handleGenerate = async (imageData: string, prompt: string, model: Model) => {
    setIsLoading(true);
    setError(null);
    setSketchData(imageData);
    setLastPrompt(prompt);
    setTab("result");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, prompt, model }),
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

  const resultPanelProps = { isLoading, error, image: generatedImage, sketchData, prompt: lastPrompt };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      <header className="py-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-indigo-700">🎨 涂鸦神笔</h1>
        <p className="text-gray-400 text-xs mt-1">随手涂鸦，AI 帮你变成精美图片</p>
      </header>

      {/* 移动端 Tab 切换 */}
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
        {/* 桌面端双栏布局 */}
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h2 className="font-semibold text-gray-700 mb-3">✏️ 画布</h2>
            <SketchCanvas onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col">
            <h2 className="font-semibold text-gray-700 mb-3">🖼️ 生成结果</h2>
            <ResultPanel {...resultPanelProps} />
          </div>
        </div>

        {/* 移动端 Tab 内容 */}
        <div className="md:hidden bg-white rounded-2xl shadow-md p-4">
          <div className={tab === "draw" ? "block" : "hidden"}>
            <SketchCanvas onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className={tab === "result" ? "block" : "hidden"}>
            <div className="min-h-72">
              <ResultPanel {...resultPanelProps} />
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
