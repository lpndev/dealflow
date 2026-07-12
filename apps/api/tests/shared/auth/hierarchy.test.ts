import { describe, expect, test } from "bun:test";
import { hierarchyAllows } from "@/shared/auth/hierarchy";

describe("hierarchyAllows", () => {
  test("owner may assign or target any role", () => {
    expect(
      hierarchyAllows({ actorRole: "owner", requestedRole: "owner" }),
    ).toBe(true);
    expect(hierarchyAllows({ actorRole: "owner", targetRole: "admin" })).toBe(
      true,
    );
  });

  test("admin may manage publishers", () => {
    expect(
      hierarchyAllows({
        actorRole: "admin",
        targetRole: "member",
        requestedRole: "member",
      }),
    ).toBe(true);
  });

  test("admin cannot promote a publisher to admin", () => {
    expect(
      hierarchyAllows({
        actorRole: "admin",
        targetRole: "member",
        requestedRole: "admin",
      }),
    ).toBe(false);
  });

  test("admin cannot assign owner", () => {
    expect(
      hierarchyAllows({ actorRole: "admin", requestedRole: "owner" }),
    ).toBe(false);
  });

  test("admin cannot target another admin or the owner", () => {
    expect(hierarchyAllows({ actorRole: "admin", targetRole: "admin" })).toBe(
      false,
    );
    expect(hierarchyAllows({ actorRole: "admin", targetRole: "owner" })).toBe(
      false,
    );
  });

  test("a non-owner with no role cannot touch managerial roles", () => {
    expect(hierarchyAllows({ actorRole: null, requestedRole: "admin" })).toBe(
      false,
    );
  });
});
