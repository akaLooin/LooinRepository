import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import {
  AppText, ArrowRight, BottomSheet, Button, Calendar, Clock, FileText, Image, Info, MemoInput, Pencil, Redo2, SheetMenuRow,
  TileButton, Toggle, Trash2, ChevronLeft, ChevronRight, PillButton,
} from "../../components";
import { copyTodo, copyTodoTomorrow, deleteTodo, moveTodo, updateTodo, useDB, type Todo } from "../../data/store";
import { parseDay, type Day } from "../../lib/dates";
import { useTheme } from "../../theme";

type Mode = { kind: "menu" } | { kind: "memo" } | { kind: "date"; action: "copy" | "move" } | { kind: "closed" };

/** S05 to-do menu, plus the memo sheet (S05a) and the date picker it opens. */
export function TodoSheets({ todoId, onClose, onEdit, notice }: { todoId: string | null; onClose: () => void; onEdit: (id: string) => void; notice: (msg: string) => void }) {
  const { c } = useTheme();
  const todo = useDB((d) => d.todos.find((t) => t.id === todoId));
  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  useEffect(() => setMode(todoId ? { kind: "menu" } : { kind: "closed" }), [todoId]);
  if (!todo) return null;
  const close = () => {
    setMode({ kind: "closed" });
    onClose();
  };
  const icon = (I: typeof Pencil) => <I size={18} color={c.onIcon} strokeWidth={2.4} />;

  return (
    <>
      <BottomSheet visible={mode.kind === "menu"} onClose={close} title={todo.title}>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <TileButton label="수정하기" icon={<Pencil size={28} color={c.menuEdit} />} onPress={() => { close(); onEdit(todo.id); }} />
          <TileButton label="삭제하기" icon={<Trash2 size={28} color={c.menuDelete} />} onPress={() => { close(); deleteTodo(todo.id); notice("할 일을 지웠어요"); }} />
        </View>
        <SheetMenuRow title="메모" color="menuMemo" icon={icon(FileText)} onPress={() => setMode({ kind: "memo" })} />
        <SheetMenuRow title="시간 알림" color="menuTime" icon={icon(Clock)} onPress={() => { close(); notice("시간 알림은 알림 기능과 함께 만들어요"); }} />
        <SheetMenuRow title="타이머 열기" color="menuTime" icon={icon(Clock)} onPress={() => { close(); router.push(`/timer/${todo.id}` as never); }} />
        <SheetMenuRow title="사진 인증" color="menuPhoto" icon={icon(Image)} onPress={() => { close(); notice("사진 인증은 다음 단계에서 만들어요"); }} />
        <SheetMenuRow title="내일 또 하기" color="menuRepeat" icon={icon(ArrowRight)} onPress={() => { copyTodoTomorrow(todo.id); close(); notice("내일 할 일에 추가했어요"); }} />
        <SheetMenuRow title="다른 날 또 하기" color="menuRepeat" icon={icon(Redo2)} onPress={() => setMode({ kind: "date", action: "copy" })} />
        <SheetMenuRow title="날짜 바꾸기" color="menuMove" icon={icon(Redo2)} onPress={() => setMode({ kind: "date", action: "move" })} />
        <SheetMenuRow title="정보 보기" color="menuInfo" icon={<Info size={18} color={c.text} />} onPress={() => { close(); router.push(`/todo/${todo.id}` as never); }} />
      </BottomSheet>

      {mode.kind === "memo" ? <MemoSheet todo={todo} onClose={close} /> : null}
      {mode.kind === "date" ? (
        <DatePickSheet
          title={mode.action === "copy" ? "다른 날 또 하기" : "날짜 바꾸기"}
          initial={todo.date}
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

function MemoSheet({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const [memo, setMemo] = useState(todo.memo);
  const [priv, setPriv] = useState(todo.memoIsPrivate);
  const save = () => {
    updateTodo(todo.id, { memo: memo.trim(), memoIsPrivate: priv });
    onClose();
  };
  return (
    <BottomSheet visible onClose={save} title={todo.title} right={{ label: "완료", onPress: save }}>
      <MemoInput value={memo} onChangeText={setMemo} placeholder="메모를 남겨 보세요" />
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
