import { router } from "expo-router";
import { DESIGN_TRIAL } from "../../lib/variant";
import { useEffect, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import {
  AppText, Archive, ArrowRight, BottomSheet, Button, Calendar, Clock, FileText, Image, Info, MemoInput, Pencil, Redo2, SheetMenuRow,
  TileButton, TimeGrid, Toggle, Trash2, ChevronLeft, ChevronRight, PillButton, ArrowDown, CircleCheck,
  Lock, SkipForward, CalendarClock, AlarmClock, StickyNote, CopyPlus, CalendarPlus, PenLine, ImageOff, ScanText, Timer, Repeat, Camera, Inbox, Sunrise,
} from "../../components";
import { ensurePermission } from "../../data/notifications";
import { copyTodo, copyTodoTomorrow, deleteTodo, moveTodo, moveTodos, setTodoAlarm, setTodoPhoto, updateTodo, useDB, type Todo } from "../../data/store";
import { pickPhoto } from "../../lib/photos";
import { addDays, parseDay, today, type Day } from "../../lib/dates";
import { tokens, useTheme } from "../../theme";

type Mode = { kind: "menu" } | { kind: "memo" } | { kind: "alarm" } | { kind: "date"; action: "copy" | "move" } | { kind: "closed" };

/** S05 to-do menu, plus the memo sheet (S05a) and the date picker it opens. */
/** `inbox`: the 보관함 version of the menu (메모 with its text, 오늘하기, 날짜 바꾸기, 정보 보기), as in the reference. */
export function TodoSheets({ todoId, onClose, onEdit, notice, inbox, start = "menu" }: {
  todoId: string | null; onClose: () => void; onEdit: (id: string) => void; notice: (msg: string) => void; inbox?: boolean;
  /** open straight on the memo editor or the alarm time (tapping those on the row), instead of the menu */
  start?: "menu" | "memo" | "alarm";
}) {
  const { c } = useTheme();
  const todo = useDB((d) => d.todos.find((t) => t.id === todoId));
  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  useEffect(() => setMode(todoId ? { kind: start } : { kind: "closed" }), [todoId, start]);
  if (!todo) return null;
  const close = () => {
    setMode({ kind: "closed" });
    onClose();
  };
  const now = today();
  const day = todo.date ?? now;
  const past = day < now;
  // main app (user, 2026-11-23): its own glyphs (`g(copy app's, main app's)`) in one green tint, red only for deleting,
  // instead of the original-looking coloured circles
  const g = (a: typeof Pencil, b: typeof Pencil) => (DESIGN_TRIAL ? b : a);
  const icon = (I: typeof Pencil, danger = false) => <I size={DESIGN_TRIAL ? 20 : 18} color={DESIGN_TRIAL ? (danger ? c.danger : c.text) : c.onIcon} strokeWidth={2.4} />;
  const editRow = (
    <View style={{ flexDirection: "row", gap: 12, marginTop: DESIGN_TRIAL ? 0 : 12 }}>
      <TileButton inline label={DESIGN_TRIAL ? "수정" : "수정하기"} icon={DESIGN_TRIAL ? <PenLine size={18} color={c.text} /> : <Pencil size={24} color={c.menuEdit} />} onPress={() => { close(); onEdit(todo.id); }} />
      <TileButton inline label={DESIGN_TRIAL ? "삭제" : "삭제하기"} icon={<Trash2 size={DESIGN_TRIAL ? 18 : 24} color={DESIGN_TRIAL ? c.danger : c.menuDelete} />} onPress={() => { close(); deleteTodo(todo.id); notice("할 일을 지웠어요"); }} />
    </View>
  );

  return (
    <>
      <BottomSheet visible={mode.kind === "menu"} onClose={close} title={todo.title}>
        {/* As in the user's newer screenshot of the original: the memo on top, the actions two to a line, then
            수정하기 / 삭제하기. Which actions show still depends on done / past (the original's four menus). */}
        {todo.memo ? (
          <Pressable onPress={() => setMode({ kind: "memo" })} accessibilityRole="button" accessibilityLabel={`메모: ${todo.memo}`} accessibilityHint="메모 편집"
            style={{ backgroundColor: c.surfaceInput, borderRadius: tokens.radius.lg, padding: 18, marginBottom: 8, minHeight: 80 }}>
            <AppText variant="bodyLg" numberOfLines={6}>{todo.memo}</AppText>
          </Pressable>
        ) : null}
        {/* design app: 수정 · 삭제 first, then the actions as a grid of tiles */}
        {DESIGN_TRIAL ? <View style={{ marginBottom: 6 }}>{editRow}</View> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {inbox ? (
          <>
            <SheetMenuRow half title="오늘하기" color="menuMove" icon={icon(g(ArrowDown, Sunrise))} onPress={() => { moveTodo(todo.id, today()); close(); notice("오늘 할 일로 옮겼어요"); }} />
            <SheetMenuRow half title="날짜 바꾸기" color="menuMove" icon={icon(g(Redo2, CalendarClock))} onPress={() => setMode({ kind: "date", action: "move" })} />
            <SheetMenuRow half title="메모" color="menuMemo" icon={icon(g(FileText, StickyNote))} onPress={() => setMode({ kind: "memo" })} />
            <SheetMenuRow half title="정보 보기" color="menuInfo" icon={DESIGN_TRIAL ? icon(ScanText) : <Info size={18} color={c.text} />} onPress={() => { close(); router.push(`/todo/${todo.id}` as never); }} />
          </>
        ) : (
        <>
        {todo.isDone ? (
          <>
            {past ? (
              <SheetMenuRow half title="오늘 또 하기" color="menuRepeat" icon={icon(g(ArrowDown, CopyPlus))} onPress={() => { copyTodo(todo.id, now); close(); notice("오늘 할 일에 추가했어요"); }} />
            ) : (
              <SheetMenuRow half title="내일 또 하기" color="menuRepeat" icon={icon(g(ArrowRight, CopyPlus))} onPress={() => { copyTodoTomorrow(todo.id); close(); notice("내일 할 일에 추가했어요"); }} />
            )}
            <SheetMenuRow half title="다른 날 또 하기" color="menuRepeat" icon={icon(g(Redo2, CalendarPlus))} onPress={() => setMode({ kind: "date", action: "copy" })} />
          </>
        ) : past ? (
          <SheetMenuRow half title="오늘하기" color="menuMove" icon={icon(g(ArrowDown, Sunrise))} onPress={() => { moveTodo(todo.id, now); close(); notice("오늘 할 일로 옮겼어요"); }} />
        ) : (
          <SheetMenuRow half title="내일 하기" color="menuMove" icon={icon(g(ArrowRight, SkipForward))} onPress={() => { moveTodo(todo.id, addDays(day, 1)); close(); notice("내일로 옮겼어요"); }} />
        )}
        <SheetMenuRow half title="날짜 바꾸기" color="menuMove" icon={icon(g(Redo2, CalendarClock))} onPress={() => setMode({ kind: "date", action: "move" })} />
        {!todo.isDone ? (
          <SheetMenuRow half title="보관함으로 이동" color="menuMove" icon={icon(g(Archive, Inbox))} onPress={() => { moveTodos([todo.id], null); close(); notice("보관함으로 옮겼어요"); }} />
        ) : null}
        {todo.isDone || todo.photoUri ? (
          <SheetMenuRow half title={todo.photoUri ? "사진 바꾸기" : "사진 인증"} color="menuPhoto" icon={icon(g(Image, Camera))} onPress={async () => {
            close();
            try {
              const uri = await pickPhoto();
              if (uri) { setTodoPhoto(todo.id, uri); notice("사진을 붙였어요"); }
            } catch {
              notice("사진을 불러오지 못했어요");
            }
          }} />
        ) : null}
        {todo.photoUri ? <SheetMenuRow half title="사진 지우기" color="menuDelete" icon={icon(g(Trash2, ImageOff), true)} onPress={() => { setTodoPhoto(todo.id, null); close(); notice("사진을 지웠어요"); }} /> : null}
        {!past ? (
          <SheetMenuRow half title="시간 알림" sub={todo.remindAt ? alarmLabel(todo.remindAt) : undefined} color="menuTime" icon={icon(g(Clock, AlarmClock))} onPress={() => setMode({ kind: "alarm" })} />
        ) : null}
        {todo.date && !todo.routineId ? (
          <SheetMenuRow half title="루틴 등록하기" color="menuMove" icon={icon(g(CircleCheck, Repeat))} onPress={() => { close(); router.push(`/routines/new?category=${todo.categoryId}&from=${todo.id}` as never); }} />
        ) : null}
        <SheetMenuRow half title="타이머 열기" color="menuTime" icon={icon(g(Clock, Timer))} onPress={() => { close(); router.push(`/timer/${todo.id}` as never); }} />
        <SheetMenuRow half title="메모" color="menuMemo" icon={icon(g(FileText, StickyNote))} onPress={() => setMode({ kind: "memo" })} />
        <SheetMenuRow half title="정보 보기" color="menuInfo" icon={DESIGN_TRIAL ? icon(ScanText) : <Info size={18} color={c.text} />} onPress={() => { close(); router.push(`/todo/${todo.id}` as never); }} />
        </>
        )}
        </View>
        {DESIGN_TRIAL ? null : editRow}
      </BottomSheet>

      {mode.kind === "memo" ? <MemoSheet todo={todo} onClose={close} /> : null}
      {mode.kind === "alarm" ? <AlarmSheet todo={todo} onClose={close} notice={notice} /> : null}
      {mode.kind === "date" ? (
        <DatePickSheet
          title={mode.action === "copy" ? "다른 날 또 하기" : "날짜 바꾸기"}
          initial={todo.date ?? today()}
          onClose={close}
          onPick={(day) => {
            if (mode.action === "copy") copyTodo(todo.id, day);
            else moveTodo(todo.id, day);
            close();
            const { m, d } = parseDay(day);
            notice(mode.action === "copy" ? `${m}월 ${d}일에 추가했어요` : `${m}월 ${d}일로 옮겼어요`);
          }}
        />
      ) : null}
    </>
  );
}

function alarmLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** S05 시간 알림: an alarm at a time on the to-do's own day (TimeGrid, as in S07d). */
function AlarmSheet({ todo, onClose, notice }: { todo: Todo; onClose: () => void; notice: (m: string) => void }) {
  const start = todo.remindAt ? new Date(todo.remindAt) : null;
  const [time, setTime] = useState({ h: start?.getHours() ?? 9, m: start?.getMinutes() ?? 0 });
  const save = async () => {
    setTodoAlarm(todo.id, `${String(time.h).padStart(2, "0")}:${String(time.m).padStart(2, "0")}`);
    onClose();
    if (Platform.OS === "web") return notice("알림은 폰 앱에서만 울려요");
    notice((await ensurePermission()) ? "알림을 맞췄어요" : "알림 권한이 꺼져 있어요. 폰 설정에서 켜 주세요");
  };
  return (
    <BottomSheet visible onClose={onClose} title="시간 알림">
      <TimeGrid hour={time.h} minute={time.m} onChange={(h, m) => setTime({ h, m })} />
      <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
        <Button kind="sheetBlock" flex label="없음" onPress={() => { setTodoAlarm(todo.id, null); onClose(); }} />
        <Button kind="sheetBlock" flex label="완료" onPress={save} />
      </View>
    </BottomSheet>
  );
}

function MemoSheet({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const [memo, setMemo] = useState(todo.memo);
  const [priv, setPriv] = useState(todo.memoIsPrivate);
  const save = () => {
    updateTodo(todo.id, { memo: memo.trim(), memoIsPrivate: priv });
    onClose();
  };
  return (
    <BottomSheet visible onClose={save} title={todo.title} right={{ label: "완료", onPress: save }}>
      {DESIGN_TRIAL ? (
        // 메인 앱 (user, 2026-11-23): the lock is a chip above the note (not the original's switch under it)
        <MemoLockChip priv={priv} onChange={setPriv} />
      ) : null}
      <MemoInput value={memo} onChangeText={setMemo} placeholder={DESIGN_TRIAL ? "이 할 일에 남길 메모" : "메모를 남겨 보세요"} focusOnOpen />
      {DESIGN_TRIAL ? null : (
      <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 14 }}>
        <AppText variant="body">나만 보기</AppText>
        <Toggle value={priv} onChange={setPriv} label="메모 나만 보기" />
      </View>
      )}
    </BottomSheet>
  );
}

function MemoLockChip({ priv, onChange }: { priv: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange(!priv)} accessibilityRole="switch" accessibilityState={{ checked: priv }} accessibilityLabel="메모 나만 보기"
      style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 32, paddingHorizontal: 12, marginBottom: 10, borderRadius: 16, backgroundColor: priv ? c.text : c.surfaceStrong }}>
      <Lock size={14} color={priv ? c.bg : c.textMuted} />
      <AppText variant="small" weight={700} raw={priv ? c.bg : c.textSecondary}>{priv ? "메모는 나만 봐요" : "친구도 메모를 볼 수 있어요"}</AppText>
    </Pressable>
  );
}

