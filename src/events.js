import mitt from "mitt";

const events = mitt();

const GLOBAL_RECALC_BOUNDING = "global_recalc_bounding";

export { GLOBAL_RECALC_BOUNDING };

export default events;
