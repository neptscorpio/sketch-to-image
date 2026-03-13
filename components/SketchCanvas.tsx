"use client";

import { useRef, useState, useEffect } from "react";

interface Props {
  onGenerate: (imageData: string, prompt: string) => void;
  isLoading: boolean;
}

export default function SketchCanvas({ onGenerate, isLoading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [color, setColor] = useState("#000000");
  const [prompt, setPrompt] = useState("");
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

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
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleGenerate = () => {
    const canvas = canvasRef.current!;
    onGenerate(canvas.toDataURL("image/jpeg", 0.9), prompt);
  };

  const colors = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ffffff"];

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: 颜色 + 清空 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {colors.map((c) => (
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
        <button
          onClick={clear}
          className="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg active:bg-gray-100"
        >
          清空
        </button>
      </div>

      {/* Row 2: 笔刷大小 */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span className="shrink-0">笔刷</span>
        <input
          type="range" min={2} max={30} value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
        <span className="w-8 text-right">{brushSize}px</span>
      </div>

      {/* Canvas */}
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

      {/* Prompt */}
      <input
        type="text"
        placeholder="描述你想生成的图片，如：a bird flying over the sea（必填）"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 active:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-base"
      >
        {isLoading ? "生成中..." : "✨ 生成图片"}
      </button>
    </div>
  );
}
