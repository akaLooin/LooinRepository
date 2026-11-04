-- 필름 카메라 앱: 로컬 SQLite 스키마 (Room 엔티티의 기준)
-- 서버도 계정도 없음. 단일 사용자 기기, 앱 전용 저장소 안에만 존재.
-- 시간은 전부 INTEGER(UTC epoch millis). Room에서 Instant <-> Long 변환기로 다룬다.
-- 필름/바디/렌즈 카탈로그는 DB가 아니라 assets/catalog.json (앱과 함께 배포, 읽기 전용).
-- 설정과 현재 장착 장비는 DataStore(Preferences)에 저장.

PRAGMA foreign_keys = ON;

-- 롤: 필름 한 통. 장착한 장비 조합을 롤 시작 시점에 고정한다.
CREATE TABLE rolls (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  film_id       TEXT    NOT NULL,                 -- catalog.json의 film.id (FK 불가: 카탈로그는 DB 밖)
  body_id       TEXT    NOT NULL,                 -- 롤을 시작할 때의 장비 (갤러리 표시용)
  lens_id       TEXT    NOT NULL,
  capacity      INTEGER NOT NULL DEFAULT 36 CHECK (capacity BETWEEN 1 AND 72),
  shot_count    INTEGER NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'shooting'
                CHECK (status IN ('shooting','developing','developed')),
  started_at    INTEGER NOT NULL,
  finished_at   INTEGER,                           -- 마지막 컷을 찍은 시각
  develop_at    INTEGER,                           -- 현상이 끝날 예정 시각 (현상 지연 설정)
  developed_at  INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  CONSTRAINT shot_count_range CHECK (shot_count BETWEEN 0 AND capacity),
  CONSTRAINT developed_has_time CHECK (status <> 'developed' OR developed_at IS NOT NULL)
);
-- 촬영 중인 롤은 항상 하나뿐. (Room @Index는 WHERE를 지원하지 않으므로 RoomDatabase.Callback.onCreate에서 실행)
CREATE UNIQUE INDEX rolls_one_shooting ON rolls(status) WHERE status = 'shooting';
CREATE INDEX rolls_status_develop_at ON rolls(status, develop_at);   -- 현상 대기 롤 찾기
CREATE INDEX rolls_started_at ON rolls(started_at DESC);             -- 갤러리 정렬

-- 사진: 컷 한 장. 원본(필터 없음)과 현상본(필터 적용) 파일 경로를 모두 가진다.
CREATE TABLE photos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_id         INTEGER NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,  -- 롤을 지우면 사진도 삭제 (파일은 Repository에서 같이 지움)
  frame_no        INTEGER NOT NULL CHECK (frame_no >= 1),
  body_id         TEXT    NOT NULL,          -- 바디/렌즈는 롤 중간에 바꿀 수 있어서 컷마다 기록
  lens_id         TEXT    NOT NULL,
  raw_path        TEXT    NOT NULL,          -- filesDir/rolls/{roll}/{frame}_raw.jpg  (현상 후 삭제 가능)
  developed_path  TEXT,                      -- filesDir/rolls/{roll}/{frame}.jpg      (현상 전엔 NULL)
  width           INTEGER NOT NULL,
  height          INTEGER NOT NULL,
  rotation        INTEGER NOT NULL DEFAULT 0 CHECK (rotation IN (0,90,180,270)),
  lens_facing     TEXT    NOT NULL CHECK (lens_facing IN ('back','front')),
  exposure_ev     REAL    NOT NULL DEFAULT 0,
  flash           INTEGER NOT NULL DEFAULT 0 CHECK (flash IN (0,1)),
  light_leak_seed INTEGER NOT NULL,          -- 컷마다 다른 빛샘/그레인 패턴을 재현 가능하게
  latitude        REAL,
  longitude       REAL,
  exported_uri    TEXT,                      -- MediaStore에 저장했으면 그 content:// URI
  taken_at        INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
-- 셔터 연타로 같은 컷 번호가 두 번 들어가는 걸 DB에서 막는다.
CREATE UNIQUE INDEX photos_roll_frame ON photos(roll_id, frame_no);
CREATE INDEX photos_taken_at ON photos(taken_at DESC);
