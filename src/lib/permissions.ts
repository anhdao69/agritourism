import { Role, Listing } from "@prisma/client";

export function canEditListing(user: { id: string; role: Role }, listing: Listing) {
  if (user.role === "ADMIN" || user.role === "EDITOR") return true;
  if (listing.ownerId && listing.ownerId === user.id) return true;
  return false;
}
