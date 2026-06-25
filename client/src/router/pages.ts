import { lazy } from "react"

export const LoginPage = lazy(() =>
  import("../pages/LoginPage").then((m) => ({ default: m.LoginPage }))
)
export const Allocations = lazy(() =>
  import("../pages/Allocations").then((m) => ({ default: m.Allocations }))
)
export const Dashboard = lazy(() =>
  import("../pages/Dashboard").then((m) => ({ default: m.Dashboard }))
)
export const Approvals = lazy(() =>
  import("../pages/Approvals").then((m) => ({ default: m.Approvals }))
)
export const Fulfillment = lazy(() =>
  import("../pages/Fulfillment").then((m) => ({ default: m.Fulfillment }))
)
export const InfoPage = lazy(() =>
  import("../pages/InfoPage").then((m) => ({ default: m.InfoPage }))
)
