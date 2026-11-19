import {mealHandler} from '../lib/neis.mjs';
// Vercel Web Standard Function entry point.
export default { fetch(request) { return mealHandler(request); } };
