import { Toaster } from "@/components/ui/sonner"
import { ConsolePage } from "@/pages/ConsolePage"
import { HostPage } from "@/pages/HostPage"
import { Home } from "@/pages/Home"
import { RoomPage } from "@/pages/RoomPage"
import { ScreenPage } from "@/pages/ScreenPage"
import { useRoute } from "@/lib/router"

export default function App() {
  const route = useRoute()
  return (
    <>
      {route.page === "home" && <Home />}
      {route.page === "host" && <HostPage />}
      {route.page === "console" && <ConsolePage key={route.code} code={route.code} />}
      {route.page === "room" && <RoomPage key={route.code} code={route.code} />}
      {route.page === "screen" && <ScreenPage key={route.code} code={route.code} />}
      <Toaster position="top-center" theme="light" />
    </>
  )
}
