import { UploadButton } from "@uploadthing/react";
import { OurFileRouter } from "./api/uploadthing/core";
import ImageAnalyzer from "@/components/ImageAnalyzer";

export default function Home() {
	return (
		<main className="min-h-screen p-8">
			<div className="max-w-4xl mx-auto space-y-8">
				<h1 className="text-3xl font-bold text-center">AI Image Analyzer</h1>
				<div className="bg-white rounded-lg shadow-lg p-8">
					<ImageAnalyzer />
				</div>
			</div>
		</main>
	);
}
