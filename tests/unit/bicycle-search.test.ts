import { describe, expect, it } from "vitest";
import { searchBicycleCatalog, normalizeBicycleSearchText } from "@/lib/search/bicycle-search";

describe("bicycle catalog search", () => {
  it("normalizes punctuation, accents, case, and e-bike spelling", () => {
    expect(normalizeBicycleSearchText("  E-bike: won't assist! ")).toBe("ebike wont assist");
    expect(normalizeBicycleSearchText("Crème BRÛLÉE")).toBe("creme brulee");
  });

  it("finds a symptom through its everyday-language alias and links to compatible parts", () => {
    const results = searchBicycleCatalog("puncture", "road");

    expect(results.symptoms.map(({ symptom }) => symptom.id)).toContain("flat-tire");
    expect(results.components.map(({ component }) => component.id)).toEqual(expect.arrayContaining(["front-wheel", "rear-wheel"]));
    expect(results.symptoms.find(({ symptom }) => symptom.id === "flat-tire")?.componentIds).toEqual(["front-wheel", "rear-wheel"]);
  });

  it("searches symptom descriptions and part names without any AI service", () => {
    const results = searchBicycleCatalog("brake scraping", "mountain");

    expect(results.symptoms.map(({ symptom }) => symptom.id)).toContain("front-brake-rubs");
    expect(results.components.map(({ component }) => component.id)).toContain("front-brake");
  });

  it("filters e-bike electrical symptoms and parts from non-electric variants", () => {
    const mountainResults = searchBicycleCatalog("motor wont assist", "mountain");
    const ebikeResults = searchBicycleCatalog("motor wont assist", "ebike");

    expect(mountainResults.symptoms).toHaveLength(0);
    expect(mountainResults.components.map(({ component }) => component.id)).not.toContain("motor");
    expect(ebikeResults.symptoms.map(({ symptom }) => symptom.id)).toContain("ebike-assist-unavailable");
    expect(ebikeResults.components.map(({ component }) => component.id)).toContain("motor");
  });

  it("keeps symptom matches explicit and does not invent results for unknown queries", () => {
    expect(searchBicycleCatalog("quantum flux capacitor", "hybrid")).toEqual({ components: [], symptoms: [] });
  });

  it("returns only parts valid for the selected bicycle type when the query is empty", () => {
    const mountain = searchBicycleCatalog("", "mountain");
    const road = searchBicycleCatalog("", "road");

    expect(mountain.components.map(({ component }) => component.id)).toContain("rear-suspension");
    expect(road.components.map(({ component }) => component.id)).not.toContain("rear-suspension");
    expect(road.components.every(({ component }) => component.kind === "part")).toBe(true);
    expect(mountain.symptoms).toEqual([]);
  });
});
