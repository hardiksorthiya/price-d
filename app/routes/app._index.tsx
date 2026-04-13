import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const themeEditorUrl = `https://${session.shop}/admin/themes/current/editor?context=apps&template=product`;
  return { themeEditorUrl };
};

export default function Index() {
  const { themeEditorUrl } = useLoaderData<typeof loader>();
  const resolvedThemeEditorUrl = themeEditorUrl || "/app";

  return (
    <div className="container-fluid app-page-container">
      <div className="app-page-header app-page-header-bar">
        <h2 className="app-page-title">Get Started with Price Breakup</h2>
        <div className="d-flex flex-wrap gap-2">
          <a className="btn btn-primary" href="/app/plans">
            Choose plan
          </a>
          <a className="btn btn-outline-secondary" href={resolvedThemeEditorUrl} target="_top">
            Open Theme Editor
          </a>
        </div>
      </div>

      <div className="card shadow-sm app-main-card mb-3">
        <div className="card-body">
          <p className="mb-0 app-muted-text">
            Follow these steps to install and show live price breakup on your product pages.
          </p>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6 col-xxl-3">
          <div className="card h-100 shadow-sm app-side-card">
            <div className="card-body">
              <h5 className="app-section-title">1) Select Plan</h5>
              <p className="app-muted-text small">
                Go to Plans page and activate Basic, Advanced, or Premium for live stores.
              </p>
              <a className="btn btn-outline-secondary btn-sm" href="/app/plans">
                Go to Plans
              </a>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6 col-xxl-3">
          <div className="card h-100 shadow-sm app-side-card">
            <div className="card-body">
              <h5 className="app-section-title">2) Configure Rates</h5>
              <p className="app-muted-text small">
                Set gold, silver, platinum, diamond ranges and tax in Price distribution.
              </p>
              <a className="btn btn-outline-secondary btn-sm" href="/app/pricing">
                Open Price Distribution
              </a>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6 col-xxl-3">
          <div className="card h-100 shadow-sm app-side-card">
            <div className="card-body">
              <h5 className="app-section-title">3) Set Product Pricing</h5>
              <p className="app-muted-text small">
                Fill weights/making charge per product and click Save product prices.
              </p>
              <a className="btn btn-outline-secondary btn-sm" href="/app/product-pricing">
                Open Product Price
              </a>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6 col-xxl-3">
          <div className="card h-100 shadow-sm app-side-card">
            <div className="card-body">
              <h5 className="app-section-title">4) Add Block in Product Page</h5>
              <p className="app-muted-text small">
                In Theme Customize, add Apps block <strong>Price Breakup</strong> on product template.
              </p>
              <a
                className="btn btn-outline-secondary btn-sm"
                href={resolvedThemeEditorUrl}
                target="_top"
              >
                Add App Block
              </a>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
