import { describe, expect, it } from "vitest";
import { parseInline, parseParagraph, parseRichText } from "./richText";

describe("parseInline", () => {
  it("leaves plain text alone", () => {
    expect(parseInline("Just a sentence.")).toEqual([
      { type: "text", text: "Just a sentence." },
    ]);
  });

  it("reads bold, both italics and links, with the text between them", () => {
    expect(
      parseInline(
        "Bring **water**, *sun cream* and _a hat_. See [the map](https://maps.example.org/x)!",
      ),
    ).toEqual([
      { type: "text", text: "Bring " },
      { type: "bold", text: "water" },
      { type: "text", text: ", " },
      { type: "italic", text: "sun cream" },
      { type: "text", text: " and " },
      { type: "italic", text: "a hat" },
      { type: "text", text: ". See " },
      { type: "link", text: "the map", href: "https://maps.example.org/x" },
      { type: "text", text: "!" },
    ]);
  });

  it("only links http and https addresses", () => {
    for (const unsafe of [
      "[click](javascript:alert(1))",
      "[click](data:text/html;base64,AAAA)",
      "[click](ftp://example.org)",
      "[click](//example.org)",
    ]) {
      const nodes = parseInline(unsafe);
      expect(nodes.some((node) => node.type === "link")).toBe(false);
    }
    expect(parseInline("[ok](http://example.org)")[0]).toMatchObject({
      type: "link",
      href: "http://example.org",
    });
  });

  it("never produces markup: angle brackets stay literal text", () => {
    const nodes = parseInline("<script>alert(1)</script> **<b>x</b>**");
    expect(nodes).toEqual([
      { type: "text", text: "<script>alert(1)</script> " },
      { type: "bold", text: "<b>x</b>" },
    ]);
  });

  it("shows unfinished or unsupported syntax as typed", () => {
    expect(parseInline("a **b and *c")).toEqual([
      { type: "text", text: "a **b and *c" },
    ]);
    expect(parseInline("snake_case_name stays")).toEqual([
      { type: "text", text: "snake_case_name stays" },
    ]);
    expect(parseInline("2 * 3 * 4")).toEqual([
      { type: "text", text: "2 * 3 * 4" },
    ]);
  });
});

describe("parseParagraph", () => {
  it("keeps single line breaks inside one paragraph", () => {
    const [block] = parseParagraph("First line\nSecond line");
    expect(block).toMatchObject({ type: "paragraph" });
    expect(block.type === "paragraph" && block.lines).toHaveLength(2);
  });

  it("turns - and * lines into one bullet list", () => {
    const blocks = parseParagraph("- one\n- two\n* three");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("bulletList");
    expect(blocks[0].type === "bulletList" && blocks[0].items).toHaveLength(3);
  });

  it("turns 1. and 2) lines into one numbered list", () => {
    const blocks = parseParagraph("1. one\n2) two");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("numberedList");
  });

  it("splits intro text, a list and closing text into three blocks", () => {
    const blocks = parseParagraph("Bring:\n- a bottle\n- a hat\nSee you there");
    expect(blocks.map((b) => b.type)).toEqual([
      "paragraph",
      "bulletList",
      "paragraph",
    ]);
  });

  it("does not treat bold at the start of a line as a bullet", () => {
    const [block] = parseParagraph("**Important** note");
    expect(block.type).toBe("paragraph");
  });

  it("ignores blank lines", () => {
    expect(parseParagraph("\n  \n")).toEqual([]);
  });
});

describe("parseRichText", () => {
  it("parses every stored paragraph separately", () => {
    const result = parseRichText(["One **bold**.", "- a\n- b"]);
    expect(result).toHaveLength(2);
    expect(result[0][0].type).toBe("paragraph");
    expect(result[1][0].type).toBe("bulletList");
  });
});
