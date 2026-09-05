import { readFileSync } from "fs";
import { join } from "path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { GDataContext, CustomGData } from "../../GDataContext";
import { buildGameDataIndexes } from "../../gameData/indexes";
import { ClassesBrowse } from "../ClassesBrowse";
import { ClassDetail } from "../ClassDetail";
import { SkillDetail } from "../SkillDetail";

function loadG(): CustomGData {
  const raw = JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8"));
  const loaded = raw as CustomGData;
  loaded.indexes = buildGameDataIndexes(loaded);
  return loaded;
}

const G = loadG();

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <GDataContext.Provider value={G}>
        <Routes>
          <Route path="/classes" element={<ClassesBrowse />} />
          <Route path="/classes/:classKey" element={<ClassDetail />} />
          <Route path="/skills/:skillKey" element={<SkillDetail />} />
        </Routes>
      </GDataContext.Provider>
    </MemoryRouter>,
  );
}

describe("Classes explorer", () => {
  it("shows class cards and a skills table", () => {
    renderAt("/classes");
    expect(screen.getByRole("heading", { name: /classes & skills/i })).toBeInTheDocument();
    expect(document.querySelector('a[href="/classes/warrior"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/skills/cleave"]')).toBeInTheDocument();
    expect(screen.getByText("Mana Burst")).toBeInTheDocument();
    expect(screen.getByText("Cleave")).toBeInTheDocument();
  });

  it("opens a class detail with skills and stats", () => {
    renderAt("/classes/warrior");
    expect(screen.getByRole("heading", { name: /warrior/i })).toBeInTheDocument();
    expect(screen.getByText(/strong melee characters/i)).toBeInTheDocument();
    expect(screen.getByText(/cleave/i)).toBeInTheDocument();
    expect(screen.getByText(/attributes at level/i)).toBeInTheDocument();
    expect(screen.getByText(/starting weapon/i)).toBeInTheDocument();
  });

  it("opens a skill detail with explanation and class chip", () => {
    renderAt("/skills/cleave");
    expect(screen.getByRole("heading", { name: /cleave/i })).toBeInTheDocument();
    expect(screen.getByText(/swing your axe/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /warrior/i })).toBeInTheDocument();
    expect(screen.getByText(/hostile/i)).toBeInTheDocument();
  });

  it("shows not-found for an unknown class", () => {
    renderAt("/classes/notaclass");
    expect(screen.getByText(/class not found/i)).toBeInTheDocument();
  });

  it("opens paladin aura forms", () => {
    renderAt("/skills/paladin_aura");
    expect(screen.getByRole("heading", { name: /paladin aura/i })).toBeInTheDocument();
    expect(screen.getByText("Aura of the Bulwark")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("opens aether shield with MP return and exclusive condition", () => {
    renderAt("/skills/aether_shield");
    expect(screen.getByText(/mp returned from hp lost/i)).toBeInTheDocument();
    expect(screen.getByText("Cannot coexist with")).toBeInTheDocument();
    expect(document.querySelector('a[href="/skills/mshield"]')).toBeInTheDocument();
  });

  it("lists reverse shared-cooldown skills on the hub", () => {
    renderAt("/skills/mshield");
    expect(screen.getByText("Shares cooldown with")).toBeInTheDocument();
    expect(document.querySelector('a[href="/skills/aether_shield"]')).toBeInTheDocument();
  });

  it("lists the full attack cooldown group", () => {
    renderAt("/skills/attack");
    expect(screen.getByText("Shares cooldown with")).toBeInTheDocument();
    expect(document.querySelector('a[href="/skills/3shot"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/skills/5shot"]')).toBeInTheDocument();
  });

  it("links other skills that apply the same condition", () => {
    renderAt("/skills/curse");
    expect(screen.getByText("Also applied by")).toBeInTheDocument();
    expect(document.querySelector('a[href="/skills/curse_aura"]')).toBeInTheDocument();
  });
});
