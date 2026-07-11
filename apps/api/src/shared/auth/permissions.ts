import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  ownerAc,
} from "better-auth/plugins/organization/access";

export const statement = {
  ...defaultStatements,
  publication: ["create", "send"],
  destination: ["read", "manage"],
  whatsapp: ["manage"],
  settings: ["read", "manage"],
  apikey: ["manage"],
} as const;

export const ac = createAccessControl(statement);

export const member = ac.newRole({
  publication: ["create", "send"],
  destination: ["read"],
  settings: ["read"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  publication: ["create", "send"],
  destination: ["read", "manage"],
  whatsapp: ["manage"],
  settings: ["read", "manage"],
  apikey: ["manage"],
});

export const owner = ac.newRole({
  ...ownerAc.statements,
  publication: ["create", "send"],
  destination: ["read", "manage"],
  whatsapp: ["manage"],
  settings: ["read", "manage"],
  apikey: ["manage"],
});
