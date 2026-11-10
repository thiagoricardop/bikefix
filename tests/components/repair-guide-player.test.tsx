import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GUIDE_PLAYER_FIXTURES } from "@/data/guides/guide-player-fixtures";
import { RepairGuidePlayer } from "@/components/repair-guide/repair-guide-player";

const brakeGuide = GUIDE_PLAYER_FIXTURES[0];
const flatGuide = GUIDE_PLAYER_FIXTURES[1];

describe("repair guide player", () => {
  it("labels a fixture as a draft and shows applicability, warnings, stop conditions, and sources status", () => {
    render(<RepairGuidePlayer guide={brakeGuide} sources={[]} />);

    expect(screen.getByRole("heading", { name: brakeGuide.title })).toBeInTheDocument();
    expect(screen.getByText(/Draft · not verified repair advice/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bicycle types" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Read these safety notes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stop and get help if" })).toBeInTheDocument();
    expect(screen.getByText(/No technical source references are attached/i)).toBeInTheDocument();
  });

  it("does not present a published flag as verified when review evidence is missing", () => {
    const unsubstantiated = { ...brakeGuide, reviewStatus: "published" as const };
    render(<RepairGuidePlayer guide={unsubstantiated} sources={[]} />);

    expect(screen.getByText(/Publication record incomplete · not verified/i)).toBeInTheDocument();
    expect(screen.getByText(/required review evidence or media-rights details are missing/i)).toBeInTheDocument();
  });

  it("navigates steps, preserves checkpoints when going back, and completes final checks without claiming safety", () => {
    render(<RepairGuidePlayer guide={brakeGuide} sources={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Start guide/ }));

    expect(screen.getByRole("heading", { name: "Make the area safe to inspect" })).toBeInTheDocument();
    const firstCheckpoint = screen.getByRole("checkbox", { name: /Checkpoint.*The bicycle is stationary and stable/i });
    fireEvent.click(firstCheckpoint);
    fireEvent.click(screen.getByRole("button", { name: /Next step/ }));
    expect(screen.getByRole("heading", { name: "Look for visible contact or damage" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Previous step/ }));
    expect(screen.getByRole("checkbox", { name: /Checkpoint.*The bicycle is stationary and stable/i })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: /Next step/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next step/ }));
    expect(screen.getByRole("heading", { name: "Identify the installed brake design" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Final checks: 0 of 3 complete" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Review final checks/ }));
    expect(screen.getByRole("heading", { name: "Review the final checks" })).toBeInTheDocument();
    expect(screen.getByText(/does not guarantee safety/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /I recorded the brake type/i }));
    fireEvent.click(screen.getByRole("button", { name: /Finish reading/ }));
    expect(screen.getByRole("heading", { name: "You reached the end" })).toBeInTheDocument();
    expect(screen.getByText(/You checked 1 of 3 final reminders/)).toBeInTheDocument();
    expect(screen.getByText(/does not certify the bicycle as safe/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Review final checks/ }));
    expect(screen.getByRole("checkbox", { name: /I recorded the brake type/i })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /Previous step/ }));
    expect(screen.getByRole("listitem", { name: "Final checks: 1 of 3 complete" })).toBeInTheDocument();
  });

  it("shows a readable image fallback while keeping the written instruction on screen", () => {
    render(<RepairGuidePlayer guide={brakeGuide} sources={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Start guide/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next step/ }));

    expect(screen.getByRole("status")).toHaveTextContent(/Loading media/i);
    const image = screen.getByRole("img", { name: /Optional brake inspection reference photo/i });
    fireEvent.error(image);

    expect(screen.getByRole("status")).toHaveTextContent(/Media unavailable/);
    expect(screen.getByText(/The written instructions remain available/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Look for visible contact or damage" })).toBeInTheDocument();
    expect(screen.getByText(/Media not provided/i)).toBeInTheDocument();
  });

  it("supports video error, caption failure, and an available text alternative", () => {
    const { container } = render(<RepairGuidePlayer guide={flatGuide} sources={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Start guide/ }));

    const video = screen.getByLabelText(/Optional flat-tire inspection video/i);
    expect(screen.getByRole("status")).toHaveTextContent(/Loading video/i);
    fireEvent.loadedMetadata(video);
    expect(screen.queryByText(/Loading video/i)).not.toBeInTheDocument();
    const track = container.querySelector("track");
    expect(track).not.toBeNull();
    fireEvent.error(track!);
    expect(screen.getByText(/Captions could not be loaded/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Read media transcript / text alternative"));
    expect(screen.getByText(/No verified transcript is available/i)).toBeInTheDocument();

    fireEvent.error(video);
    expect(screen.getByRole("status")).toHaveTextContent(/Media unavailable/i);
    expect(screen.getByText(/The written instructions remain available/i)).toBeInTheDocument();
  });

  it("allows the user to restart and clears checkpoint/final-check state", () => {
    render(<RepairGuidePlayer guide={brakeGuide} sources={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Start guide/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Checkpoint.*The bicycle is stationary and stable/i }));
    fireEvent.click(screen.getByRole("button", { name: /Restart from the beginning/ }));

    expect(screen.getByRole("heading", { name: "Guide overview" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue guide|Start guide/ }));
    expect(screen.getByRole("checkbox", { name: /Checkpoint.*The bicycle is stationary and stable/i })).not.toBeChecked();
  });
});
