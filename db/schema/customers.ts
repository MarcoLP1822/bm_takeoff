import { boolean, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const membership = pgEnum("membership", ["free", "pro"])

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").unique().notNull(),
  membership: membership("membership").default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

export type InsertCustomer = typeof customers.$inferInsert
export type SelectCustomer = typeof customers.$inferSelect
