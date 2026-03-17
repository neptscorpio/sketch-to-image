/**
 * @jest-environment node
 *
 * 测试不同风格、模型、提示词组合下，route 向下游 API 发出的请求参数是否正确。
 */
import { POST } from "@/app/api/generate/route";
import { NextRequest } from "next/server";

const IMAGE_DATA = "data:image/jpeg;base64,/9j/test";
const MOCK_IMAGE_URL = "https://cdn.example.com/result.jpg";
const PREFIX = "先理解草图传达的核心场景信息（即，用一句话描述场景，包括人物、物体、位置、颜色等，比如：一个戴红色帽子蓝裤子的女生，抱着一个橘猫）。再根据这个核心场景的描述信息生成一张新的高质量图像。不要照搬草图的线条。注意生成图像的美感和质量。";

// ── 风格预设（与 SketchCanvas 保持一致）────────────────────────
const STYLE_PRESETS = {
  真实摄影: "真实摄影风格",
  艺术: "艺术绘画风格，随机选择油画、国画、插画、素描、抽象画等艺术绘画品类之一",
  二次元: "二次元风格",
  电影镜头: "电影镜头风格",
};

// ── Seedream model ID 映射（与 route.ts 保持一致）──────────────
const SEEDREAM_MODEL_IDS: Record<string, string> = {
  seedream: "doubao-seedream-4-5-251128",
  seedream5lite: "doubao-seedream-5-0-260128",
};

// ── OSS / Wanx mock ────────────────────────────────────────────
const MOCK_POLICY = {
  data: {
    oss_access_key_id: "key",
    policy: "policy",
    signature: "sig",
    upload_dir: "uploads/",
    upload_host: "https://oss.example.com",
    x_oss_object_acl: "private",
    x_oss_forbid_overwrite: "true",
  },
};

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** 抓取所有 fetch 调用中发送给目标 URL 的请求 body（JSON 解析后） */
async function capturedBodies(fetchMock: jest.Mock, urlFragment: string) {
  return Promise.all(
    (fetchMock.mock.calls as [string, RequestInit][])
      .filter(([url]) => url.includes(urlFragment))
      .map(([, init]) => JSON.parse(init.body as string))
  );
}

// ── Seedream mock ──────────────────────────────────────────────
function setupSeedreamMock() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: [{ url: MOCK_IMAGE_URL }] }),
  });
}

// ── Wanx mock ─────────────────────────────────────────────────
function setupWanxMock() {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes("getPolicy"))
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_POLICY) });
    if (url === "https://oss.example.com")
      return Promise.resolve({ ok: true });
    if (url.includes("image-synthesis"))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ output: { task_id: "t1" } }) });
    if (url.includes("tasks/"))
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ output: { task_status: "SUCCEEDED", results: [{ url: MOCK_IMAGE_URL }] } }),
      });
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

// ═══════════════════════════════════════════════════════════════

