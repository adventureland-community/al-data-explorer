import { parseCharacterLoadoutHtml, parseCharacterLookFromHtml } from "./fetchCharacterLoadout";

const sampleHtml = `
<html><body>
<span class='cskin' data-skin="mbody4d" data-cx="{&quot;hair&quot;:&quot;hairdo105&quot;,&quot;head&quot;:&quot;fmakeup01&quot;}"></span>
<script>
var slotscrowntown={"helmet":{"name":"fury","level":9},"mainhand":{"name":"fireblade","level":9}};
</script>
<div><span style='color:gray'>Name:</span> CrownTown</div>
<div><span style='color:gray'>Class:</span> Warrior</div>
<div><span style='color:gray'>Level:</span> 108</div>
</body></html>
`;

describe("parseCharacterLookFromHtml", () => {
  it("reads data-skin and data-cx from .cskin", () => {
    expect(parseCharacterLookFromHtml(sampleHtml)).toEqual({
      skin: "mbody4d",
      cx: { hair: "hairdo105", head: "fmakeup01" },
    });
  });
});

describe("parseCharacterLoadoutHtml", () => {
  it("parses gear, class, level, and look", () => {
    const loadout = parseCharacterLoadoutHtml(sampleHtml, "CrownTown");
    expect(loadout.name).toBe("CrownTown");
    expect(loadout.classKey).toBe("warrior");
    expect(loadout.level).toBe(108);
    expect(loadout.gear.helmet).toEqual({ name: "fury", level: 9 });
    expect(loadout.look?.skin).toBe("mbody4d");
  });
});
