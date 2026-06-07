import { resolve } from "node:path"
import type { LoaderFunctionArgs } from "react-router"
import { searchDocs } from "../engine/search.js"

const docsDir = resolve(process.cwd(), "docs")

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const q = url.searchParams.get("q") ?? ""
  const results = searchDocs(docsDir, q)
  return Response.json(results)
}
