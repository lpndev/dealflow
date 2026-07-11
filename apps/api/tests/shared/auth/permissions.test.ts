import { expect, it } from "bun:test";
import { admin, member, owner } from "@/shared/auth/permissions";

it("publisher (member) can create and send publications", () => {
  expect(member.authorize({ publication: ["create", "send"] }).success).toBe(
    true,
  );
});

it("publisher (member) cannot manage settings, destinations, whatsapp, or members", () => {
  expect(member.authorize({ settings: ["manage"] }).success).toBe(false);
  expect(member.authorize({ destination: ["manage"] }).success).toBe(false);
  expect(member.authorize({ whatsapp: ["manage"] }).success).toBe(false);
  expect(member.authorize({ member: ["create"] }).success).toBe(false);
});

it("admin can manage settings, destinations, whatsapp, api keys, and members", () => {
  expect(admin.authorize({ settings: ["manage"] }).success).toBe(true);
  expect(admin.authorize({ destination: ["manage"] }).success).toBe(true);
  expect(admin.authorize({ whatsapp: ["manage"] }).success).toBe(true);
  expect(admin.authorize({ apikey: ["manage"] }).success).toBe(true);
  expect(admin.authorize({ member: ["create"] }).success).toBe(true);
});

it("only owner can delete the organization", () => {
  expect(owner.authorize({ organization: ["delete"] }).success).toBe(true);
  expect(admin.authorize({ organization: ["delete"] }).success).toBe(false);
});
