import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

export { loader, action } from "../features/product-pricing/server";
export { default } from "../features/product-pricing/ProductPricingPage";

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
