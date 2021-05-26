import mitt from "mitt";

const events = mitt();

export const GLOBAL_RECALC_BOUNDING = "global_recalc_bounding";

export default events;
