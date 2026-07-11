import type { DeliveryResult } from "@dealflow/shared";
import type { Db } from "@/shared/db";
import { DeliveryError } from "@/shared/errors";
import type { MessagingProvider } from "@/shared/messaging";
import {
  deliverOne,
  loadPublicationContent,
  refreshPublicationStatus,
} from "./deliver";

export type SendInput = {
  publicationId: string;
  destinationIds: string[];
};

export async function sendPublication(
  input: SendInput,
  db: Db,
  workspaceId: string,
  provider: MessagingProvider,
): Promise<DeliveryResult[]> {
  const pub = loadPublicationContent(db, workspaceId, input.publicationId);
  if (!pub) throw new DeliveryError("publication not found");

  const results: DeliveryResult[] = [];
  for (const destinationId of input.destinationIds) {
    results.push(
      await deliverOne(db, workspaceId, provider, pub, destinationId),
    );
  }

  refreshPublicationStatus(db, workspaceId, pub.id);
  return results;
}
