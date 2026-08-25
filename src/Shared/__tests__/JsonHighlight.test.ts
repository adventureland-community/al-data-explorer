import { tokenizeJson } from "../JsonHighlight";

describe("tokenizeJson", () => {
  it("colors keys, strings, numbers, booleans, and null", () => {
    const text = JSON.stringify({ name: "Knife", level: 2, rare: true, note: null }, null, 2);
    const kinds = tokenizeJson(text)
      .filter((t) => t.kind !== "plain" && t.kind !== "punct")
      .map((t) => `${t.kind}:${t.text}`);

    expect(kinds).toStrictEqual([
      'key:"name"',
      'string:"Knife"',
      'key:"level"',
      "number:2",
      'key:"rare"',
      "boolean:true",
      'key:"note"',
      "null:null",
    ]);
  });
});
