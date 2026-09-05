'use client';

import {
	startTransition,
	useActionState,
	useLayoutEffect,
	useRef,
	useState,
	type ReactNode
} from 'react';

export type TaskDetailSaveState = {
	status: 'idle' | 'saved' | 'error';
	message: string;
};

export type TaskDetailSaveAction = (
	previousState: TaskDetailSaveState,
	formData: FormData
) => Promise<TaskDetailSaveState>;

export function TaskDetailForm({
	action,
	children
}: {
	action: TaskDetailSaveAction;
	children: ReactNode;
}) {
	const formRef = useRef<HTMLFormElement>(null);
	const submitting = useRef(false);
	const focusedControl = useRef<HTMLElement | null>(null);
	const [edited, setEdited] = useState(false);
	const [state, dispatch, pending] = useActionState<TaskDetailSaveState, FormData>(
		async (previousState, formData) => {
			try {
				return await action(previousState, formData);
			} catch {
				return {
					status: 'error',
					message: 'Could not confirm the save. Your inputs are preserved. Please try again.'
				};
			}
		},
		{ status: 'idle', message: '' }
	);

	useLayoutEffect(() => {
		if (pending || !submitting.current) return;
		submitting.current = false;
		// Only reset to the new server defaults after a successful save.
		if (state.status === 'saved') formRef.current?.reset();
		const control = focusedControl.current;
		if (control?.isConnected && (
			document.activeElement === document.body ||
			document.activeElement === formRef.current?.closest('[role="dialog"]')
		)) {
			control.focus({ preventScroll: true });
		}
		focusedControl.current = null;
	}, [pending, state]);

	return (
		<form
			ref={formRef}
			method='post'
			onChange={(event) => {
				// Radix also emits change events when server defaults are synchronized.
				if (event.nativeEvent.isTrusted) setEdited(true);
			}}
			onClickCapture={(event) => {
				const button = (event.target as HTMLElement).closest('button');
				if (button?.type === 'button') setEdited(true);
			}}
			onSubmit={(event) => {
				event.preventDefault();
				if (submitting.current) return;
				const submitter = (event.nativeEvent as SubmitEvent).submitter;
				const formData = new FormData(event.currentTarget, submitter);
				submitting.current = true;
				focusedControl.current = document.activeElement as HTMLElement | null;
				setEdited(false);
				// Explicit dispatch avoids React resetting uncontrolled inputs on errors.
				startTransition(() => dispatch(formData));
			}}>
			<fieldset disabled={pending} className='min-w-0 space-y-4'>
				{children}
			</fieldset>
			<div className='mt-2 min-h-5 text-sm'>
				<p role='status' aria-live='polite' className='text-muted-foreground'>
					{pending ? 'Saving…' : state.status === 'saved' && !edited ? state.message : ''}
				</p>
				{!pending && state.status === 'error' ?
					<p role='alert' className='text-destructive'>{state.message}</p>
				:	null}
			</div>
		</form>
	);
}
