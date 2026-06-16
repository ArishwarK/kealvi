-- Run in Supabase SQL Editor (after add-vote-value.sql)

create or replace function get_question_scores(question_ids uuid[])
returns table (question_id uuid, score bigint)
language sql
stable
as $$
  select q.id as question_id, GREATEST(coalesce(sum(v.value), 0), 0)::bigint as score
  from unnest(question_ids) as q(id)
  left join votes v on v.question_id = q.id
  group by q.id;
$$;

create or replace function cast_question_vote(
  p_question_id uuid,
  p_voter_id text,
  p_value smallint
)
returns json
language plpgsql
as $$
declare
  v_existing_id uuid;
  v_existing_value smallint;
  v_user_vote smallint;
  v_score bigint;
begin
  if p_value not in (-1, 1) then
    raise exception 'vote value must be -1 or 1';
  end if;

  select id, value
  into v_existing_id, v_existing_value
  from votes
  where question_id = p_question_id
    and voter_id = p_voter_id
  for update;

  if v_existing_id is null then
    -- No existing vote → insert new vote
    insert into votes (question_id, voter_id, value)
    values (p_question_id, p_voter_id, p_value);
    v_user_vote := p_value;
  else
    -- Already voted → always remove existing vote (no flip)
    delete from votes where id = v_existing_id;
    v_user_vote := null;
  end if;

  select GREATEST(coalesce(sum(value), 0), 0)
  into v_score
  from votes
  where question_id = p_question_id;

  return json_build_object(
    'score', v_score,
    'userVote', v_user_vote
  );
end;
$$;
