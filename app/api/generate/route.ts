import { NextRequest, NextResponse } from "next/server";

const API_KEY    = process.env.DASHSCOPE_API_KEY!;
const SUBMIT_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis/";
const TASK_URL   = "https://dashscope.aliyuncs.com/api/v1/tasks";

async function uploadToOSS(base64: string): Promise<string> {
  const policyRes = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model=wanx-sketch-to-image-lite",
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );
  const policyData = await policyRes.json();
  if (!policyRes.ok) throw new Error(`获取凭证失败: ${JSON.stringify(policyData)}`);

  const { oss_access_key_id, policy, signature, upload_dir, upload_host,
          x_oss_object_acl, x_oss_forbid_overwrite } = policyData.data;

  const raw      = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer   = Buffer.from(raw, "base64");
  const filename = `sketch_${Date.now()}.jpg`;
  const dir      = upload_dir.endsWith("/") ? upload_dir : `${upload_dir}/`;
  const key      = `${dir}${filename}`;

  const form = new FormData();
  form.append("OSSAccessKeyId",         oss_access_key_id);
  form.append("policy",                 policy);
  form.append("Signature",              signature);
  form.append("key",                    key);
  form.append("x-oss-object-acl",       x_oss_object_acl);
  form.append("x-oss-forbid-overwrite", x_oss_forbid_overwrite);
  form.append("success_action_status",  "200");
  form.append("file", new Blob([buffer], { type: "image/jpeg" }), filename);

  const uploadRes = await fetch(upload_host, { method: "POST", body: form });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`OSS 上传失败: ${uploadRes.status} - ${text}`);
  }

  return `oss://${key}`;
}

async function submitTask(sketchUrl: string, prompt: string): Promise<string> {
  const res = await fetch(SUBMIT_URL, {
    method: "POST",
    headers: {
      Authorization:                    `Bearer ${API_KEY}`,
      "Content-Type":                   "application/json",
      "X-DashScope-Async":              "enable",
      "X-DashScope-OssResourceResolve": "enable",
    },
    body: JSON.stringify({
      model:      "wanx-sketch-to-image-lite",
      input:      { sketch_image_url: sketchUrl, prompt },
      parameters: { size: "768*768", n: 1, sketch_weight: 10 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`提交失败: ${data.message ?? JSON.stringify(data)}`);
  return data.output.task_id as string;
}

async function pollTask(taskId: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res  = await fetch(`${TASK_URL}/${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const data = await res.json();
    const status = data.output?.task_status;
    if (status === "SUCCEEDED") return data.output.results[0].url as string;
    if (status === "FAILED")    throw new Error(`生成失败: ${data.output?.message ?? "unknown"}`);
  }
  throw new Error("生成超时，请重试");
}

export async function POST(req: NextRequest) {
  try {
    const { imageData, prompt } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: "请填写描述" }, { status: 400 });
    const sketchUrl = await uploadToOSS(imageData);
    const taskId    = await submitTask(sketchUrl, prompt);
    const imageUrl  = await pollTask(taskId);
    return NextResponse.json({ image: imageUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
