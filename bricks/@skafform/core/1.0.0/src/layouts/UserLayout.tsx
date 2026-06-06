import { Outlet, redirect } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { getAdapter } from "../runtime.server"

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getAdapter().getSession(request)
  if (!user) return redirect("/login")
  return { user }
}

export default function UserLayout() {
  return <Outlet />
}
