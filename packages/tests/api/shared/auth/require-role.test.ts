import { expect, it } from "vitest"
import { isRoleAllowed } from "@/shared/auth/require-role"

it("allows owner and admin, denies publisher and anonymous", () => {
  expect(isRoleAllowed("owner", ["owner", "admin"])).toBe(true)
  expect(isRoleAllowed("admin", ["owner", "admin"])).toBe(true)
  expect(isRoleAllowed("member", ["owner", "admin"])).toBe(false)
  expect(isRoleAllowed(null, ["owner", "admin"])).toBe(false)
})
