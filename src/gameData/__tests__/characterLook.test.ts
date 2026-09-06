import { readFileSync } from "fs";
import { join } from "path";

import { CustomGData } from "../../GDataContext";
import { characterLookLayers, classLooks, type ClassLook } from "../characterLook";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as CustomGData;
}

describe("characterLook", () => {
  const G = loadG();

  it("parses warrior looks with heads and hair", () => {
    const looks = classLooks(G.classes.warrior);
    expect(looks.length).toBe(4);
    expect(looks[0]?.skin).toBe("marmor6d");
    expect(looks[0]?.cx.head).toBe("makeup117");
    expect(looks[0]?.cx.hair).toBe("hairdo105");
  });

  it("layers skin, body, head, and hair for a warrior", () => {
    const look = classLooks(G.classes.warrior)[0];
    expect(look).toBeDefined();
    const keys = characterLookLayers(G, look!).map((layer) => layer.key);
    expect(keys).toContain("skin");
    expect(keys).toContain("body");
    expect(keys).toContain("head");
    expect(keys).toContain("hair");
    const head = characterLookLayers(G, look!).find((layer) => layer.key === "head");
    expect(head?.skin).toBe("makeup117");
    expect(head?.bottom).toBeGreaterThan(0);
  });

  it("includes the merchant hat", () => {
    const look = classLooks(G.classes.merchant)[0];
    expect(look).toBeDefined();
    const layers = characterLookLayers(G, look!);
    const keys = layers.map((layer) => layer.key);
    expect(keys).toContain("hat");
    expect(look!.cx.hat).toBe("hat404");
    const hat = layers.find((layer) => layer.key === "hat");
    expect(hat?.bottom).toBeGreaterThanOrEqual(7);
  });

  it("layers ranger face makeup on top of the head", () => {
    const look = classLooks(G.classes.ranger)[1];
    expect(look?.cx.makeup).toBe("facemakeup02");
    const keys = characterLookLayers(G, look!).map((layer) => layer.key);
    expect(keys).toContain("makeup");
    expect(keys.indexOf("makeup")).toBeGreaterThan(keys.indexOf("head"));
  });

  it("stacks makeup above hair like PIXI zy (so a_makeup is visible)", () => {
    const look: ClassLook = {
      skin: "marmor6d",
      cx: { head: "makeup117", hair: "hairdo105", makeup: "breyes", hat: "bathat" },
    };
    const keys = characterLookLayers(G, look).map((layer) => layer.key);
    expect(keys.indexOf("makeup")).toBeGreaterThan(keys.indexOf("hair"));
    expect(keys.indexOf("makeup")).toBeGreaterThan(keys.indexOf("hat"));
  });
});
