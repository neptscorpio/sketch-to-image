"use client";

import { useRef, useState, useEffect, useId } from "react";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import type { Model } from "@/lib/types";

interface Props {
  onGenerate: (imageData: string, prompt: string, model: Model) => void;
  isLoading: boolean;
}

const COLORS = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ffffff"];

const MODEL_OPTIONS: { value: Model; label: string; hint: string }[] = [
  { value: "wanx",         label: "万相",            hint: "草图还原度高，prompt 必填" },
  { value: "seedream",     label: "Seedream 4.5",    hint: "画质更精细，prompt 选填" },
  { value: "seedream5lite",label: "Seedream 5 Lite", hint: "最新模型，prompt 选填" },
];

export default function SketchCanvas({ onGenerate, isLoading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [color, setColor] = useState("#000000");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<Model>("seedream");
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null);
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

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    setEraserCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    draw(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    if (color === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        saveHistory();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // 保持比例居中绘制
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width  - img.width  * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        saveHistory();
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // 允许重复上传同一文件
  };

  const thumbSize = Math.max(12, brushSize);
  const promptRequired = model === "wanx";

  return (
    <div className="flex flex-col gap-3">
      {/* 颜色选择 + 橡皮擦 */}
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
        <button
          onClick={() => setColor("eraser")}
          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-base transition-transform active:scale-95"
          title="橡皮擦"
          style={{
            borderColor: color === "eraser" ? "#6366f1" : "#d1d5db",
            boxShadow: color === "eraser" ? "0 0 0 2px #6366f1" : undefined,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="8" width="20" height="12" rx="2" fill="#fca5a5" stroke="#ef4444" strokeWidth="1.5"/>
            <line x1="14" y1="8" x2="14" y2="20" stroke="#ef4444" strokeWidth="1.5"/>
          </svg>
        </button>
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
          🗑️ 清空
        </button>
        <label className="flex-1 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg active:bg-gray-100 cursor-pointer text-center">
          📁 上传
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {/* 笔刷大小 */}
      <style dangerouslySetInnerHTML={{ __html: `
        #${sliderId} { -webkit-appearance: none; appearance: none; height: 4px; background: #e5e7eb; border-radius: 9999px; outline: none; width: 100%; }
        #${sliderId}::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: ${thumbSize}px; height: ${thumbSize}px; border-radius: 50%; background: #6366f1; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1.5px #6366f1; }
        #${sliderId}::-moz-range-thumb { width: ${thumbSize}px; height: ${thumbSize}px; border-radius: 50%; background: #6366f1; cursor: pointer; border: 2px solid white; }
      ` }} />
      <div className="flex items-center gap-3 text-sm text-gray-500" style={{ paddingLeft: 25, paddingRight: 25, minHeight: thumbSize + 8 }}>
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
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={500}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-white touch-none"
          style={{ cursor: "none" }}
          onMouseDown={startDraw}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={stopDraw}
          onMouseLeave={() => { setEraserCursor(null); stopDraw(); }}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {eraserCursor && (() => {
          const canvas = canvasRef.current;
          const scale = canvas ? canvas.getBoundingClientRect().width / canvas.width : 1;
          const size = Math.max(4, brushSize * scale);
          const isEraser = color === "eraser";
          return (
            <div
              style={{
                position: "absolute",
                left: eraserCursor.x,
                top: eraserCursor.y,
                width: size,
                height: size,
                borderRadius: "50%",
                border: isEraser ? "2px dashed #6366f1" : color === "#ffffff" ? "2px solid #999999" : `2px solid ${color}`,
                background: isEraser ? "rgba(99,102,241,0.15)" : `${color}33`,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
              }}
            />
          );
        })()}
      </div>

      {/* 描述输入 */}
      <input
        type="text"
        placeholder={promptRequired ? "文字提示词（必填）" : "文字提示词（选填）"}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {/* 模型选择 */}
      <div className="flex gap-2">
        {MODEL_OPTIONS.map(({ value, label, hint }) => (
          <button
            key={value}
            onClick={() => setModel(value)}
            title={hint}
            className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
              model === value
                ? "bg-indigo-500 text-white border-indigo-500"
                : "text-gray-500 border-gray-300 hover:border-indigo-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 生成按钮 */}
      <button
        onClick={() => onGenerate(canvasRef.current!.toDataURL("image/jpeg", 0.9), prompt, model)}
        disabled={isLoading}
        className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 active:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-base"
      >
        {isLoading ? "生成中..." : "✨ 生成图片"}
      </button>
    </div>
  );
}
