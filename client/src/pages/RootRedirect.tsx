import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export const RootRedirect = () => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/dashboard" replace />
}
