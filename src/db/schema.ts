import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  integer,
} from 'drizzle-orm/pg-core';

export const users = pgTable('user_profile', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  refreshToken: text('refresh_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userImage = pgTable('user_image', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  sizeInBytes: varchar('size_in_bytes', { length: 100 }),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const transformedImage = pgTable('transformed_image', {
  id: serial('id').primaryKey(),
  storageKey: text('storage_key').notNull(),
  originalImageId: integer('original_image_id')
    .notNull()
    .references(() => userImage.id),
  mimeType: varchar('mime_type', { length: 100 }),
  sizeInBytes: varchar('size_in_bytes', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
