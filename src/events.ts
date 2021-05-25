import mitt from "mitt";

const events = mitt();

const GLOBAL_RECALC_BOUNDING = "global_recalc_bounding";

function globalRecalcBoundings() {
  events.emit(GLOBAL_RECALC_BOUNDING);
}

export { GLOBAL_RECALC_BOUNDING, globalRecalcBoundings };

export default events;
