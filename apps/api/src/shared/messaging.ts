export type MessagingDestination = {
  provider: string;
  externalId: string;
  name: string;
};

export type SendMessageInput = {
  destinationExternalId: string;
  content: string;
  imageUrl?: string;
};

export type SendMessageResult = {
  externalMessageId: string;
};

export interface MessagingProvider {
  listGroups(): Promise<MessagingDestination[]>;
  send(input: SendMessageInput): Promise<SendMessageResult>;
  logout(): Promise<void>;
}
