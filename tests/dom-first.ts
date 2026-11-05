/* Load-order guard for the forbidden-word tests: some UI libraries decide at import time whether a DOM exists
 * (e.g. layout effects become no-ops without `document`). Importing this FIRST makes the DOM exist before any
 * component module loads, so a later mounted test in the same run (r41) can open hover popovers. */
import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register({ url: 'http://localhost:8080/ps?demo=1' });
