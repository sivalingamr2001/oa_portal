import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { routesConfig } from "./routesConfig"

const router = createBrowserRouter(routesConfig, {
  basename: "/b3_portal",
})

export const Router = () => <RouterProvider router={router} />

export default Router
