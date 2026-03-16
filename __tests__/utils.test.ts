import { makeFilename } from "@/lib/utils";

describe("makeFilename", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-16"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("generates a filename with prefix, slug, and date", () => {
    expect(makeFilename("generated", "a cat on a chair", "jpg"))
      .toBe("generated_a-cat-on-a-chair_2026-03-16.jpg");
  });

  it("supports Chinese characters in slug", () => {
    expect(makeFilename("sketch", "一只猫坐在椅子上", "jpg"))
      .toBe("sketch_一只猫坐在椅子上_2026-03-16.jpg");
  });

  it("trims leading and trailing special characters from slug", () => {
    expect(makeFilename("generated", "  !! cat !!", "jpg"))
      .toBe("generated_cat_2026-03-16.jpg");
  });

  it("replaces consecutive special characters with a single dash", () => {
    expect(makeFilename("generated", "cat & dog | fish", "jpg"))
      .toBe("generated_cat-dog-fish_2026-03-16.jpg");
  });

  it("truncates long prompts to 30 characters", () => {
    const longPrompt = "a very long prompt that exceeds thirty characters easily";
    const result = makeFilename("generated", longPrompt, "jpg");
    const slug = result.split("_")[1];
    expect(slug.length).toBeLessThanOrEqual(30);
  });

  it("handles empty prompt", () => {
    expect(makeFilename("generated", "", "jpg")).toBe("generated__2026-03-16.jpg");
  });

  it("uses the provided extension", () => {
    expect(makeFilename("sketch", "tree", "png")).toMatch(/\.png$/);
  });
});
