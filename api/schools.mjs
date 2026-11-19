import {schoolHandler} from '../lib/neis.mjs';
// Vercel Web Standard Function entry point.
export default { fetch(request) { return schoolHandler(request); } };
