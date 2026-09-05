import Link from 'next/link';
import { Download } from 'lucide-react';

import type { TaskDetail } from '@/lib/server/tasks';
import { TaskDetailForm, type TaskDetailSaveAction } from '@/components/task-detail-form';
import { TaskDateTimePicker } from '@/components/task-date-time-picker';
import { TaskDetailLaterToggle } from '@/components/task-detail-later-toggle';
import { TaskDetailLinksEditor } from '@/components/task-detail-links-editor';
import { MarkdownEditor } from '@/components/markdown-editor';
import { SelectFormField } from '@/components/select-form-field';
import { Button } from '@/components/ui/button';
import {
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDuration } from '@/components/task-display-helpers';

type UpdateTaskDetailAction = (
	taskId: number,
	...args: Parameters<TaskDetailSaveAction>
) => ReturnType<TaskDetailSaveAction>;

type TaskDetailDialogContentProps = {
	closeHref: string;
	selectedTask: TaskDetail;
	statusOptions: readonly string[];
	updateTaskDetailAction: UpdateTaskDetailAction;
};

function formatTimestamp(value: Date) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(value);
}

function getTimeSessionDurationLabel(startedAt: Date, endedAt: Date | null) {
	if (!endedAt) {
		return 'Running';
	}

	const derivedSeconds = Math.max(
		0,
		Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
	);

	return formatDuration(derivedSeconds);
}

