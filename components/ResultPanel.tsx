"use client";

import SaveButton from "./SaveButton";

interface Props {
  isLoading: boolean;
  error: string | null;
  image: string | null;
  sketchData: string | null;
  prompt: string;
}

export default function ResultPanel({ isLoading, error, image, sketchData, prompt }: Props) {
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
