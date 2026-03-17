import { revalidatePath } from "next/cache"
import { Plus, Search } from "lucide-react"

import { createTask, listTasks, type Task, type TaskSourceType } from "@/lib/server/tasks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

const FILTER_CHIPS = ["Status", "Later", "Person", "Tags", "Time", "Source"]

const SOURCE_LABELS: Record<TaskSourceType, string> = {
  jira: "Jira",
  gitlab: "GitLab",
  github: "GitHub",
  confluence: "Confluence",
  other: "Other",
}

async function createTaskAction(formData: FormData) {
  "use server"

  const title = String(formData.get("title") ?? "")
  const note = String(formData.get("note") ?? "")
  const firstLink = String(formData.get("firstLink") ?? "")
  const tagsRaw = String(formData.get("tags") ?? "")
  const peopleRaw = String(formData.get("people") ?? "")
  const startTrackingNow = formData.get("startTrackingNow") === "on"

  const tags = tagsRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  const people = peopleRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  await createTask({
    title,
    note,
    firstLink,
    tags,
    people,
    startTrackingNow,
  })

  revalidatePath("/")
}

function truncateNote(note: string, maxLength = 140) {
  if (note.length <= maxLength) {
    return note
  }

  return `${note.slice(0, maxLength).trimEnd()}…`
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return "0m"
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

function getSourceBadgeLabel(task: Task) {
  if (!task.firstLink) {
    return "Local"
  }

  if (!task.firstLinkSourceType) {
    return SOURCE_LABELS.other
  }

  return SOURCE_LABELS[task.firstLinkSourceType]
}

function getTimeSummary(task: Task) {
  if (task.timerStartedAt) {
    return "running now"
  }

  if (task.todayTrackedSeconds > 0) {
    return `${formatDuration(task.todayTrackedSeconds)} today`
  }

  if (task.totalTrackedSeconds > 0) {
    return `${formatDuration(task.totalTrackedSeconds)} total`
  }

  return "no time"
}

export default async function Home() {
  const tasks = await listTasks()

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-6 py-8 lg:px-10">
      <main className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6" aria-label="Task workspace">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl tracking-tight">Local Task Hub</CardTitle>
              <CardDescription>
                Desktop-first task workspace. Search and filters are visible shell controls in this
                issue.
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
                  <Button asChild className="w-full lg:w-auto">
                    <a href="#quick-add">
                      <Plus aria-hidden="true" className="size-4" />
                      Create task
                    </a>
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
                Central task list region. Rendering is active; search/filter behavior will be wired in
                later issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <Empty className="border border-dashed border-border bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Search className="size-5" aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No tasks yet</EmptyTitle>
                    <EmptyDescription>
                      Create your first task from the Quick Add panel on the right to start your list.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild type="button" variant="secondary">
                      <a href="#quick-add">
                        <Plus aria-hidden="true" className="size-4" />
                        Open quick add
                      </a>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <ul className="space-y-3">
                  {tasks.map((task) => (
                    <li key={task.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{task.title}</p>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getSourceBadgeLabel(task)}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {task.later ? (
                          <Badge variant="outline" className="text-xs">
                            later
                          </Badge>
                        ) : null}

                        {task.tags.map((tag) => (
                          <Badge key={`${task.id}-tag-${tag}`} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}

                        {task.people.map((person) => (
                          <Badge
                            key={`${task.id}-person-${person}`}
                            variant="outline"
                            className="text-xs"
                          >
                            {person}
                          </Badge>
                        ))}
                      </div>

                      {task.note ? (
                        <p className="mt-2 text-sm text-muted-foreground">{truncateNote(task.note)}</p>
                      ) : null}

                      <p className="mt-2 text-xs text-muted-foreground">Time: {getTimeSummary(task)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <aside id="quick-add" aria-label="Quick add" className="lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base tracking-tight">Quick add</CardTitle>
              <CardDescription>Only title is required.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createTaskAction} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="title" className="text-sm font-medium">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <Input id="title" name="title" required placeholder="Add task title" />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="note" className="text-sm font-medium">
                    Note (optional)
                  </label>
                  <Textarea
                    id="note"
                    name="note"
                    placeholder="Short markdown-friendly note"
                    className="min-h-24"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="firstLink" className="text-sm font-medium">
                    First link (optional)
                  </label>
                  <Input
                    id="firstLink"
                    name="firstLink"
                    type="url"
                    placeholder="https://github.com/..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tags" className="text-sm font-medium">
                    First tags (optional)
                  </label>
                  <Input id="tags" name="tags" placeholder="bug, frontend, review" />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="people" className="text-sm font-medium">
                    First person references (optional)
                  </label>
                  <Input id="people" name="people" placeholder="@anna, @max" />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox id="startTrackingNow" name="startTrackingNow" />
                  Start time tracking now
                </label>

                <Button type="submit" className="w-full">
                  Create task
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}
