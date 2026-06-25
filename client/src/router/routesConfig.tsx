import { type ReactNode } from "react"
import { Navigate, type RouteObject } from "react-router-dom"

import { useAuth } from "../context/AuthContext"
import { AppLayout } from "../layout/AppLayout"
import { AuthLayout } from "../layout/AuthLayout"
import ErrorBountry from "../pages/ErrorBountry"
import { ProtectedRoute } from "../pages/ProtectedRoute"
import * as Pages from "./pages"
import { withSuspense } from "./withSuspense"

const HomeRedirect = () => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/dashboard" replace />
}

const RedirectIfAuthenticated = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export const routesConfig: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorBountry />,
    children: [
      {
        element: <AppLayout />,
        errorElement: <ErrorBountry />,
        children: [
          { index: true, element: <HomeRedirect /> },
          {
            path: "/dashboard",
            element: withSuspense(Pages.Dashboard),
          },
          {
            path: "/approvals",
            element: withSuspense(Pages.Approvals),
          },
          {
            path: "/fulfillment",
            element: withSuspense(Pages.Fulfillment),
          },
          {
            path: "/allocations",
            element: withSuspense(Pages.Allocations),
          },
          {
            path: "/info-page/:id",
            element: withSuspense(Pages.InfoPage),
          },
        ],
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        path: "/login",
        element: (
          <RedirectIfAuthenticated>
            {withSuspense(Pages.LoginPage)}
          </RedirectIfAuthenticated>
        ),
      },
    ],
  },
]
