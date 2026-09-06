import {sqliteTable,integer,text} from 'drizzle-orm/sqlite-core';
export const demoState=sqliteTable('demo_state',{id:integer('id').primaryKey(),revision:integer('revision').notNull(),payload:text('payload').notNull()});
