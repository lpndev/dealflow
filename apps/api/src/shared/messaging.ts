export type MessagingDestination = {
  provider: string;
  externalId: string;
  name: string;
};

export type SendMessageInput = {
  sessionId: string;
  destinationExternalId: string;
  content: string;
  imageUrl?: string;
};

export type SendMessageResult = {
  externalMessageId: string;
};

export type MessagingSession = {
  connection: string;
  qr: string | null;
};

export interface MessagingProvider {
  listGroups(sessionId: string): Promise<MessagingDestination[]>;
  send(input: SendMessageInput): Promise<SendMessageResult>;
}

export interface WhatsAppGateway extends MessagingProvider {
  getSession(sessionId: string): Promise<MessagingSession>;
  connect(sessionId: string): Promise<void>;
  end(sessionId: string): Promise<void>;
  logout(sessionId: string): Promise<void>;
}
