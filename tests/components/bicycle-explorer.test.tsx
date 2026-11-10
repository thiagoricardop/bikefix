import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BicycleExplorer } from "../../src/components/bicycle-explorer/bicycle-explorer";
import { BIKE_PROFILES } from "../../src/components/bicycle-explorer/bicycle-svg/profiles";
import { InteractiveBicycleSvg } from "../../src/components/bicycle-explorer/interactive-bicycle-svg";
import { BICYCLE_TYPES } from "../../src/data/bicycle-types/catalog";
import { COMPONENT_BY_ID } from "../../src/data/components/catalog";

describe("interactive bicycle explorer", () => {
  it("starts with the mountain bicycle and a synchronized selected part", () => {
    const { container } = render(<BicycleExplorer />);

    expect(screen.getByRole("button", { name: "Choose Mountain bike" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Front brake" })).toBeInTheDocument();
    expect(container.querySelector("#mountain-front-brake")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/no reviewed guide yet/i)).toBeInTheDocument();
  });

  it("synchronizes SVG and text selection", () => {
    const { container } = render(<BicycleExplorer />);
    const partOption = screen.getByRole("button", { name: "Select Rear wheel" });

    fireEvent.click(partOption);

    expect(screen.getByRole("heading", { name: "Rear wheel" })).toBeInTheDocument();
    expect(partOption).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector("#mountain-rear-wheel")).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector("#mountain-front-brake")).toHaveAttribute("aria-pressed", "false");
  });

  it("uses a distinct geometry profile and defining features for each bicycle type", () => {
    const { container } = render(<BicycleExplorer />);
    const expected = {
      mountain: "full-suspension-trail",
      road: "endurance-road",
      hybrid: "upright-commuter",
      gravel: "flared-drop-gravel",
      ebike: "mid-drive-trekking",
    } as const;
    for (const type of BICYCLE_TYPES) {
      fireEvent.click(screen.getByRole("button", { name: `Choose ${type.name}` }));
      expect(container.querySelector(`svg[data-bike-type="${type.id}"]`)).toHaveAttribute("data-geometry-profile", expected[type.id]);
      expect(container.querySelector(`#${type.id}-front-wheel`)).toBeInTheDocument();
      expect(container.querySelector(`#${type.id}-rear-wheel`)).toBeInTheDocument();
      expect(container.querySelector(`#${type.id}-fork`)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Choose Mountain bike" }));
    expect(container.querySelector("#mountain-rear-suspension")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose E-bike" }));
    expect(container.querySelector("#ebike-battery")).toBeInTheDocument();
    expect(container.querySelector("#ebike-motor")).toBeInTheDocument();
  });
  it("supports keyboard activation on SVG regions", () => {
    const { container } = render(<BicycleExplorer />);
    const frame = container.querySelector("#mountain-frame");
    const rearWheel = container.querySelector("#mountain-rear-wheel");
    expect(frame).not.toBeNull();
    expect(rearWheel).not.toBeNull();

    fireEvent.keyDown(frame!, { key: "Enter" });
    expect(screen.getByRole("heading", { name: "Frame" })).toBeInTheDocument();

    fireEvent.keyDown(rearWheel!, { key: " " });
    expect(screen.getByRole("heading", { name: "Rear wheel" })).toBeInTheDocument();
  });

  it("switches bicycle type and resets a part that is not available", () => {
    const { container } = render(<BicycleExplorer />);
    const suspension = within(screen.getByRole("region", { name: "Suspension" })).getByRole("button", { name: "Select Rear suspension" });

    fireEvent.click(suspension);
    expect(screen.getByRole("heading", { name: "Rear suspension" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Choose Road bike" }));

    expect(screen.getByRole("button", { name: "Choose Road bike" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Front brake" })).toBeInTheDocument();
    expect(container.querySelector("#road-rear-suspension")).not.toBeInTheDocument();
    expect(container.querySelector("#road-front-brake")).toHaveAttribute("aria-pressed", "true");
  });

  it("preserves a compatible selected part when switching bicycle type", () => {
    render(<BicycleExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Select Rear wheel" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Road bike" }));

    expect(screen.getByRole("heading", { name: "Rear wheel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Rear wheel" })).toHaveAttribute("aria-pressed", "true");
  });

  it("filters the accessible parts browser by component or symptom text", () => {
    render(<BicycleExplorer />);
    const search = screen.getByRole("searchbox", { name: "Search parts or symptoms" });

    fireEvent.change(search, { target: { value: "skip" } });

    expect(screen.getByRole("button", { name: "Select Rear derailleur" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select Saddle" })).not.toBeInTheDocument();
  });

  it("discovers structured symptoms through their aliases and opens a symptom reference", () => {
    render(<BicycleExplorer />);
    const search = screen.getByRole("searchbox", { name: "Search parts or symptoms" });

    fireEvent.change(search, { target: { value: "puncture" } });

    const symptomResult = screen.getByRole("button", { name: "Explore symptom Flat tire" });
    expect(symptomResult).toBeInTheDocument();
    fireEvent.click(symptomResult);

    expect(screen.getByRole("heading", { name: "Flat tire" })).toBeInTheDocument();
    expect(screen.getByText(/symptom reference · not a diagnosis/i)).toBeInTheDocument();
    expect(screen.getByText(/do not ride on a flat tire/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Front wheel" })).toBeInTheDocument();
  });

  it("shows electrical symptom discovery only for the e-bike variant", () => {
    const { container } = render(<BicycleExplorer />);
    const search = screen.getByRole("searchbox", { name: "Search parts or symptoms" });
    fireEvent.change(search, { target: { value: "motor won't assist" } });

    expect(screen.queryByRole("button", { name: "Explore symptom E-bike assist is unavailable" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Choose E-bike" }));

    expect(screen.getByRole("button", { name: "Explore symptom E-bike assist is unavailable" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Explore symptom E-bike assist is unavailable" }));
    expect(screen.getByRole("heading", { name: "Battery" })).toBeInTheDocument();
    expect(container.querySelector(".symptom-reference-safety")).toHaveTextContent(/do not open a battery pack/i);
  });

  it("shows a useful empty state when no part or symptom matches", () => {
    render(<BicycleExplorer />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search parts or symptoms" }), { target: { value: "quantum flux capacitor" } });

    expect(screen.getByText("No matching part found")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Matching symptoms" })).not.toBeInTheDocument();
  });

  it("filters the component browser by category and resets a variant-specific category on type change", () => {
    render(<BicycleExplorer />);
    fireEvent.click(screen.getByRole("button", { name: /^Suspension$/ }));

    expect(screen.getByRole("button", { name: "Select Rear suspension" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select Front brake" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Choose Road bike" }));

    expect(screen.getByRole("button", { name: "All categories" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /^Suspension$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Front brake" })).toBeInTheDocument();
  });

  it("renders every declared SVG region mapping for its bicycle type", () => {
    const { container } = render(<BicycleExplorer />);

    for (const type of BICYCLE_TYPES) {
      fireEvent.click(screen.getByRole("button", { name: `Choose ${type.name}` }));
      for (const mapping of type.svgRegionMappings) {
        expect(container.querySelector(`#${mapping.regionId}`), `${type.id}: ${mapping.regionId}`).toBeInTheDocument();
      }
    }
  });

  it("offers an unsure fallback using a clearly labeled example illustration", () => {
    render(<BicycleExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Choose E-bike" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Battery" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose I'm not sure" }));

    expect(screen.getByRole("button", { name: "Choose I'm not sure" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Mountain bike example" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Front brake" })).toBeInTheDocument();
  });

  it("exposes e-bike battery and motor parts only for the e-bike illustration", () => {
    const { container } = render(<BicycleExplorer />);

    fireEvent.click(screen.getByRole("button", { name: "Choose E-bike" }));

    expect(container.querySelector("#ebike-battery")).toBeInTheDocument();
    expect(container.querySelector("#ebike-motor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Battery" })).toBeInTheDocument();
  });

  it("renders every defining geometry feature of each bicycle type", () => {
    const { container } = render(<BicycleExplorer />);

    for (const type of BICYCLE_TYPES) {
      fireEvent.click(screen.getByRole("button", { name: `Choose ${type.name}` }));
      const svg = container.querySelector(`svg[data-bike-type="${type.id}"]`)!;
      for (const feature of BIKE_PROFILES[type.id].features) {
        expect(svg.querySelector(`[data-feature="${feature}"]`), `${type.id}: ${feature}`).not.toBeNull();
      }
    }
  });

  it("does not draw another type's defining equipment", () => {
    const { container } = render(<BicycleExplorer />);
    const has = (feature: string) => container.querySelector(`[data-feature="${feature}"]`) !== null;

    fireEvent.click(screen.getByRole("button", { name: "Choose Road bike" }));
    expect(has("drop-bar")).toBe(true);
    expect(["suspension-fork", "rear-shock", "flat-bar", "battery-pack", "knobby-tread", "fender", "flared-drop-bar"].filter(has)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Choose Gravel bike" }));
    expect(["suspension-fork", "rear-shock", "flat-bar", "battery-pack", "double-chainring", "rim-caliper"].filter(has)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Choose Hybrid / commuter" }));
    expect(["drop-bar", "flared-drop-bar", "rear-shock", "suspension-fork", "battery-pack", "mid-drive-motor"].filter(has)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Choose E-bike" }));
    expect(["drop-bar", "rear-shock", "rocker-link", "knobby-tread"].filter(has)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Choose Mountain bike" }));
    expect(["drop-bar", "fender", "rear-rack", "battery-pack", "rim-caliper"].filter(has)).toEqual([]);
  });

  it("selects every SVG part of every type with Enter or Space and syncs the list, halo and marker", () => {
    const { container } = render(<BicycleExplorer />);

    for (const type of BICYCLE_TYPES) {
      fireEvent.click(container.querySelector(`button[aria-label="Choose ${type.name}"]`)!);
      BIKE_PROFILES[type.id].parts.forEach((part, index) => {
        const region = container.querySelector<SVGGElement>(`#${type.id}-${part.id}`)!;
        const name = COMPONENT_BY_ID[part.id].name;
        expect(region).toHaveAttribute("role", "button");
        expect(region).toHaveAttribute("tabindex", "0");
        expect(region).toHaveAttribute("aria-label", name);
        expect(region.querySelector("title")).toHaveTextContent(name);

        fireEvent.keyDown(region, { key: index % 2 === 0 ? "Enter" : " " });

        expect(region).toHaveAttribute("aria-pressed", "true");
        expect(container.querySelector("#selected-part-title")).toHaveTextContent(name);
        expect(container.querySelector(`button[aria-label="Select ${name}"]`)).toHaveAttribute("aria-pressed", "true");
        expect(container.querySelector('[data-testid="selected-part-halo"]')).toHaveAttribute("data-halo-for", part.id);
        expect(container.querySelector('[data-testid="selected-part-marker"]')).toHaveAttribute("data-marker-for", part.id);
        expect(container.querySelectorAll('.bike-part[aria-pressed="true"]')).toHaveLength(1);
      });
    }
  });

  it("moves the SVG highlight when a part is chosen from the text list", () => {
    const { container } = render(<BicycleExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Choose E-bike" }));

    fireEvent.click(screen.getByRole("button", { name: "Select Motor / drive unit" }));

    expect(container.querySelector("#ebike-motor")).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector('[data-testid="selected-part-marker"]')).toHaveAttribute("data-marker-for", "motor");
    const marker = container.querySelector('[data-testid="selected-part-marker"] circle')!;
    const region = container.querySelector("#ebike-motor")!;
    expect(marker.getAttribute("cx")).toBe(region.getAttribute("data-anchor-x"));
    expect(marker.getAttribute("cy")).toBe(region.getAttribute("data-anchor-y"));
  });

  it("keeps decorative artwork out of the tab order and accessibility tree", () => {
    const { container } = render(<BicycleExplorer />);

    for (const type of BICYCLE_TYPES) {
      fireEvent.click(screen.getByRole("button", { name: `Choose ${type.name}` }));
      const svg = container.querySelector(`svg[data-bike-type="${type.id}"]`)!;
      expect(svg.querySelectorAll('[tabindex="0"]')).toHaveLength(type.svgRegionMappings.length);
      expect(svg.querySelector(".bike-art")).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAccessibleName(`Interactive ${type.name} side view. Tab to focus a part and press Enter or Space to select.`);
      expect(svg).toHaveAccessibleDescription(/representative configuration/i);
    }
  });
});

describe("interactive bicycle SVG instances", () => {
  it("gives each rendered bicycle unique gradient and description IDs that its own artwork references", () => {
    const names = Object.fromEntries(Object.values(COMPONENT_BY_ID).map((c) => [c.id, c.name]));
    const { container } = render(
      <>
        <InteractiveBicycleSvg type="ebike" selectedPartId="battery" onSelectPart={() => {}} componentNames={names} />
        <InteractiveBicycleSvg type="ebike" selectedPartId="motor" onSelectPart={() => {}} componentNames={names} />
      </>,
    );
    // Region IDs are intentionally stable (`${type}-${componentId}`); generated IDs must not collide.
    const generated = [...container.querySelectorAll("defs [id], desc[id]")].map((el) => el.id);
    expect(generated.length).toBeGreaterThanOrEqual(8);
    expect(new Set(generated).size).toBe(generated.length);

    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) {
      const local = new Set([...svg.querySelectorAll("defs [id]")].map((el) => el.id));
      const refs = [...svg.querySelectorAll("*")]
        .flatMap((el) => [el.getAttribute("fill"), el.getAttribute("stroke")])
        .flatMap((value) => /^url\(#(.+)\)$/.exec(value ?? "")?.slice(1) ?? []);
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) expect(local.has(ref), ref).toBe(true);
    }
  });

  it("reports selections through the callback for pointer and keyboard input", () => {
    const names = Object.fromEntries(Object.values(COMPONENT_BY_ID).map((c) => [c.id, c.name]));
    const onSelect = vi.fn();
    const { container } = render(<InteractiveBicycleSvg type="mountain" selectedPartId="frame" onSelectPart={onSelect} componentNames={names} />);

    fireEvent.click(container.querySelector("#mountain-rear-suspension")!);
    fireEvent.keyDown(container.querySelector("#mountain-cassette")!, { key: "Enter" });
    fireEvent.keyDown(container.querySelector("#mountain-chain")!, { key: "Tab" });

    expect(onSelect.mock.calls).toEqual([["rear-suspension"], ["cassette"]]);
  });
});
