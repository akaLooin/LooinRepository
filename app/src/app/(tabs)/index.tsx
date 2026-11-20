import { HomePager } from "../../features/home/HomePager";
import { TodayScreen } from "../../features/today/TodayScreen";
import { DESIGN_TRIAL } from "../../lib/variant";

// Home: the usual app's home with 보관함 as the page to its left; the design app's 오늘 (agenda)
export default DESIGN_TRIAL ? TodayScreen : HomePager;
