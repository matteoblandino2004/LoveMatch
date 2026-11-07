-- Phase 1: real accounts, and profiles that live on a server instead of one phone.
--
-- The shape mirrors src/types.ts deliberately. Anywhere the names diverge the
-- app would need a translation layer, and a translation layer is where bugs go
-- to hide, so: same fields, snake_case.
--
-- The one structural difference from the local app is `claim_state`. Locally,
-- a profile you make for your sister is harmless — it never leaves your phone.
-- On a server it is a real person's name and face in a dating database that
-- they never signed up for. So a profile you make for someone else starts as
-- an invite: invisible to everyone but you, unswipeable, and deleted
-- automatically if they never claim it.

create extension if not exists "pgcrypto";

create type gender as enum ('woman', 'man', 'nonbinary');
create type intent as enum (
  'long-term', 'long-term-open', 'short-term', 'friends-first', 'figuring-it-out');
create type frequency as enum ('never', 'sometimes', 'often');
create type hair_color as enum ('black', 'brown', 'blonde', 'red', 'grey', 'other');
create type kids_stance as enum ('want', 'open', 'dont-want', 'have-want-more', 'have-done');
create type pet_stance as enum ('dog', 'cat', 'both', 'none', 'allergic');
create type politics as enum ('left', 'moderate', 'right', 'apolitical');

-- unclaimed: made for someone who has not joined. Only its author can see it.
-- claimed:   a real person controls it. Swipeable, searchable, theirs.
-- declined:  they said no. Kept as a tombstone so they cannot be re-invited.
create type claim_state as enum ('unclaimed', 'claimed', 'declined');

create table profiles (
  id uuid primary key default gen_random_uuid(),

  -- Null until someone claims it. This is the whole consent model: a profile
  -- with no owner is an invitation, not a person in a dating app.
  owner_id uuid unique references auth.users(id) on delete cascade,
  claim_state claim_state not null default 'unclaimed',

  -- Who made it, and how they know this person. Null when self-created.
  author_id uuid references profiles(id) on delete set null,
  relationship text,
  pitch text,

  name text not null check (length(name) between 1 and 60),
  age int check (age between 18 and 120),
  pronouns text,
  gender gender,
  interested_in gender[] not null default '{}',

  city text,
  region text,
  hometown text,
  job text,
  education text,
  height_cm int check (height_cm between 120 and 250),
  hair hair_color,
  bio text check (length(bio) <= 1000),
  interests text[] not null default '{}',
  intent intent,
  accent int not null default 0,

  -- Lifestyle and preferences stay grouped the way the app reads them.
  lifestyle jsonb not null default '{}'::jsonb,
  prefs jsonb not null default '{}'::jsonb,
  prompts jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An unclaimed invite is not allowed to sit around forever.
  expires_at timestamptz,

  -- A claimed profile has an owner; an unclaimed one has an author. Never neither.
  constraint owned_or_authored check (
    (claim_state = 'claimed' and owner_id is not null)
    or (claim_state <> 'claimed' and author_id is not null)
  )
);

-- Invites die after 30 days unless claimed. Enforced by a scheduled job too,
-- but set here so the intent travels with the row.
create or replace function set_invite_expiry() returns trigger as $$
begin
  if new.claim_state = 'unclaimed' and new.expires_at is null then
    new.expires_at := now() + interval '30 days';
  elsif new.claim_state = 'claimed' then
    new.expires_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_invite_expiry
  before insert or update on profiles
  for each row execute function set_invite_expiry();

create index profiles_owner on profiles(owner_id);
create index profiles_author on profiles(author_id) where claim_state = 'unclaimed';
create index profiles_expiry on profiles(expires_at) where claim_state = 'unclaimed';

alter table profiles enable row level security;

-- Your own profile.
create policy "read own" on profiles for select
  using (owner_id = auth.uid());

-- An invite you created, before the person has claimed it. Nobody else sees it.
create policy "read own invites" on profiles for select
  using (
    claim_state = 'unclaimed'
    and author_id in (select id from profiles where owner_id = auth.uid())
  );

-- Claimed profiles are visible to signed-in users. Deck filtering, blocking and
-- dealbreakers narrow this further in later migrations — this is the floor,
-- not the finished rule.
create policy "read claimed" on profiles for select
  using (claim_state = 'claimed' and auth.uid() is not null);

create policy "update own" on profiles for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- You may edit an invite you made, right up until they claim it. After that
-- it is theirs and you cannot touch it.
create policy "update own invites" on profiles for update
  using (
    claim_state = 'unclaimed'
    and author_id in (select id from profiles where owner_id = auth.uid())
  );

create policy "insert own" on profiles for insert
  with check (
    owner_id = auth.uid()
    or author_id in (select id from profiles where owner_id = auth.uid())
  );

create policy "delete own" on profiles for delete
  using (
    owner_id = auth.uid()
    or (claim_state = 'unclaimed'
        and author_id in (select id from profiles where owner_id = auth.uid()))
  );
