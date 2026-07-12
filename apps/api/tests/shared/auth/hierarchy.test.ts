import { describe, expect, test } from "bun:test";
import { assertHierarchy, HierarchyError } from "@/shared/auth/hierarchy";

describe("assertHierarchy", () => {
  test("owner may assign or target any role", () => {
    expect(() =>
      assertHierarchy({ actorRole: "owner", requestedRole: "owner" }),
    ).not.toThrow();
    expect(() =>
      assertHierarchy({ actorRole: "owner", targetRole: "admin" }),
    ).not.toThrow();
  });

  test("admin may manage publishers", () => {
    expect(() =>
      assertHierarchy({
        actorRole: "admin",
        targetRole: "member",
        requestedRole: "member",
      }),
    ).not.toThrow();
  });

  test("admin cannot promote a publisher to admin", () => {
    expect(() =>
      assertHierarchy({
        actorRole: "admin",
        targetRole: "member",
        requestedRole: "admin",
      }),
    ).toThrow(HierarchyError);
  });

  test("admin cannot assign owner", () => {
    expect(() =>
      assertHierarchy({ actorRole: "admin", requestedRole: "owner" }),
    ).toThrow(HierarchyError);
  });

  test("admin cannot target another admin or the owner", () => {
    expect(() =>
      assertHierarchy({ actorRole: "admin", targetRole: "admin" }),
    ).toThrow(HierarchyError);
    expect(() =>
      assertHierarchy({ actorRole: "admin", targetRole: "owner" }),
    ).toThrow(HierarchyError);
  });

  test("a non-owner with no role cannot touch managerial roles", () => {
    expect(() =>
      assertHierarchy({ actorRole: null, requestedRole: "admin" }),
    ).toThrow(HierarchyError);
  });
});
