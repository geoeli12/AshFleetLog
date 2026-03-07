import { makeEntityRouter } from "./entityRouter.js";

// Collection key maps to db.js COLLECTIONS.pickup_orders
export default makeEntityRouter({ collectionKey: "pickup_orders" });
