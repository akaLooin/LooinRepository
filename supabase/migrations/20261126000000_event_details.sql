-- 일정 장소 · 화상 회의 링크 (2026-11-23, 이용자 요청: 구글에만 있던 정보도 립마크에서).
-- Supabase SQL Editor에서 실행 (20261125000000 다음). 여러 번 실행해도 안전하다.
alter table events add column if not exists location text check (char_length(location) <= 500);
-- 구글이 만든 화상 회의(Meet) 주소: 서버가 구글에서 받아 적는다 (립마크에서는 보기·열기만)
alter table events add column if not exists meet_link text check (char_length(meet_link) <= 500);
