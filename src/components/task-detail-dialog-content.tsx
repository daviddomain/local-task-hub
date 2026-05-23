import Link from 'next/link';
import { Download } from 'lucide-react';

import type { TaskDetail } from '@/lib/server/tasks';
import { SelectFormField } from '@/components/select-form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type UpdateTaskDetailAction = (
	taskId: number,
	formData: FormData
) => Promise<void>;

type TaskDetailDialogContentProps = {
	closeHref: string;
	detailReturnTo: string;
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

function getLinkDomainHint(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return null;
	}
}

function truncateLinkLabel(url: string, maxLength = 96) {
	if (url.length <= maxLength) {
		return url;
	}

	return `${url.slice(0, maxLength).trimEnd()}...`;
}

export function TaskDetailDialogContent({
	closeHref,
	detailReturnTo,
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

			<div className='overflow-y-auto px-6 py-5'>
				<form
					action={updateTaskDetailAction.bind(null, selectedTask.id)}
					className='space-y-4'>
					<input
						type='hidden'
						name='detailReturnTo'
						value={detailReturnTo}
					/>

					<div className='space-y-1.5'>
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
						<div className='space-y-1.5'>
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

						<div className='flex items-end'>
							<label className='flex items-center gap-2 text-sm'>
								<Checkbox
									id='detailLater'
									name='detailLater'
									defaultChecked={selectedTask.later}
								/>
								Later
							</label>
						</div>
					</div>

					<div className='space-y-1.5'>
						<label
							htmlFor='detailNote'
							className='text-sm font-medium'>
							Note (markdown text)
						</label>
						<Textarea
							id='detailNote'
							name='detailNote'
							defaultValue={selectedTask.note ?? ''}
							className='min-h-28'
						/>
						{selectedTask.note ?
							<pre className='max-h-24 overflow-auto rounded-md border border-border bg-muted/20 p-2 text-xs text-muted-foreground'>
								{selectedTask.note}
							</pre>
						:	null}
					</div>

					<div className='space-y-1.5'>
						<label
							htmlFor='detailLinks'
							className='text-sm font-medium'>
							Links (one URL per line)
						</label>
						<Textarea
							id='detailLinks'
							name='detailLinks'
							defaultValue={selectedTask.links.join('\n')}
							className='min-h-24'
						/>
						{selectedTask.links.length > 0 ?
							<ul
								className='space-y-1 rounded-md border border-border bg-muted/20 p-2 text-sm'
								aria-label='Attached links'>
								{selectedTask.links.map((link) => {
									const domainHint = getLinkDomainHint(link);

									return (
										<li
											key={link}
											className='flex items-center justify-between gap-3'>
											<a
												href={link}
												target='_blank'
												rel='noreferrer noopener'
												className='truncate text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
												{truncateLinkLabel(link)}
											</a>
											{domainHint ?
												<span className='shrink-0 text-xs text-muted-foreground'>
													{domainHint}
												</span>
											:	null}
										</li>
									);
								})}
							</ul>
						:	null}
					</div>

					<div className='space-y-1.5'>
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

					<div className='space-y-1.5'>
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
						<div className='space-y-1.5'>
							<p className='text-sm font-medium'>Time sessions</p>
							<p className='text-xs text-muted-foreground'>
								Edit each session directly using ISO date-time values.
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
												<Input
													id={'detailTimeSessionStartedAt-' + index}
													name={'detailTimeSessionStartedAt_' + index}
													defaultValue={session.startedAt.toISOString()}
													className='font-mono text-xs'
													required
												/>
											</div>
											<div className='space-y-1'>
												<label
													htmlFor={'detailTimeSessionEndedAt-' + index}
													className='text-xs font-medium text-muted-foreground'>
													Ended at
												</label>
												<Input
													id={'detailTimeSessionEndedAt-' + index}
													name={'detailTimeSessionEndedAt_' + index}
													defaultValue={
														session.endedAt ? session.endedAt.toISOString() : ''
													}
													className='font-mono text-xs'
												/>
											</div>
											<div className='space-y-1'>
												<label
													htmlFor={'detailTimeSessionDuration-' + index}
													className='text-xs font-medium text-muted-foreground'>
													Duration (seconds)
												</label>
												<Input
													id={'detailTimeSessionDuration-' + index}
													name={'detailTimeSessionDuration_' + index}
													defaultValue={session.durationSeconds ?? ''}
													className='font-mono text-xs'
													inputMode='numeric'
												/>
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
				</form>
			</div>
		</>
	);
}
