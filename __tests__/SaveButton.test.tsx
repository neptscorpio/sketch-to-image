/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SaveButton from "@/components/SaveButton";

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    blob: () => Promise.resolve(new Blob(["img"], { type: "image/jpeg" })),
  } as unknown as Response);

  // Prevent actual navigation on anchor click
  HTMLAnchorElement.prototype.click = jest.fn();

  Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("SaveButton", () => {
  it("renders save button and checkbox", () => {
    render(<SaveButton imageUrl="https://example.com/img.jpg" sketchData={null} prompt="a cat" />);
    expect(screen.getByRole("button", { name: /保存图片/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText("同时保存草图")).toBeInTheDocument();
  });

  it("checkbox is unchecked by default", () => {
    render(<SaveButton imageUrl="https://example.com/img.jpg" sketchData={null} prompt="a cat" />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("checkbox can be toggled", async () => {
    const user = userEvent.setup();
    render(<SaveButton imageUrl="https://example.com/img.jpg" sketchData={null} prompt="a cat" />);
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("calls fetch with imageUrl when save is clicked", async () => {
    const user = userEvent.setup();
    render(<SaveButton imageUrl="https://example.com/img.jpg" sketchData={null} prompt="a cat" />);
    await user.click(screen.getByRole("button", { name: /保存图片/ }));
    expect(global.fetch).toHaveBeenCalledWith("https://example.com/img.jpg");
  });

  it("also fetches sketchData when checkbox is checked", async () => {
    const user = userEvent.setup();
    render(
      <SaveButton
        imageUrl="https://example.com/img.jpg"
        sketchData="data:image/jpeg;base64,abc"
        prompt="a cat"
      />
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /保存图片/ }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith("data:image/jpeg;base64,abc");
  });

  it("does not fetch sketchData when checkbox is unchecked", async () => {
    const user = userEvent.setup();
    render(
      <SaveButton
        imageUrl="https://example.com/img.jpg"
        sketchData="data:image/jpeg;base64,abc"
        prompt="a cat"
      />
    );
    await user.click(screen.getByRole("button", { name: /保存图片/ }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalledWith("data:image/jpeg;base64,abc");
  });
});
