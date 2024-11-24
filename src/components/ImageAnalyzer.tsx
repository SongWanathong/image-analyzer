"use client";

import { useState, useRef } from "react";

interface Analysis {
	title: string;
	description: string;
	keywords: string;
}

export default function ImageAnalyzer() {
	const [imageUrl, setImageUrl] = useState<string>("");
	const [analysis, setAnalysis] = useState<Analysis | null>(null);
	const [loading, setLoading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Create local preview URL
		const localUrl = URL.createObjectURL(file);
		setImageUrl(localUrl);

		try {
			setLoading(true);

			// Convert file to base64
			const base64 = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => {
					const base64String = reader.result as string;
					resolve(base64String);
				};
				reader.readAsDataURL(file);
			});

			const response = await fetch("/api/analyze", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ imageUrl: base64 }),
			});

			if (!response.ok) {
				throw new Error("Analysis failed");
			}

			const data = await response.json();
			setAnalysis(data);
		} catch (error) {
			console.error("Error:", error);
			alert("Failed to analyze image");
		} finally {
			setLoading(false);
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<h2 className="text-xl font-semibold">Upload Image</h2>
				<div>
					<input
						type="file"
						ref={fileInputRef}
						onChange={handleFileChange}
						accept="image/*"
						className="hidden"
					/>
					<button
						type="button"
						onClick={handleUploadClick}
						className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
					>
						Select Image
					</button>
				</div>
			</div>

			{imageUrl && (
				<div className="space-y-4">
					<img
						src={imageUrl}
						alt="Selected content for analysis"
						className="max-w-full h-auto rounded-lg shadow-md"
					/>
				</div>
			)}

			{loading && (
				<div className="text-center">
					<p className="text-gray-600">Analyzing content...</p>
				</div>
			)}

			{analysis && (
				<div className="space-y-4 bg-gray-50 p-4 rounded-lg">
					<div>
						<h3 className="font-semibold">Title:</h3>
						<p>{analysis.title}</p>
					</div>
					<div>
						<h3 className="font-semibold">Description:</h3>
						<p>{analysis.description}</p>
					</div>
					<div>
						<h3 className="font-semibold">Keywords:</h3>
						<p>{analysis.keywords}</p>
					</div>
				</div>
			)}
		</div>
	);
}
