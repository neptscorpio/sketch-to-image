import { render, screen } from "@testing-library/react";
import ResultPanel from "@/components/ResultPanel";

const baseProps = {
  isLoading: false,
  error: null,
  image: null,
  sketchData: null,
  prompt: "",
};

describe("ResultPanel", () => {
  it("shows loading spinner when isLoading is true", () => {
    render(<ResultPanel {...baseProps} isLoading={true} />);
    expect(screen.getByText(/AI 正在创作中/)).toBeInTheDocument();
  });

  it("shows error message when error is provided", () => {
    render(<ResultPanel {...baseProps} error="生成失败：网络错误" />);
    expect(screen.getByText("生成失败：网络错误")).toBeInTheDocument();
  });

  it("shows placeholder when no image and no error", () => {
    render(<ResultPanel {...baseProps} />);
    expect(screen.getByText("结果将在此显示")).toBeInTheDocument();
  });

  it("renders generated image when image url is provided", () => {
    render(<ResultPanel {...baseProps} image="https://example.com/image.jpg" prompt="a cat" />);
    const img = screen.getByRole("img", { name: "Generated" });
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
  });

  it("shows save button when image is available", () => {
    render(<ResultPanel {...baseProps} image="https://example.com/image.jpg" prompt="a cat" />);
    expect(screen.getByRole("button", { name: /保存图片/ })).toBeInTheDocument();
  });

  it("does not show image when loading even if image is set", () => {
    render(<ResultPanel {...baseProps} isLoading={true} image="https://example.com/image.jpg" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("error takes priority over image display when not loading", () => {
    render(<ResultPanel {...baseProps} error="something went wrong" image="https://example.com/image.jpg" />);
    expect(screen.getByText("something went wrong")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
