import { createContext, useContext } from "react";
import type { PanResponderInstance } from "react-native";

/** The home/보관함 pager (HomePager), shared with the two screens inside it. */
export type Pager = {
  /** 0 = 보관함, 1 = home */
  open: (page: 0 | 1) => void;
  /** gesture handlers for the area that may be swiped: +1 = drag right (to 보관함), -1 = drag left (back home) */
  swipe: (direction: 1 | -1) => PanResponderInstance["panHandlers"];
  /** true right after a page swipe: a swipe that started on a row must not also open that row */
  justSwiped: () => boolean;
};

export const PagerContext = createContext<Pager | null>(null);
/** Null outside the pager (e.g. /inbox opened on its own). */
export const usePager = () => useContext(PagerContext);
