import Logo from "@/assets/jana.png"
import { useState, useEffect } from "react"

export default Logo

export const ENV_CONFIG = {
  BASE_API_URL: import.meta.env.DEV
    ? import.meta.env.VITE_BASE_API_URL
    : "/b3_portal/api",
}

export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
