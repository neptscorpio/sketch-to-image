import { NextRequest } from "next/server";

export const MOCK_IMAGE_URL = "https://cdn.example.com/result.jpg";
export const MOCK_TASK_ID = "task-123";

export const MOCK_POLICY = {
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

export function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function capturedBodies(fetchMock: jest.Mock, urlFragment: string) {
  return (fetchMock.mock.calls as [string, RequestInit][])
    .filter(([url]) => url.includes(urlFragment))
    .map(([, init]) => JSON.parse(init.body as string));
}

export function setupSeedreamMock() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: [{ url: MOCK_IMAGE_URL }] }),
  });
}

export function setupWanxMock() {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes("getPolicy"))
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_POLICY) });
    if (url === "https://oss.example.com")
      return Promise.resolve({ ok: true });
    if (url.includes("image-synthesis"))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ output: { task_id: MOCK_TASK_ID } }) });
    if (url.includes("tasks/"))
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ output: { task_status: "SUCCEEDED", results: [{ url: MOCK_IMAGE_URL }] } }),
      });
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}
