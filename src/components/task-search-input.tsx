"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

export function TaskSearchInput() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlQueryValue = searchParams.get("q") ?? ""
  const [value, setValue] = useState(urlQueryValue)

  useEffect(() => {
    setValue(urlQueryValue)
  }, [urlQueryValue])

  function handleChange(nextValue: string) {
    setValue(nextValue)

    const nextParams = new URLSearchParams(searchParams.toString())
    if (nextValue.trim()) {
      nextParams.set("q", nextValue.trim())
    } else {
      nextParams.delete("q")
    }

    nextParams.delete("taskId")

    const query = nextParams.toString()
    const nextUrl = query ? `${pathname}?${query}` : pathname
    window.location.assign(nextUrl)
  }

  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="task-search"
        type="search"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Search title, notes, tags, people, or links"
        className="pl-9"
      />
    </div>
  )
}
