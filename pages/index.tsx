import dynamic from 'next/dynamic'
import Head from 'next/head'
const Editor = dynamic(() => import('../components/Editor'), { ssr: false })

export default function Home() {
	return (
		<>
			<Head>
				<title>tldraw Next.js example</title>
				<meta
					name="description"
					content="An example of how to use tldraw in a Next.js app"
				/>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<main>
				<Editor />
			</main>
		</>
	)
}
