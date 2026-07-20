import type {
  MessagingDestination,
  MessagingSession,
  SendMessageInput,
  SendMessageResult
} from "@dealflow/shared"

export type {
  MessagingDestination,
  MessagingSession,
  SendMessageInput,
  SendMessageResult
} from "@dealflow/shared"

export interface MessagingProvider {
  listGroups(sessionId: string): Promise<MessagingDestination[]>
  send(input: SendMessageInput): Promise<SendMessageResult>
}

export interface WhatsAppGateway extends MessagingProvider {
  getSession(sessionId: string): Promise<MessagingSession>
  connect(sessionId: string): Promise<void>
  end(sessionId: string): Promise<void>
  logout(sessionId: string): Promise<void>
}
