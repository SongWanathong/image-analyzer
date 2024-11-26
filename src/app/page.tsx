import ImageAnalyzer from "@/components/ImageAnalyzer";

export default function Home() {
	return (
		<main className="min-h-screen p-8">
			<div className="max-w-7xl mx-auto space-y-8">
				<div className="bg-white rounded-lg shadow-lg p-8">
					<ImageAnalyzer />
				</div>
			</div>
		</main>
	);
}
