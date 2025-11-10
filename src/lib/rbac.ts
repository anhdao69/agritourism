import type { Role } from "@prisma/client";

const ORDER: Record<Role, number> = { VISITOR: 0, OWNER: 1, EDITOR: 2, ADMIN: 3 };

export function hasRole(current: Role, required: Role) {
  return ORDER[current] >= ORDER[required];
}
