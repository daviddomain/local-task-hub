import { revalidatePath } from "next/cache"

import { createTask, listTasks } from "@/lib/server/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

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

export default async function Home() {
  const tasks = await listTasks()

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10">
      <main className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h1 className="text-xl font-semibold tracking-tight">Local Task Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick add: only title is required.
          </p>

          <form action={createTaskAction} className="mt-5 space-y-4">
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
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold tracking-tight">Tasks</h2>
          {tasks.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No tasks yet. Create your first one from the form.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {tasks.map((task) => (
                <li key={task.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{task.title}</p>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {task.status}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {task.later ? <span>later</span> : null}
                    {task.timerStartedAt ? <span>running now</span> : null}
                  </div>

                  {task.note ? <p className="mt-2 text-sm text-muted-foreground">{task.note}</p> : null}

                  {task.firstLink ? (
                    <p className="mt-2 text-xs text-muted-foreground">Link: {task.firstLink}</p>
                  ) : null}

                  {task.tags.length > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Tags: {task.tags.join(", ")}</p>
                  ) : null}

                  {task.people.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      People: {task.people.join(", ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
