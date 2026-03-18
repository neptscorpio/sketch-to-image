export const PROMPT_PREFIX =
  "先理解草图传达的核心场景信息（即，用一句话描述场景，包括人物、物体、位置、颜色等，比如：一个戴红色帽子蓝裤子的女生，抱着一个橘猫）。再根据这个核心场景的描述信息生成一张新的高质量图像。不要照搬草图的线条。注意生成图像的美感和质量。";

export const SEEDREAM_MODEL_IDS: Record<string, string> = {
  seedream:      "doubao-seedream-4-5-251128",
  seedream5lite: "doubao-seedream-5-0-260128",
};

export const STYLE_PRESETS: { label: string; prompt: string }[] = [
  { label: "真实摄影", prompt: "真实摄影风格" },
  { label: "艺术",     prompt: "艺术绘画风格，随机选择油画、国画、插画、素描、抽象画等艺术绘画品类之一" },
  { label: "二次元",   prompt: "二次元风格" },
  { label: "电影镜头", prompt: "电影镜头风格" },
];
