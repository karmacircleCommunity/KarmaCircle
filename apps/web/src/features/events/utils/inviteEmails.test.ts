import { describe, expect, it } from "vitest";
import { parseInviteEmails } from "@features/events/utils/inviteEmails";

describe("parseInviteEmails", () => {
  it("splits on commas, semicolons, spaces and new lines", () => {
    expect(
      parseInviteEmails("a@x.com, b@x.com;c@x.com d@x.com\ne@x.com"),
    ).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"]);
  });

  it("lowercases and drops repeats", () => {
    expect(parseInviteEmails("A@X.com a@x.com A@x.COM")).toEqual(["a@x.com"]);
  });

  it("ignores empty entries", () => {
    expect(parseInviteEmails("  ,, ;\n ")).toEqual([]);
    expect(parseInviteEmails("")).toEqual([]);
  });
});
