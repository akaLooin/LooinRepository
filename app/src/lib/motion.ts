import { LayoutAnimation } from "react-native";

/**
 * Lets the next layout change glide instead of jump: rows that appear fade in, rows below slide to their new place.
 * Call it right before a change that adds, removes, folds or reorders rows. Runs on the UI thread, so it stays
 * smooth even while JavaScript is busy. Does nothing on the web.
 */
export function smoothLayout(duration = 220) {
  LayoutAnimation.configureNext({
    duration,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
}
