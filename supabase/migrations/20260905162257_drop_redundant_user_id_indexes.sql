-- Both tables have a composite primary key led by user_id, so the PK's btree
-- already serves `where user_id = ?`. The standalone indexes only add write
-- cost on the two highest-write tables in the app — every checkbox toggle
-- writes progress, every drag writes question_position.
--
-- Verified on the local DB by dropping them inside a rolled-back transaction:
-- with seqscan disabled, progress falls back to an Index Only Scan on
-- progress_pkey (cheaper than before — the PK covers both columns) and
-- question_position to an Index Scan on question_position_pkey. At current row
-- counts the planner seq-scans either way.

drop index if exists public.progress_user_id;
drop index if exists public.question_position_user_id;
