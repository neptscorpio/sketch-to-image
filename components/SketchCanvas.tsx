"use client";

import { useRef, useState, useEffect, useId } from "react";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";

interface Props {
  onGenerate: (imageData: string, prompt: string) => void;
  isLoading: boolean;
}

const COLORS = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ffffff"];

export default function SketchCanvas({ onGenerate, isLoading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [color, setColor] = useState("#000000");
  const [prompt, setPrompt] = useState("");
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const sliderId = useId().replace(/:/g, "-");

  const { initHistory, saveHistory, undo, redo } = useCanvasHistory(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    initHistory();
  }, [initHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    if (isDrawing) saveHistory();
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clear = () => {
    saveHistory();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const thumbSize = Math.max(12, brushSize);

  return (
    <div className="flex flex-col gap-3">
      {/* 颜色选择 */}
      <div className="flex items-center gap-2 flex-wrap">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="w-8 h-8 rounded-full border-2 transition-transform active:scale-95"
            style={{
              backgroundColor: c,
              borderColor: color === c ? "#6366f1" : "#d1d5db",
              boxShadow: color === c ? "0 0 0 2px #6366f1" : undefined,
            }}
          />
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button onClick={undo} className="flex-1 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg active:bg-gray-100">
          ↩ 撤回
        </button>
        <button onClick={redo} className="flex-1 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg active:bg-gray-100">
          ↪ 重做
        </button>
        <button onClick={clear} className="flex-1 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg active:bg-gray-100">
          清空
        </button>
      </div>

      {/* 笔刷大小 */}
      <style dangerouslySetInnerHTML={{ __html: `
        #${sliderId} { -webkit-appearance: none; appearance: none; height: 4px; background: #e5e7eb; border-radius: 9999px; outline: none; width: 100%; }
        #${sliderId}::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: ${thumbSize}px; height: ${thumbSize}px; border-radius: 50%; background: #6366f1; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1.5px #6366f1; }
        #${sliderId}::-moz-range-thumb { width: ${thumbSize}px; height: ${thumbSize}px; border-radius: 50%; background: #6366f1; cursor: pointer; border: 2px solid white; }
      ` }} />
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span className="shrink-0">笔刷</span>
        <input
          id={sliderId}
          type="range" min={2} max={50} value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-8 text-right">{brushSize}px</span>
      </div>

      {/* 画布 */}
      <canvas
        ref={canvasRef}
        width={600}
        height={500}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-white touch-none cursor-crosshair"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />

      {/* 描述输入 */}
      <input
        type="text"
        placeholder="描述你想生成的图片，如：a bird flying over the sea（必填）"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {/* 生成按钮 */}
      <button
        onClick={() => onGenerate(canvasRef.current!.toDataURL("image/jpeg", 0.9), prompt)}
        disabled={isLoading}
        className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 active:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-base"
      >
        {isLoading ? "生成中..." : "✨ 生成图片"}
      </button>
    </div>
  );
}
