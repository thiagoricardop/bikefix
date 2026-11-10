import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiagnosticWizard } from "@/components/diagnostic/diagnostic-wizard";

describe("DiagnosticWizard", () => {
  it("renders targeted follow-up questions and allows a previous answer to be reviewed", () => {
    render(<DiagnosticWizard initialSymptomId="front-brake-rubs" initialBicycleType="road" />);
    expect(screen.getByRole("heading", { name: "Does the front brake still stop the wheel reliably?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Yes, braking feels normal" }));
    expect(screen.getByRole("heading", { name: "Where does the rubbing appear to come from?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Near a disc rotor" }));
    expect(screen.getByRole("heading", { name: "What your answers suggest" })).toBeInTheDocument();
    expect(screen.getByText(/No reviewed guide is available for this scenario yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Review previous answer/i }));
    expect(screen.getByRole("heading", { name: "Where does the rubbing appear to come from?" })).toBeInTheDocument();
  });

  it("stops the flow when the user reports weak braking", () => {
    render(<DiagnosticWizard initialSymptomId="front-brake-rubs" initialBicycleType="road" />);
    fireEvent.click(screen.getByRole("button", { name: "No, or I am not sure" }));
    expect(screen.getByRole("heading", { name: "Stop here before riding or charging" })).toBeInTheDocument();
    expect(screen.getByText(/Stop riding/i)).toBeInTheDocument();
  });

  it("requires confirmation of e-bike type and resets answers when the symptom changes", () => {
    render(<DiagnosticWizard initialSymptomId="ebike-assist-unavailable" initialBicycleType="unsure" />);
    expect(screen.getByRole("heading", { name: "First, confirm this is an e-bike" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Which bicycle do you have?"), { target: { value: "ebike" } });
    expect(screen.getByRole("heading", { name: /Is the battery swollen/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "No, none of these signs is present" }));
    expect(screen.getByRole("heading", { name: "Does the display or controller show a warning or error code?" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("What have you noticed?"), { target: { value: "flat-tire" } });
    expect(screen.getByRole("heading", { name: "What best describes the tire right now?" })).toBeInTheDocument();
  });

  it("shows a stop-riding state immediately for visible frame damage", () => {
    render(<DiagnosticWizard initialSymptomId="visible-frame-damage" initialBicycleType="mountain" />);
    expect(screen.getByRole("heading", { name: "Stop riding and seek a qualified inspection" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Answer options" })).not.toBeInTheDocument();
  });
});