export function TaskDetailDialogContent({
	closeHref,
	selectedTask,
	statusOptions,
	updateTaskDetailAction
}: TaskDetailDialogContentProps) {
	return (
		<>
			<DialogHeader className='border-b border-border px-6 py-5'>
				<DialogTitle>Task detail</DialogTitle>
				<DialogDescription>
					Phase 1 task payload fields are editable and persisted in MySQL.
				</DialogDescription>
			</DialogHeader>

			<div className='overflow-y-auto px-6 py-5 max-h-[75svh]'>
				<TaskDetailForm
					key={selectedTask.id}
					action={updateTaskDetailAction.bind(null, selectedTask.id)}>

					<div>
						<label
							htmlFor='detailTitle'
							className='text-sm font-medium'>
							Title
						</label>
						<Input
							id='detailTitle'
							name='detailTitle'
							defaultValue={selectedTask.title}
							required
						/>
					</div>

					<div className='grid gap-3 sm:grid-cols-2'>
						<div>
							<label
								htmlFor='detailStatus'
								className='text-sm font-medium'>
								Status
							</label>
							<SelectFormField
								id='detailStatus'
								name='detailStatus'
								ariaLabel='Status'
								value={selectedTask.status}
								placeholder='Status'
								triggerClassName='w-full rounded-md'
								options={statusOptions.map((statusOption) => ({
									value: statusOption,
									label: statusOption
								}))}
							/>
						</div>

						<TaskDetailLaterToggle defaultPressed={selectedTask.later} />
					</div>

					<div>
						<label
							htmlFor='detailNote'
							className='text-sm font-medium'>
							Note (markdown text)
						</label>
						<MarkdownEditor
							id='detailNote'
							name='detailNote'
							defaultValue={selectedTask.note ?? ''}
						/>
					</div>

					<TaskDetailLinksEditor defaultLinks={selectedTask.links} />

					<div>
						<label
							htmlFor='detailTags'
							className='text-sm font-medium'>
							Tags (comma-separated)
						</label>
						<Input
							id='detailTags'
							name='detailTags'
							defaultValue={selectedTask.tags.join(', ')}
						/>
					</div>

					<div>
						<label
							htmlFor='detailPeople'
							className='text-sm font-medium'>
							Person references (comma-separated)
						</label>
						<Input
							id='detailPeople'
							name='detailPeople'
							defaultValue={selectedTask.people.join(', ')}
						/>
					</div>

					<div className='space-y-2'>
						<div>
							<p className='text-sm font-medium'>Time sessions</p>
							<p className='text-xs text-muted-foreground'>
								Edit start and end times with quarter-hour local fields.
							</p>
						</div>
						<input
							type='hidden'
							name='detailTimeSessionCount'
							value={selectedTask.timeSessions.length}
						/>
						{selectedTask.timeSessions.length > 0 ?
							<ul
								className='space-y-2'
								aria-label='Time sessions'>
								{selectedTask.timeSessions.map((session, index) => (
									<li
										key={session.id}
										className='rounded-md border border-border bg-muted/20 p-3'
										data-testid='time-session-row'>
										<div className='grid gap-2 sm:grid-cols-3'>
											<div className='space-y-1'>
												<label
													htmlFor={'detailTimeSessionStartedAt-' + index}
													className='text-xs font-medium text-muted-foreground'>
													Started at
												</label>
												<TaskDateTimePicker
													id={'detailTimeSessionStartedAt-' + index}
													name={'detailTimeSessionStartedAt_' + index}
													defaultValue={session.startedAt}
													placeholder='Select start'
													required
												/>
											</div>
											<div className='space-y-1'>
												<label
													htmlFor={'detailTimeSessionEndedAt-' + index}
													className='text-xs font-medium text-muted-foreground'>
													Ended at
												</label>
												<TaskDateTimePicker
													id={'detailTimeSessionEndedAt-' + index}
													name={'detailTimeSessionEndedAt_' + index}
													defaultValue={
														session.endedAt ? session.endedAt : null
													}
													placeholder='Select end'
												/>
											</div>
											<div className='space-y-3'>
												<p className='text-xs font-medium text-muted-foreground'>
													Duration
												</p>
												<p
													className='rounded-md border border-border bg-background px-3 py-2 text-xs'
													data-testid='time-session-duration'>
													{getTimeSessionDurationLabel(
														session.startedAt,
														session.endedAt
													)}
												</p>
											</div>
										</div>
										<div className='mt-2'>
											<label
												htmlFor={'detailTimeSessionRemove-' + index}
												className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
												<input
													id={'detailTimeSessionRemove-' + index}
													type='checkbox'
													name={'detailTimeSessionRemove_' + index}
													value='1'
													className='size-4 rounded border-border align-middle'
												/>
												Remove this session on save
											</label>
										</div>
									</li>
								))}
							</ul>
						:	<p className='rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground'>
								No time sessions yet.
							</p>
						}
					</div>

					<dl className='space-y-1 rounded-md border border-border bg-muted/20 p-3 text-xs'>
						<div className='flex justify-between gap-3'>
							<dt className='text-muted-foreground'>Created</dt>
							<dd>
								<time dateTime={selectedTask.createdAt.toISOString()}>
									{formatTimestamp(selectedTask.createdAt)}
								</time>
							</dd>
						</div>
						<div className='flex justify-between gap-3'>
							<dt className='text-muted-foreground'>Updated</dt>
							<dd>
								<time dateTime={selectedTask.updatedAt.toISOString()}>
									{formatTimestamp(selectedTask.updatedAt)}
								</time>
							</dd>
						</div>
					</dl>

					<div className='flex flex-wrap gap-2'>
						<Button
							type='submit'
							className='flex-1'>
							Save detail
						</Button>
						<Button
							asChild
							type='button'
							variant='outline'>
							<a href={`/api/exports/task/${selectedTask.id}/markdown`}>
								<Download
									aria-hidden='true'
									className='size-4'
								/>
								Export markdown
							</a>
						</Button>
						{selectedTask.status === 'done' ?
							<Button
								type='submit'
								name='detailStatusTransition'
								value='reopen'
								variant='secondary'>
								Reopen task
							</Button>
						:	<Button
								type='submit'
								name='detailStatusTransition'
								value='done'
								variant='secondary'>
								Mark done
							</Button>
						}
						<Button
							asChild
							type='button'
							variant='outline'>
							<Link href={closeHref}>Close</Link>
						</Button>
					</div>
				</TaskDetailForm>
			</div>
		</>
	);
}
