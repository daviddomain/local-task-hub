import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type CreateTaskAction = (formData: FormData) => Promise<void>;

type QuickAddDialogContentProps = {
	closeHref: string;
	createTaskAction: CreateTaskAction;
};

export function QuickAddDialogContent({
	closeHref,
	createTaskAction
}: QuickAddDialogContentProps) {
	return (
		<>
			<DialogHeader className='border-b border-border px-6 py-5'>
				<DialogTitle>Quick add</DialogTitle>
				<DialogDescription>Only title is required.</DialogDescription>
			</DialogHeader>

			<div className='overflow-y-auto px-6 py-5'>
				<form
					action={createTaskAction}
					className='space-y-4'>
					<input
						type='hidden'
						name='returnTo'
						value={closeHref}
					/>

					<div className='space-y-1.5'>
						<label
							htmlFor='title'
							className='text-sm font-medium'>
							Title <span className='text-destructive'>*</span>
						</label>
						<Input
							id='title'
							name='title'
							required
							placeholder='Add task title'
						/>
					</div>

					<div className='space-y-1.5'>
						<label
							htmlFor='note'
							className='text-sm font-medium'>
							Note (optional)
						</label>
						<Textarea
							id='note'
							name='note'
							placeholder='Short markdown-friendly note'
							className='min-h-24'
						/>
					</div>

					<div className='space-y-1.5'>
						<label
							htmlFor='firstLink'
							className='text-sm font-medium'>
							First link (optional)
						</label>
						<Input
							id='firstLink'
							name='firstLink'
							type='url'
							placeholder='https://github.com/...'
						/>
					</div>

					<div className='space-y-1.5'>
						<label
							htmlFor='tags'
							className='text-sm font-medium'>
							First tags (optional)
						</label>
						<Input
							id='tags'
							name='tags'
							placeholder='bug, frontend, review'
						/>
					</div>

					<div className='space-y-1.5'>
						<label
							htmlFor='people'
							className='text-sm font-medium'>
							First person references (optional)
						</label>
						<Input
							id='people'
							name='people'
							placeholder='@anna, @max'
						/>
					</div>

					<label
						className='flex items-center gap-2 text-sm'
						htmlFor='startTrackingNow'>
						<Checkbox
							id='startTrackingNow'
							name='startTrackingNow'
						/>
						Start time tracking now
					</label>

					<Button
						type='submit'
						className='w-full'>
						<Plus
							aria-hidden='true'
							className='size-4'
						/>
						Create task
					</Button>
				</form>
			</div>
		</>
	);
}
