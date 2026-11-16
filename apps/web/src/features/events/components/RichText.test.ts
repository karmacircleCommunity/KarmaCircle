import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RichText from "./RichText";

const html = (paragraphs: string[]) =>
  renderToStaticMarkup(createElement(RichText, { paragraphs }));

describe("RichText", () => {
  it("renders formatting as elements and escapes everything else", () => {
    const out = html(["Hello **world** and <img src=x onerror=alert(1)>"]);

    expect(out).toContain("<strong");
    expect(out).toContain("world</strong>");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("opens links in a new tab without leaking the opener or passing ranking", () => {
    const out = html(["[Our site](https://example.org/page)"]);

    expect(out).toContain('href="https://example.org/page"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer nofollow ugc"');
  });

  it("renders a javascript link as the text it was typed as", () => {
    const out = html(["[click me](javascript:alert(1))"]);

    expect(out).not.toContain("<a ");
    expect(out).not.toContain("href=");
    expect(out).toContain("[click me](javascript:alert(1))");
  });

  it("renders bullet and numbered lists and line breaks", () => {
    const out = html([
      "Bring:\n- a bottle\n- a hat",
      "1. first\n2. second",
      "line one\nline two",
    ]);

    expect(out).toContain("<ul");
    expect(out.match(/<li/g)).toHaveLength(4);
    expect(out).toContain("<ol");
    expect(out).toContain("<br/>");
  });

  it("renders one wrapper per stored paragraph and nothing for none", () => {
    expect(html([])).toBe("");
    expect(html(["a", "b"]).match(/data-reveal/g)).toHaveLength(2);
  });
});
