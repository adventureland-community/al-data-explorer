import { filterCharacters, parseCharactersHtml, topCharactersByClass } from "./parseCharacters";

const sampleHtml = `
<html><body>
<div style='width: 600px; height: 216px; border: 5px solid gray; margin-bottom: 10px; background: black'>
  <div><span style='color:gray'>Name:</span> Alpha</div>
  <div><span style='color:gray'>Class:</span> Warrior</div>
  <div><span style='color:gray'>Level:</span> 100</div>
  <div><span style='color:green'>Online</span></div>
</div>
<div style='width: 600px; height: 216px; border: 5px solid gray; margin-bottom: 10px; background: black'>
  <div><span style='color:gray'>Name:</span> Beta</div>
  <div><span style='color:gray'>Class:</span> Warrior</div>
  <div><span style='color:gray'>Level:</span> 90</div>
</div>
<div style='width: 600px; height: 216px; border: 5px solid gray; margin-bottom: 10px; background: black'>
  <div><span style='color:gray'>Name:</span> Gamma</div>
  <div><span style='color:gray'>Class:</span> Mage</div>
  <div><span style='color:gray'>Level:</span> 80</div>
</div>
</body></html>
`;

describe("parseCharactersHtml", () => {
  it("reads name, class, level, online, and classKey", () => {
    const characters = parseCharactersHtml(sampleHtml);
    expect(characters).toEqual([
      { name: "Alpha", className: "Warrior", classKey: "warrior", level: 100, online: true },
      { name: "Beta", className: "Warrior", classKey: "warrior", level: 90, online: false },
      { name: "Gamma", className: "Mage", classKey: "mage", level: 80, online: false },
    ]);
  });
});

describe("topCharactersByClass", () => {
  it("returns top N per class in a stable class order", () => {
    const characters = parseCharactersHtml(sampleHtml);
    const columns = topCharactersByClass(characters, 1);
    expect(columns.map((c) => c.className)).toEqual(["Warrior", "Mage"]);
    expect(columns[0].characters.map((c) => c.name)).toEqual(["Alpha"]);
    expect(columns[1].characters.map((c) => c.name)).toEqual(["Gamma"]);
  });
});

describe("filterCharacters", () => {
  it("filters by search, class, and online", () => {
    const characters = parseCharactersHtml(sampleHtml);
    expect(
      filterCharacters(characters, { search: "alp", classNames: [], onlineOnly: false }).map(
        (c) => c.name,
      ),
    ).toEqual(["Alpha"]);
    expect(
      filterCharacters(characters, {
        search: "",
        classNames: ["Warrior"],
        onlineOnly: true,
      }).map((c) => c.name),
    ).toEqual(["Alpha"]);
  });
});
