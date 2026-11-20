import { HomePager } from "../../features/home/HomePager";
import { HomeDash } from "../../features/today/HomeDash";
import { DESIGN_TRIAL } from "../../lib/variant";

// Home: the usual app's home with 보관함 as the page to its left; the design app's 홈 (summary and shortcuts)
export default DESIGN_TRIAL ? HomeDash : HomePager;
