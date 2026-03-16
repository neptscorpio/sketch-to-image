/**
 * @jest-environment node
 */
import { POST } from "@/app/api/generate/route";
import { NextRequest } from "next/server";

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockPolicyData = {
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

const mockTaskId = "task-123";
const mockImageUrl = "https://cdn.example.com/result.jpg";

function setupFetchMock() {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes("getPolicy")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPolicyData) });
    }
    if (url === "https://oss.example.com") {
      return Promise.resolve({ ok: true });
    }
    if (url.includes("image-synthesis")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ output: { task_id: mockTaskId } }),
      });
    }
    if (url.includes("tasks/")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          output: { task_status: "SUCCEEDED", results: [{ url: mockImageUrl }] },
        }),
      });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    setupFetchMock();
    process.env.DASHSCOPE_API_KEY = "test-key";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 400 when prompt is missing", async () => {
    const req = makeRequest({ imageData: "data:image/jpeg;base64,abc", prompt: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("请填写描述");
  });

  it("returns 400 when prompt is whitespace only", async () => {
    const req = makeRequest({ imageData: "data:image/jpeg;base64,abc", prompt: "   " });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns generated image url on success", async () => {
    const req = makeRequest({
      imageData: "data:image/jpeg;base64,/9j/test",
      prompt: "a cat",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.image).toBe(mockImageUrl);
  });

  it("returns 500 when OSS upload fails", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("getPolicy")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPolicyData) });
      }
      if (url === "https://oss.example.com") {
        return Promise.resolve({ ok: false, status: 403, text: () => Promise.resolve("Forbidden") });
      }
      return Promise.reject(new Error("unexpected"));
    });

    const req = makeRequest({ imageData: "data:image/jpeg;base64,abc", prompt: "a cat" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("OSS 上传失败");
  });

  it("returns 500 on task poll timeout", async () => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("getPolicy")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPolicyData) });
      }
      if (url === "https://oss.example.com") {
        return Promise.resolve({ ok: true });
      }
      if (url.includes("image-synthesis")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ output: { task_id: mockTaskId } }),
        });
      }
      if (url.includes("tasks/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ output: { task_status: "PENDING" } }),
        });
      }
      return Promise.reject(new Error("unexpected"));
    });

    const req = makeRequest({ imageData: "data:image/jpeg;base64,abc", prompt: "a cat" });
    const resPromise = POST(req);

    await jest.runAllTimersAsync();
    jest.useRealTimers();

    const res = await resPromise;
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("超时");
  }, 15000);
});
