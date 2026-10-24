import {
  filterCharacters,
  parseCharactersHtml,
  parseCharactersPage,
  topCharactersByClass,
} from "./parseCharacters";

const sampleHtml = `
<html><body>
<script>
var slotsalpha={"helmet":{"name":"fury","level":9},"mainhand":{"name":"fireblade","level":10}};
</script>
<div style='width: 600px; height: 216px; border: 5px solid gray; margin-bottom: 10px; background: black'>
  <span class='cskin' data-skin="mbody4d" data-cx="{&quot;hair&quot;:&quot;hairdo105&quot;}"></span>
  <div><span style='color:gray'>Name:</span> Alpha</div>
  <div><span style='color:gray'>Class:</span> Warrior</div>
  <div><span style='color:gray'>Level:</span> 100</div>
  <div><span style='color:green'>Online</span></div>
  <span class='slots' data-name="alpha"></span>
</div>
<script>
var slotsbeta={"helmet":{"name":"helmet","level":5}};
</script>
<div style='width: 600px; height: 216px; border: 5px solid gray; margin-bottom: 10px; background: black'>
  <div><span style='color:gray'>Name:</span> Beta</div>
  <div><span style='color:gray'>Class:</span> Warrior</div>
  <div><span style='color:gray'>Level:</span> 90</div>
  <span class='slots' data-name="beta"></span>
</div>
<script>
var slotsgamma={"mainhand":{"name":"staff","level":8}};
</script>
<div style='width: 600px; height: 216px; border: 5px solid gray; margin-bottom: 10px; background: black'>
  <div><span style='color:gray'>Name:</span> Gamma</div>
  <div><span style='color:gray'>Class:</span> Mage</div>
  <div><span style='color:gray'>Level:</span> 80</div>
  <span class='slots' data-name="gamma"></span>
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

describe("parseCharactersPage", () => {
  it("attaches gear and looks from slots vars and cskin", () => {
    const { loadouts } = parseCharactersPage(sampleHtml);
    expect(loadouts).toHaveLength(3);
    expect(loadouts[0]).toMatchObject({
      name: "Alpha",
      classKey: "warrior",
      level: 100,
      gear: {
        helmet: { name: "fury", level: 9 },
        mainhand: { name: "fireblade", level: 10 },
      },
      look: { skin: "mbody4d", cx: { hair: "hairdo105" } },
    });
    expect(loadouts[2].gear.mainhand).toEqual({ name: "staff", level: 8 });
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
