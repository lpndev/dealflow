const devOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5173", "http://localhost:4173"]

export const trustedOrigins = [
  ...devOrigins,
  ...(process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
]

export const trustedOriginSet = new Set(trustedOrigins)
