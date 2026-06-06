-- Run once in Supabase SQL Editor if your votes table already exists
-- without the value column (upvote = 1, downvote = -1).

alter table votes
  add column if not exists value smallint not null default 1
  check (value in (-1, 1));
