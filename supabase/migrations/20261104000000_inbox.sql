-- 0003 보관함 (inbox): to-dos without a date.
-- Run once in the Supabase SQL editor, after 0001.
alter table todos alter column date drop not null;
