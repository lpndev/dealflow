---
name: prefer-official-solutions
description: User prefers official/first-party tools and libraries over third-party ones
type: feedback
---

When choosing a dependency, plugin, or tool, prefer the official/first-party option. The user rejected `eslint-plugin-react-refresh` specifically because it's third-party (ArnaudBarre), keeping only `eslint-plugin-react-hooks` (maintained by the React team in the `facebook/react` repo).

**Why:** the user trusts first-party maintenance/longevity and dislikes pulling in third-party tooling when an official equivalent exists.

**How to apply:** when proposing a lib/plugin, name who maintains it; flag third-party ones and offer the official alternative first. Combine with the project's ponytail philosophy (fewest deps): official > third-party > hand-rolled few lines, but a new dep of any kind still needs a real problem it solves now.
