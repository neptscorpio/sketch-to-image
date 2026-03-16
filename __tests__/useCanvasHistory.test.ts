import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";

// Mock canvas context
function makeImageData(tag: number): ImageData {
  return { data: new Uint8ClampedArray([tag]), width: 1, height: 1, colorSpace: "srgb" } as ImageData;
}

function setupHook() {
  let capturedRef: React.RefObject<HTMLCanvasElement | null>;

  const snapshots: ImageData[] = [];
  let currentSnap = makeImageData(0);

  const mockCtx = {
    fillStyle: "",
    fillRect: jest.fn(),
    getImageData: jest.fn(() => currentSnap),
    putImageData: jest.fn((data: ImageData) => { currentSnap = data; }),
  };

  const mockCanvas = {
    width: 600,
    height: 500,
    getContext: jest.fn(() => mockCtx),
  };

  const { result } = renderHook(() => {
    const ref = useRef<HTMLCanvasElement | null>(mockCanvas as unknown as HTMLCanvasElement);
    capturedRef = ref;
    return useCanvasHistory(ref);
  });

  return { result, mockCtx, snapshots, getCurrentSnap: () => currentSnap, setCurrentSnap: (d: ImageData) => { currentSnap = d; } };
}

describe("useCanvasHistory", () => {
  it("initHistory saves initial canvas state", () => {
    const { result, mockCtx } = setupHook();
    act(() => result.current.initHistory());
    expect(mockCtx.getImageData).toHaveBeenCalled();
  });

  it("saveHistory captures current state and clears redo stack", () => {
    const { result, mockCtx } = setupHook();
    act(() => result.current.initHistory());
    act(() => result.current.saveHistory());
    expect(mockCtx.getImageData).toHaveBeenCalledTimes(2);
  });

  it("undo restores the previous state", () => {
    const { result, mockCtx, setCurrentSnap } = setupHook();

    const blank = makeImageData(0);
    const stroke1 = makeImageData(1);

    act(() => result.current.initHistory());          // history: [blank]
    setCurrentSnap(stroke1);
    act(() => result.current.saveHistory());           // history: [blank, stroke1]

    act(() => result.current.undo());                 // should restore blank
    expect(mockCtx.putImageData).toHaveBeenCalledWith(blank, 0, 0);
  });

  it("undo does nothing when at initial state", () => {
    const { result, mockCtx } = setupHook();
    act(() => result.current.initHistory());
    act(() => result.current.undo());
    expect(mockCtx.putImageData).not.toHaveBeenCalled();
  });

  it("redo restores the undone state", () => {
    const { result, mockCtx, setCurrentSnap } = setupHook();

    const blank = makeImageData(0);
    const stroke1 = makeImageData(1);

    act(() => result.current.initHistory());
    setCurrentSnap(stroke1);
    act(() => result.current.saveHistory());

    act(() => result.current.undo());                 // back to blank
    act(() => result.current.redo());                 // forward to stroke1
    expect(mockCtx.putImageData).toHaveBeenLastCalledWith(stroke1, 0, 0);
  });

  it("redo does nothing when redo stack is empty", () => {
    const { result, mockCtx } = setupHook();
    act(() => result.current.initHistory());
    act(() => result.current.redo());
    expect(mockCtx.putImageData).not.toHaveBeenCalled();
  });

  it("saveHistory clears the redo stack", () => {
    const { result, mockCtx, setCurrentSnap } = setupHook();

    const stroke1 = makeImageData(1);
    const stroke2 = makeImageData(2);

    act(() => result.current.initHistory());
    setCurrentSnap(stroke1);
    act(() => result.current.saveHistory());
    act(() => result.current.undo());                 // redo stack has stroke1
    setCurrentSnap(stroke2);
    act(() => result.current.saveHistory());           // new action clears redo

    act(() => result.current.redo());                 // should do nothing
    expect(mockCtx.putImageData).toHaveBeenCalledTimes(1); // only the undo call
  });
});
