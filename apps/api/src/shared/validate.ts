export function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items = value as unknown[]
  return items.every((item): item is string => typeof item === "string")
    ? items
    : null
}

export function nonEmptyStringArray(value: unknown): string[] | null {
  const parsed = stringArray(value)
  return parsed && parsed.length > 0 ? parsed : null
}
