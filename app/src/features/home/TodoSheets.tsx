import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import {
  AppText, Archive, ArrowRight, BottomSheet, Button, Calendar, Clock, FileText, Image, Info, MemoInput, Pencil, Redo2, SheetMenuRow,
  TileButton, TimeGrid, Toggle, Trash2, ChevronLeft, ChevronRight, PillButton, ArrowDown,
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
  const icon = (I: typeof Pencil) => <I size={18} color={c.onIcon} strokeWidth={2.4} />;

  return (
    <>
      <BottomSheet visible={mode.kind === "menu"} onClose={close} title={todo.title}>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <TileButton label="수정하기" icon={<Pencil size={28} color={c.menuEdit} />} onPress={() => { close(); onEdit(todo.id); }} />
          <TileButton label="삭제하기" icon={<Trash2 size={28} color={c.menuDelete} />} onPress={() => { close(); deleteTodo(todo.id); notice("할 일을 지웠어요"); }} />
        </View>
        <SheetMenuRow title="메모" color="menuMemo" icon={icon(FileText)} onPress={() => setMode({ kind: "memo" })} />
        {inbox && todo.memo ? (
          <View style={{ backgroundColor: c.surfaceInput, borderRadius: tokens.radius.lg, padding: 18, marginBottom: 6 }}>
            <AppText variant="bodyLg">{todo.memo}</AppText>
          </View>
        ) : null}
        {inbox ? (
          <>
            <SheetMenuRow title="오늘하기" color="menuMove" icon={icon(ArrowDown)} onPress={() => { moveTodo(todo.id, today()); close(); notice("오늘 할 일로 옮겼어요"); }} />
            <SheetMenuRow title="날짜 바꾸기" color="menuMove" icon={icon(Redo2)} onPress={() => setMode({ kind: "date", action: "move" })} />
            <SheetMenuRow title="정보 보기" color="menuInfo" icon={<Info size={18} color={c.text} />} onPress={() => { close(); router.push(`/todo/${todo.id}` as never); }} />
          </>
        ) : (
        <>
        {/* Rows follow the original's four menus (user's screenshots): what shows depends on whether the to-do is
            done and whether its day has passed. Moving (purple) is for unfinished ones, copying (orange) for done ones. */}
        {!past ? (
          <SheetMenuRow title={todo.remindAt ? `시간 알림 · ${alarmLabel(todo.remindAt)}` : "시간 알림"} color="menuTime" icon={icon(Clock)} onPress={() => setMode({ kind: "alarm" })} />
        ) : null}
        <SheetMenuRow title="타이머 열기" color="menuTime" icon={icon(Clock)} onPress={() => { close(); router.push(`/timer/${todo.id}` as never); }} />
        {todo.isDone || todo.photoUri ? (
          <SheetMenuRow title={todo.photoUri ? "사진 바꾸기" : "사진 인증"} color="menuPhoto" icon={icon(Image)} onPress={async () => {
            close();
            try {
              const uri = await pickPhoto();
              if (uri) { setTodoPhoto(todo.id, uri); notice("사진을 붙였어요"); }
            } catch {
              notice("사진을 불러오지 못했어요");
            }
          }} />
        ) : null}
        {todo.photoUri ? <SheetMenuRow title="사진 지우기" color="menuDelete" icon={icon(Trash2)} onPress={() => { setTodoPhoto(todo.id, null); close(); notice("사진을 지웠어요"); }} /> : null}
        {todo.isDone ? (
          <>
            {past ? (
              <SheetMenuRow title="오늘 또 하기" color="menuRepeat" icon={icon(ArrowDown)} onPress={() => { copyTodo(todo.id, now); close(); notice("오늘 할 일에 추가했어요"); }} />
            ) : (
              <SheetMenuRow title="내일 또 하기" color="menuRepeat" icon={icon(ArrowRight)} onPress={() => { copyTodoTomorrow(todo.id); close(); notice("내일 할 일에 추가했어요"); }} />
            )}
            <SheetMenuRow title="다른 날 또 하기" color="menuRepeat" icon={icon(Redo2)} onPress={() => setMode({ kind: "date", action: "copy" })} />
          </>
        ) : past ? (
          <SheetMenuRow title="오늘하기" color="menuMove" icon={icon(ArrowDown)} onPress={() => { moveTodo(todo.id, now); close(); notice("오늘 할 일로 옮겼어요"); }} />
        ) : (
          <SheetMenuRow title="내일 하기" color="menuMove" icon={icon(ArrowRight)} onPress={() => { moveTodo(todo.id, addDays(day, 1)); close(); notice("내일로 옮겼어요"); }} />
        )}
        <SheetMenuRow title="날짜 바꾸기" color="menuMove" icon={icon(Redo2)} onPress={() => setMode({ kind: "date", action: "move" })} />
        {!todo.isDone ? (
          <SheetMenuRow title="보관함으로 이동" color="menuMove" icon={icon(Archive)} onPress={() => { moveTodos([todo.id], null); close(); notice("보관함으로 옮겼어요"); }} />
        ) : null}
        <SheetMenuRow title="정보 보기" color="menuInfo" icon={<Info size={18} color={c.text} />} onPress={() => { close(); router.push(`/todo/${todo.id}` as never); }} />
        </>
        )}
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
  const [time, setTime] = useState({ h: start?.getHours() ?? 9, m: start ? start.getMinutes() - (start.getMinutes() % 5) : 0 });
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
      <MemoInput value={memo} onChangeText={setMemo} placeholder="메모를 남겨 보세요" focusOnOpen />
      <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 14 }}>
        <AppText variant="body">나만 보기</AppText>
        <Toggle value={priv} onChange={setPriv} label="메모 나만 보기" />
      </View>
    </BottomSheet>
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
