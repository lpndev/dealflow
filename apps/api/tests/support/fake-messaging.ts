import type {
  MessagingProvider,
  MessagingDestination,
  SendMessageInput,
  SendMessageResult,
} from "@/shared/messaging";

export class FakeMessaging implements MessagingProvider {
  groups: MessagingDestination[] = [];
  sent: SendMessageInput[] = [];
  failNext = false;

  async listGroups(): Promise<MessagingDestination[]> {
    return this.groups;
  }

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("gateway unavailable");
    }
    this.sent.push(input);
    return { externalMessageId: `msg-${this.sent.length}` };
  }
}
