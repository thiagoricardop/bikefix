import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepairGuideRequestForm } from "@/components/request-form/repair-guide-request-form";

const components = [{ id: "chain", name: "Chain" }, { id: "front-brake", name: "Front brake" }];
const recordedResponse = {
  ok: true,
  requestId: "d9428888-122b-4f04-9d32-0a40e6b77223",
  status: "recorded",
  notificationStatus: "accepted",
  message: "Your request has been saved. The email provider accepted the developer notification; this does not confirm delivery.",
};

afterEach(() => vi.unstubAllGlobals());

describe("repair-guide request form", () => {
  it("offers all six bicycle selections and requires an email only when a reply is requested", () => {
    render(<RepairGuideRequestForm enabled components={components} />);
    expect(screen.getByRole("combobox", { name: /bicycle type/i }).querySelectorAll("option")).toHaveLength(6);
    expect(screen.queryByRole("textbox", { name: /^email address/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /i'd like a reply/i }));
    expect(screen.getByRole("textbox", { name: /^email address/i })).toBeRequired();
  });

  it("shows the private reference after a recorded request and does not claim confirmed email delivery", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(recordedResponse), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<RepairGuideRequestForm enabled components={components} />);
    fireEvent.change(screen.getByRole("textbox", { name: /what guide would help/i }), { target: { value: "Help identify a worn chain" } });
    fireEvent.change(screen.getByRole("textbox", { name: /describe the problem/i }), { target: { value: "I need a beginner guide to know what chain wear looks like and what to inspect." } });
    fireEvent.change(screen.getByRole("combobox", { name: /bicycle type/i }), { target: { value: "road" } });
    fireEvent.submit(screen.getByRole("button", { name: /send guide request/i }).closest("form")!);
    expect(await screen.findByRole("heading", { name: /thanks for helping shape bikefix/i })).toBeInTheDocument();
    expect(screen.getByText(recordedResponse.requestId)).toBeInTheDocument();
    expect(screen.getByText(/accepted.*does not confirm delivery/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("tells the user the request was saved when notification failed", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ...recordedResponse, notificationStatus: "failed", message: "Your request has been saved, but the developer notification could not be queued." }), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<RepairGuideRequestForm enabled components={components} />);
    fireEvent.change(screen.getByRole("textbox", { name: /what guide would help/i }), { target: { value: "Help identify a worn chain" } });
    fireEvent.change(screen.getByRole("textbox", { name: /describe the problem/i }), { target: { value: "I need a beginner guide to know what chain wear looks like and what to inspect." } });
    fireEvent.submit(screen.getByRole("button", { name: /send guide request/i }).closest("form")!);
    expect(await screen.findByText(/notification could not be queued/i)).toBeInTheDocument();
    expect(screen.getByText(recordedResponse.requestId)).toBeInTheDocument();
  });

  it("does not submit when deployment configuration has disabled the workflow", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<RepairGuideRequestForm enabled={false} disabledMessage="Retention policy has not been approved." components={components} />);
    expect(screen.getByRole("status")).toHaveTextContent(/submissions are not enabled/i);
    expect(screen.getByRole("button", { name: /send guide request/i })).toBeDisabled();
    expect(screen.getByLabelText(/what guide would help/i)).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the same idempotency key for a connection retry", async () => {
    const firstBodies: string[] = [];
    const firstFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      firstBodies.push(String(init?.body ?? ""));
      throw new Error("connection lost");
    });
    vi.stubGlobal("fetch", firstFetch);
    render(<RepairGuideRequestForm enabled components={components} />);
    fireEvent.change(screen.getByRole("textbox", { name: /what guide would help/i }), { target: { value: "Help identify a worn chain" } });
    fireEvent.change(screen.getByRole("textbox", { name: /describe the problem/i }), { target: { value: "I need a beginner guide to know what chain wear looks like and what to inspect." } });
    const form = screen.getByRole("button", { name: /send guide request/i }).closest("form")!;
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/connection was interrupted/i));
    const firstBody = JSON.parse(firstBodies[0]);
    const secondBodies: string[] = [];
    const secondFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      secondBodies.push(String(init?.body ?? ""));
      return new Response(JSON.stringify(recordedResponse), { status: 201, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", secondFetch);
    fireEvent.submit(form);
    await screen.findByRole("heading", { name: /thanks for helping shape bikefix/i });
    const secondBody = JSON.parse(secondBodies[0]);
    expect(secondBody.idempotencyKey).toBe(firstBody.idempotencyKey);
  });
});
