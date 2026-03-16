import { useRef, useCallback } from "react";

export function useCanvasHistory(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const history = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);

  const initHistory = useCallback(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    history.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  }, [canvasRef]);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    history.current = [...history.current.slice(-19), snap];
    redoStack.current = [];
  }, [canvasRef]);

  const undo = useCallback(() => {
    if (history.current.length <= 1) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    redoStack.current = [...redoStack.current, history.current[history.current.length - 1]];
    history.current = history.current.slice(0, -1);
    ctx.putImageData(history.current[history.current.length - 1], 0, 0);
  }, [canvasRef]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const next = redoStack.current[redoStack.current.length - 1];
    redoStack.current = redoStack.current.slice(0, -1);
    history.current = [...history.current, next];
    ctx.putImageData(next, 0, 0);
  }, [canvasRef]);

  return { initHistory, saveHistory, undo, redo };
}
