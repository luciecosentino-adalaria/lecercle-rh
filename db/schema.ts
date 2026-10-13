import {sqliteTable,integer,text} from 'drizzle-orm/sqlite-core';
export const demoState=sqliteTable('demo_state',{id:integer('id').primaryKey(),revision:integer('revision').notNull(),payload:text('payload').notNull()});
export const users=sqliteTable('users',{id:text('id').primaryKey(),username:text('username').notNull().unique(),passwordHash:text('password_hash').notNull(),displayName:text('display_name').notNull(),roles:text('roles').notNull(),active:integer('active').notNull().default(1),createdAt:text('created_at').notNull()});
export const sessions=sqliteTable('sessions',{token:text('token').primaryKey(),userId:text('user_id').notNull(),createdAt:text('created_at').notNull(),expiresAt:text('expires_at').notNull()});
