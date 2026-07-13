import type {
  MessagingDestination,
  MessagingProvider,
  SendMessageInput,
  SendMessageResult,
} from "@/shared/messaging";

export class FakeMessaging implements MessagingProvider {
  groups: MessagingDestination[] = [];
  sent: SendMessageInput[] = [];
  failNext = false;
  groupsRequestedBy: string[] = [];

  async listGroups(sessionId: string): Promise<MessagingDestination[]> {
    this.groupsRequestedBy.push(sessionId);
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
