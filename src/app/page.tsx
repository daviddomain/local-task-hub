import { Plus, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"

const FILTER_CHIPS = ["Status", "Later", "Person", "Tags", "Time", "Source"]

export default function Home() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-6 py-8 lg:px-10">
      <main className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="space-y-6" aria-label="Task workspace">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl tracking-tight">Local Task Hub</CardTitle>
              <CardDescription>
                Desktop-first task workspace. Search, filter, and list behavior will be connected in
                later issues.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <label htmlFor="task-search" className="text-sm font-medium">
                    Search tasks
                  </label>
                  <div className="relative">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="task-search"
                      type="search"
                      placeholder="Search title, notes, tags, people, or links"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button type="button" className="w-full lg:w-auto">
                    <Plus aria-hidden="true" className="size-4" />
                    Create task
                  </Button>
                </div>
              </div>

              <fieldset className="space-y-2" aria-label="Task filters">
                <legend className="text-sm font-medium">Filters</legend>
                <div className="flex flex-wrap gap-2">
                  {FILTER_CHIPS.map((filterChip) => (
                    <Badge key={filterChip} variant="outline" className="px-3 py-1">
                      {filterChip}
                    </Badge>
                  ))}
                </div>
              </fieldset>
            </CardContent>
          </Card>

          <Card className="min-h-[420px]">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base tracking-tight">Task list</CardTitle>
              <CardDescription>
                This is the central region where tasks will appear once data integration is added.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-[300px] items-center">
              <Empty className="border border-dashed border-border bg-muted/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Search className="size-5" aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No tasks yet</EmptyTitle>
                  <EmptyDescription>
                    Start by creating your first task. When tasks exist, this list will show your
                    latest work here.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button type="button" variant="secondary">
                    <Plus aria-hidden="true" className="size-4" />
                    Create your first task
                  </Button>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        </section>

        <aside aria-label="Workspace notes">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base tracking-tight">Ready for integration</CardTitle>
              <CardDescription>
                Shell-only layout for now. Search, filters, and list results are intentionally
                structural in this issue.
              </CardDescription>
            </CardHeader>
          </Card>
        </aside>
      </main>
    </div>
  )
}