export function DatePickSheet({ title, initial, onPick, onClose, onClear }: { title: string; initial: Day; onPick: (d: Day) => void; onClose: () => void; onClear?: () => void }) {
  const { c } = useTheme();
  const start = parseDay(initial);
  const [ym, setYm] = useState({ y: start.y, m: start.m });
  const [picked, setPicked] = useState<Day>(initial);
  const shift = (n: number) => setYm(({ y, m }) => { const t = m + n; return { y: y + Math.floor((t - 1) / 12), m: ((t - 1 + 120) % 12) + 1 }; });
  return (
    <BottomSheet visible onClose={onClose} title={title}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <AppText variant="bodyLg" weight={700} style={{ flex: 1 }}>{`${ym.y}년 ${ym.m}월`}</AppText>
        <PillButton round onPress={() => shift(-1)} a11y="이전 달"><ChevronLeft size={20} color={c.text} /></PillButton>
        <View style={{ width: 8 }} />
        <PillButton round onPress={() => shift(1)} a11y="다음 달"><ChevronRight size={20} color={c.text} /></PillButton>
      </View>
      <Calendar picker year={ym.y} month={ym.m} today={picked} selected={picked} onSelect={setPicked} />
      <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
        {onClear ? <Button kind="sheetBlock" flex label="없음" onPress={onClear} /> : null}
        <Button kind="sheetBlock" flex label="완료" onPress={() => onPick(picked)} />
      </View>
    </BottomSheet>
  );
}
