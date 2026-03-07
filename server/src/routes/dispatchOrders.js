import { makeEntityRouter } from "./entityRouter.js";

// Collection key maps to db.js COLLECTIONS.dispatch_orders
export default makeEntityRouter({ collectionKey: "dispatch_orders" });
