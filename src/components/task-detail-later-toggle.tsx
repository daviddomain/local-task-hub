'use client';

import * as React from 'react';

import { Toggle } from '@/components/ui/toggle';

type TaskDetailLaterToggleProps = {
	defaultPressed: boolean;
};

export function TaskDetailLaterToggle({
	defaultPressed
}: TaskDetailLaterToggleProps) {
	const [pressed, setPressed] = React.useState(defaultPressed);

	React.useEffect(() => {
		setPressed(defaultPressed);
	}, [defaultPressed]);

	return (
		<div className='flex items-end'>
			<input
				type='hidden'
				name={pressed ? 'detailLater' : undefined}
				value='on'
			/>
			<Toggle
				type='button'
				pressed={pressed}
				onPressedChange={setPressed}
				variant='outline'
				aria-label='Later'
				className='h-9 justify-start rounded-md px-3 cursor-pointer data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'>
				Later
			</Toggle>
		</div>
	);
}