describe("API 参数校验 — Seedream 4.5", () => {
  beforeEach(() => {
    setupSeedreamMock();
    process.env.VOLC_API_KEY = "test-volc-key";
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(Object.entries(STYLE_PRESETS))(
    "风格「%s」传递正确的 prompt (%s)",
    async (_, stylePrompt) => {
      const req = makeRequest({ imageData: IMAGE_DATA, prompt: stylePrompt, model: "seedream" });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const [body] = await capturedBodies(global.fetch as jest.Mock, "generations");
      expect(body.prompt).toBe(`${PREFIX}${stylePrompt}`);
      expect(body.model).toBe(SEEDREAM_MODEL_IDS.seedream);
    }
  );

  it("prompt 为空时只发送前缀", async () => {
    const req = makeRequest({ imageData: IMAGE_DATA, prompt: "", model: "seedream" });
    await POST(req);

    const [body] = await capturedBodies(global.fetch as jest.Mock, "generations");
    expect(body.prompt).toBe(PREFIX);
  });

  it("自定义 prompt 带前缀传递", async () => {
    const req = makeRequest({ imageData: IMAGE_DATA, prompt: "a dog on the moon", model: "seedream" });
    await POST(req);

    const [body] = await capturedBodies(global.fetch as jest.Mock, "generations");
    expect(body.prompt).toBe(`${PREFIX}a dog on the moon`);
  });

  it("imageData 被放入 image 字段", async () => {
    const req = makeRequest({ imageData: IMAGE_DATA, prompt: "test", model: "seedream" });
    await POST(req);

    const [body] = await capturedBodies(global.fetch as jest.Mock, "generations");
    expect(body.image).toContain(IMAGE_DATA);
  });
});

describe("API 参数校验 — Seedream 5 Lite", () => {
  beforeEach(() => {
    setupSeedreamMock();
    process.env.VOLC_API_KEY = "test-volc-key";
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(Object.entries(STYLE_PRESETS))(
    "风格「%s」使用正确的 model ID 和 prompt (%s)",
    async (_, stylePrompt) => {
      const req = makeRequest({ imageData: IMAGE_DATA, prompt: stylePrompt, model: "seedream5lite" });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const [body] = await capturedBodies(global.fetch as jest.Mock, "generations");
      expect(body.model).toBe(SEEDREAM_MODEL_IDS.seedream5lite);
      expect(body.prompt).toBe(`${PREFIX}${stylePrompt}`);
    }
  );

  it("prompt 为空时只发送前缀", async () => {
    const req = makeRequest({ imageData: IMAGE_DATA, prompt: "", model: "seedream5lite" });
    await POST(req);

    const [body] = await capturedBodies(global.fetch as jest.Mock, "generations");
    expect(body.prompt).toBe(PREFIX);
    expect(body.model).toBe(SEEDREAM_MODEL_IDS.seedream5lite);
  });
});

describe("API 参数校验 — 万相 (Wanx)", () => {
  beforeEach(() => {
    setupWanxMock();
    process.env.DASHSCOPE_API_KEY = "test-dashscope-key";
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(Object.entries(STYLE_PRESETS))(
    "风格「%s」传递正确的 prompt 给 Wanx (%s)",
    async (_, stylePrompt) => {
      const req = makeRequest({ imageData: IMAGE_DATA, prompt: stylePrompt, model: "wanx" });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const [body] = await capturedBodies(global.fetch as jest.Mock, "image-synthesis");
      expect(body.input.prompt).toBe(`${PREFIX}${stylePrompt}`);
      expect(body.model).toBe("wanx-sketch-to-image-lite");
    }
  );

  it("prompt 为空时返回 400", async () => {
    const req = makeRequest({ imageData: IMAGE_DATA, prompt: "", model: "wanx" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("请填写描述");
  });

  it("自定义 prompt 带前缀传递给 Wanx", async () => {
    const req = makeRequest({ imageData: IMAGE_DATA, prompt: "山水画风格", model: "wanx" });
    await POST(req);

    const [body] = await capturedBodies(global.fetch as jest.Mock, "image-synthesis");
    expect(body.input.prompt).toBe(`${PREFIX}山水画风格`);
  });
});

describe("API 参数校验 — 模型路由", () => {
  afterEach(() => jest.restoreAllMocks());

  it("model=seedream → 调用 Volcano Engine，不调用 DashScope", async () => {
    setupSeedreamMock();
    process.env.VOLC_API_KEY = "test-volc-key";

    const req = makeRequest({ imageData: IMAGE_DATA, prompt: "test", model: "seedream" });
    await POST(req);

    const calls = (global.fetch as jest.Mock).mock.calls.map(([url]: [string]) => url);
    expect(calls.some((u: string) => u.includes("volces.com"))).toBe(true);
    expect(calls.some((u: string) => u.includes("dashscope"))).toBe(false);
  });

  it("model=wanx → 调用 DashScope，不调用 Volcano Engine", async () => {
    setupWanxMock();
    process.env.DASHSCOPE_API_KEY = "test-dashscope-key";

    const req = makeRequest({ imageData: IMAGE_DATA, prompt: "test", model: "wanx" });
    await POST(req);

    const calls = (global.fetch as jest.Mock).mock.calls.map(([url]: [string]) => url);
    expect(calls.some((u: string) => u.includes("dashscope"))).toBe(true);
    expect(calls.some((u: string) => u.includes("volces.com"))).toBe(false);
  });

  it("model 缺省时默认走 wanx（需要 prompt）", async () => {
    setupWanxMock();
    process.env.DASHSCOPE_API_KEY = "test-dashscope-key";

    const req = makeRequest({ imageData: IMAGE_DATA, prompt: "test" }); // 无 model 字段
    await POST(req);

    const calls = (global.fetch as jest.Mock).mock.calls.map(([url]: [string]) => url);
    expect(calls.some((u: string) => u.includes("dashscope"))).toBe(true);
  });
});
