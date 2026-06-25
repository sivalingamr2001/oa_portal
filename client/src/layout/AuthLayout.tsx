import { Outlet } from "react-router-dom"
import { Flex } from "antd"

export const AuthLayout = () => {
  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.02)", // Matches tailwind bg-muted/40 roughly
      }}
      className="p-7 md:p-8" // Kept for responsive padding
    >
      <div 
        style={{ width: "100%" }} 
        className="max-w-sm md:max-w-md" // Kept for responsive max-width
      >
        <Outlet />
      </div>
    </Flex>
  )
}
