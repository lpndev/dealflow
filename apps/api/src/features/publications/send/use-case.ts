import type { Db } from "@/shared/db";
import type { MessagingProvider } from "@/shared/messaging";
import { DeliveryError } from "@/shared/errors";
import {
  loadPublicationContent,
  deliverOne,
  refreshPublicationStatus,
  type DeliveryResult,
} from "./deliver";

export type SendInput = {
  publicationId: string;
  destinationIds: string[];
};

export type { DeliveryResult };

export async function sendPublication(
  input: SendInput,
  db: Db,
  provider: MessagingProvider,
): Promise<DeliveryResult[]> {
  const pub = loadPublicationContent(db, input.publicationId);
  if (!pub) throw new DeliveryError("publication not found");

  const results: DeliveryResult[] = [];
  for (const destinationId of input.destinationIds) {
    results.push(await deliverOne(db, provider, pub, destinationId));
  }

  refreshPublicationStatus(db, pub.id);
  return results;
}
