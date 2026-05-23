'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';

type UrlDialogProps = {
	children: ReactNode;
	closeHref: string;
	contentClassName?: string;
	contentId?: string;
	open: boolean;
};

export function UrlDialog({
	children,
	closeHref,
	contentClassName,
	contentId,
	open
}: UrlDialogProps) {
	const router = useRouter();

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					router.push(closeHref);
				}
			}}>
			<DialogContent
				id={contentId}
				className={contentClassName}>
				{children}
			</DialogContent>
		</Dialog>
	);
}
