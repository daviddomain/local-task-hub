import Link from 'next/link';

import type { TaskListFilters, TaskSourceType } from '@/lib/server/tasks';
import { SelectFormField } from '@/components/select-form-field';
import { SOURCE_LABELS } from '@/components/task-display-helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type TaskFiltersProps = {
	activeFilterLabels: string[];
	filters: TaskListFilters;
	peopleOptions: string[];
	statusOptions: readonly string[];
	tagOptions: string[];
};

const SOURCE_OPTIONS: Array<{ value: TaskSourceType; label: string }> = [
	{ value: 'jira', label: SOURCE_LABELS.jira },
	{ value: 'gitlab', label: SOURCE_LABELS.gitlab },
	{ value: 'github', label: SOURCE_LABELS.github },
	{ value: 'confluence', label: SOURCE_LABELS.confluence },
	{ value: 'other', label: SOURCE_LABELS.other }
];

export function TaskFilters({
	activeFilterLabels,
	filters,
	peopleOptions,
	statusOptions,
	tagOptions
}: TaskFiltersProps) {
	return (
		<fieldset
			className='space-y-3'
			aria-label='Task filters'>
			<legend className='text-sm font-medium'>Filters</legend>
			<form
				className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'
				method='get'>
				{filters.query ?
					<input
						type='hidden'
						name='q'
						value={filters.query}
					/>
				:	null}

				<div className='space-y-1'>
					<label
						htmlFor='status'
						className='text-xs text-muted-foreground'>
						Status
					</label>
					<SelectFormField
						id='status'
						name='status'
						value={filters.status ?? ''}
						placeholder='All statuses'
						options={[
							{ value: '', label: 'All statuses' },
							...statusOptions.map((statusOption) => ({
								value: statusOption,
								label: statusOption
							}))
						]}
					/>
				</div>

				<div className='space-y-1'>
					<label
						htmlFor='later'
						className='text-xs text-muted-foreground'>
						Later
					</label>
					<SelectFormField
						id='later'
						name='later'
						value={filters.later ?? ''}
						placeholder='Any'
						options={[
							{ value: '', label: 'Any' },
							{ value: 'only', label: 'Later only' },
							{ value: 'exclude', label: 'Exclude later' }
						]}
					/>
				</div>

				<div className='space-y-1'>
					<label
						htmlFor='person'
						className='text-xs text-muted-foreground'>
						Person
					</label>
					<SelectFormField
						id='person'
						name='person'
						value={filters.person ?? ''}
						placeholder='Any person'
						options={[
							{ value: '', label: 'Any person' },
							...peopleOptions.map((person) => ({
								value: person,
								label: person
							}))
						]}
					/>
				</div>

				<div className='space-y-1'>
					<label
						htmlFor='tag'
						className='text-xs text-muted-foreground'>
						Tag
					</label>
					<SelectFormField
						id='tag'
						name='tag'
						value={filters.tag ?? ''}
						placeholder='Any tag'
						options={[
							{ value: '', label: 'Any tag' },
							...tagOptions.map((tag) => ({
								value: tag,
								label: tag
							}))
						]}
					/>
				</div>

				<div className='space-y-1'>
					<label
						htmlFor='time'
						className='text-xs text-muted-foreground'>
						Time relation
					</label>
					<SelectFormField
						id='time'
						name='time'
						value={filters.timeRelation ?? ''}
						placeholder='Any time'
						options={[
							{ value: '', label: 'Any time' },
							{ value: 'today', label: 'Today' },
							{ value: 'this_week', label: 'This week' },
							{ value: 'no_time', label: 'No time' },
							{ value: 'recently_updated', label: 'Recently updated' }
						]}
					/>
				</div>

				<div className='space-y-1'>
					<label
						htmlFor='source'
						className='text-xs text-muted-foreground'>
						Source
					</label>
					<SelectFormField
						id='source'
						name='source'
						value={filters.source ?? ''}
						placeholder='Any source'
						options={[{ value: '', label: 'Any source' }, ...SOURCE_OPTIONS]}
					/>
				</div>

				<div className='sm:col-span-2 xl:col-span-3 flex items-center gap-2'>
					<Button
						type='submit'
						variant='secondary'>
						Apply filters
					</Button>
					<Button
						asChild
						type='button'
						variant='ghost'>
						<Link href='/'>Clear</Link>
					</Button>
				</div>
			</form>

			{activeFilterLabels.length > 0 ?
				<div
					className='flex flex-wrap gap-2'
					aria-label='Active filters'>
					{activeFilterLabels.map((label) => (
						<Badge
							key={label}
							variant='outline'
							className='px-3 py-1'>
							{label}
						</Badge>
					))}
				</div>
			:	null}
		</fieldset>
	);
}
