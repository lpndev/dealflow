import {
  sqliteTable,
  text,
  real,
  integer,
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
