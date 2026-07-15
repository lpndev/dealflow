export const trustedOrigins = [
  "http://localhost:5173",
  ...(process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

export const trustedOriginSet = new Set(trustedOrigins);
