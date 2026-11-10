import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../../src/app/page";
import { SiteHeader } from "../../src/components/layout/site-header";

function renderHome() {
  return render(
    <>
      <SiteHeader />
      <HomePage />
    </>,
  );
}

describe("BikeFix foundation homepage", () => {
  it("presents a clear product headline and primary navigation", () => {
    renderHome();

    expect(screen.getByRole("heading", { level: 1, name: /less guessing\.? more riding\.?/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /primary navigation/i })).toBeInTheDocument();
  });

  it("introduces all five bicycle types with their matching explorer-grade SVG profiles", () => {
    const { container } = renderHome();
    const section = screen.getByRole("region", { name: /five kinds of bikes/i });

    for (const type of ["Road bike", "Mountain bike", "Hybrid / commuter", "Gravel bike", "E-bike"]) {
      expect(within(section).getByRole("heading", { name: type })).toBeInTheDocument();
    }

    const profileDrawings = section.querySelectorAll(".bike-type-card svg.bicycle-profile-illustration");
    expect(Array.from(profileDrawings).map((svg) => svg.getAttribute("data-bike-type"))).toEqual([
      "road", "mountain", "hybrid", "gravel", "ebike",
    ]);
    expect(section.querySelector(".bike-type-card .bike-hit-layer")).not.toBeInTheDocument();
    expect(container.querySelector(".hero-bike-svg[data-bike-type=\"mountain\"]")).toBeInTheDocument();
    expect(container.querySelector(".request-bike-art[data-bike-type=\"mountain\"]")).toBeInTheDocument();

    const gradientIds = Array.from(container.querySelectorAll(".bicycle-profile-illustration defs linearGradient"))
      .map((gradient) => gradient.getAttribute("id"));
    expect(new Set(gradientIds).size).toBe(gradientIds.length);
  });

  it("provides an obvious path to the request-a-guide workflow", () => {
    renderHome();

    expect(screen.getByRole("link", { name: /suggest a repair guide/i })).toHaveAttribute("href", "/request-repair-guide");
  });

  it("explains the safety-first intent", () => {
    renderHome();

    expect(screen.getByRole("heading", { name: /helpful guidance/i })).toBeInTheDocument();
  });
});
