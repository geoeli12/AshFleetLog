import { makeEntityRouter } from "./entityRouter.js";

// Collection key maps to db.js COLLECTIONS.daily_orders
export default makeEntityRouter({ collectionKey: "daily_orders" });
