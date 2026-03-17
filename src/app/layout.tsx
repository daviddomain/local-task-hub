import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';

const roboto = Roboto({
	weight: '400',
	subsets: ['latin'],
	display: 'swap'
});

export const metadata: Metadata = {
	title: 'Local Task Hub',
	description: 'Local Task Hub desktop workspace'
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang='de'
			className={`${roboto.className} dark`}>
			<body>{children}</body>
		</html>
	);
}
