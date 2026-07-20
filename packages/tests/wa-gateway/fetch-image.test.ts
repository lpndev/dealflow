import { expect, it } from "vitest"
import { isPublicIp } from "@/fetch-image"

it("blocks private, loopback, link-local and reserved ranges", () => {
  for (const ip of [
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:192.168.0.1",
    "not-an-ip"
  ]) {
    expect(isPublicIp(ip), ip).toBe(false)
  }
})

it("allows public unicast addresses", () => {
  for (const ip of [
    "8.8.8.8",
    "151.101.1.140",
    "2600:9000:2::1",
    "::ffff:8.8.8.8"
  ]) {
    expect(isPublicIp(ip), ip).toBe(true)
  }
})
