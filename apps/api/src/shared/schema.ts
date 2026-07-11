import {
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

const now = () => new Date();

export const product = sqliteTable(
  "product",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    provider: text("provider").notNull(),
    externalId: text("external_id"),
    canonicalUrl: text("canonical_url"),
    title: text("title"),
    imageUrl: text("image_url"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [unique().on(t.workspaceId, t.provider, t.externalId)],
);

export const dealSnapshot = sqliteTable("deal_snapshot", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  signalId: text("signal_id"),
  productId: text("product_id")
    .notNull()
    .references(() => product.id),
  originalPrice: real("original_price"),
  currentPrice: real("current_price"),
  coupon: text("coupon"),
  observedAt: integer("observed_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(now),
});

export const affiliateLink = sqliteTable("affiliate_link", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  productId: text("product_id")
    .notNull()
    .references(() => product.id),
  url: text("url").notNull(),
  status: text("status", { enum: ["pending", "valid", "invalid"] })
    .notNull()
    .default("valid"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(now),
});

export const publication = sqliteTable("publication", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  dealId: text("deal_id")
    .notNull()
    .references(() => dealSnapshot.id),
  affiliateLinkId: text("affiliate_link_id")
    .notNull()
    .references(() => affiliateLink.id),
  content: text("content").notNull(),
  status: text("status", { enum: ["draft", "ready", "sending", "sent"] })
    .notNull()
    .default("ready"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(now),
});

export const destination = sqliteTable(
  "destination",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [unique().on(t.workspaceId, t.provider, t.externalId)],
);

export const delivery = sqliteTable(
  "delivery",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    publicationId: text("publication_id")
      .notNull()
      .references(() => publication.id),
    destinationId: text("destination_id")
      .notNull()
      .references(() => destination.id),
    status: text("status", {
      enum: ["pending", "scheduled", "processing", "sent", "failed"],
    })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    dueAt: integer("due_at", { mode: "timestamp" }),
    externalMessageId: text("external_message_id"),
    error: text("error"),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [unique().on(t.publicationId, t.destinationId)],
);

export const settings = sqliteTable("settings", {
  workspaceId: text("workspace_id").primaryKey(),
  delayMinSeconds: integer("delay_min_seconds").notNull().default(1200),
  delayMaxSeconds: integer("delay_max_seconds").notNull().default(2400),
  queuePaused: integer("queue_paused", { mode: "boolean" })
    .notNull()
    .default(false),
  messageTemplate: text("message_template"),
  mlAffiliateTag: text("ml_affiliate_tag"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(now),
});

export * from "./auth-schema";
