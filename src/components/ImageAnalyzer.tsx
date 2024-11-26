"use client";

import { useState, useRef } from "react";

interface Analysis {
	title: string;
	description: string;
	keywords: string;
	show: string;
	categoryId: string;
}

interface ImageAnalysis {
	imageUrl: string;
	analysis: Analysis | null;
	fileName?: string;
	folderPath?: string;
	category?: string;
}

export default function ImageAnalyzer() {
	const [images, setImages] = useState<ImageAnalysis[]>([]);
	const [loading, setLoading] = useState(false);
	const [dragActive, setDragActive] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const folderInputRef = useRef<HTMLInputElement>(null);

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const isImageFile = (file: File) => {
		return file.type.startsWith("image/");
	};

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		const items = Array.from(e.dataTransfer.items);
		const files: File[] = [];

		for (const item of items) {
			if (item.kind === "file") {
				const file = item.getAsFile();
				if (file && isImageFile(file)) {
					files.push(file);
				}
			}
		}

		if (files.length > 0) {
			await processFiles(files);
		}
	};

	const processFiles = async (files: File[]) => {
		setLoading(true);
		try {
			// First, prepare all files in parallel
			const filePromises = Array.from(files)
				.filter(isImageFile)
				.map(async (file) => {
					const localUrl = URL.createObjectURL(file);
					const base64 = await new Promise<string>((resolve, reject) => {
						const reader = new FileReader();
						reader.onloadend = () => {
							const base64String = reader.result as string;
							resolve(base64String);
						};
						reader.onerror = () =>
							reject(new Error(`Failed to read file: ${file.name}`));
						reader.readAsDataURL(file);
					});

					const pathParts = file.webkitRelativePath
						? file.webkitRelativePath.split("/")
						: [file.name];
					const fileName = pathParts.pop() || file.name;
					const folderPath =
						pathParts.length > 0 ? pathParts.join("/") : "Ungrouped";

					return { base64, localUrl, fileName, folderPath };
				});

			// Wait for all file preparations to complete
			const preparedFiles = await Promise.all(filePromises);

			// Process each file independently and update state as results come in
			// biome-ignore lint/complexity/noForEach: <explanation>
			preparedFiles.forEach((file) => {
				fetch("/api/analyze", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ imageUrl: file.base64 }),
				})
					.then((response) => {
						if (!response.ok) {
							throw new Error(`Failed to analyze image: ${file.fileName}`);
						}
						return response.json();
					})
					.then((analysisData) => {
						const newImage = {
							imageUrl: file.localUrl,
							analysis: analysisData,
							fileName: file.fileName,
							folderPath: file.folderPath,
							category: analysisData.categoryId,
						};

						// Update UI immediately when each analysis completes
						setImages((prev) => [...prev, newImage]);
						setLoading(false);
					})
					.catch((error) => {
						console.error("Error analyzing image:", error);
						setLoading(false);
					});
			});
		} catch (error) {
			console.error("Error:", error);
			alert("Failed to analyze one or more images");
		} finally {
			setLoading(false);
		}
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length > 0) {
			await processFiles(files);
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFolderUploadClick = () => {
		folderInputRef.current?.click();
	};

	const handleRemoveImage = (index: number) => {
		setImages((prev) => prev.filter((_, i) => i !== index));
	};

	const groupedImages = images.reduce(
		(acc, img) => {
			const key = img.folderPath || "Ungrouped";
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(img);
			return acc;
		},
		{} as Record<string, ImageAnalysis[]>,
	);

	const handleDownloadCSV = () => {
		// Prepare CSV header
		const headers = [
			"Filename",
			"Title",
			"Description",
			"Keywords",
			"Category",
		];
		const csvRows = [headers];

		// Convert all images data to CSV format
		// biome-ignore lint/complexity/noForEach: <explanation>
		Object.values(groupedImages).forEach((folderImages) => {
			// biome-ignore lint/complexity/noForEach: <explanation>
			folderImages.forEach((img) => {
				const row = [
					img.fileName || "",
					img.analysis?.title || "",
					img.analysis?.description || "",
					img.analysis?.keywords || "",
					String(img.analysis?.categoryId || ""),
				];
				csvRows.push(row);
			});
		});

		// Convert to CSV string
		const csvContent = csvRows
			.map((row) =>
				row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
			)
			.join("\n");

		// Create and trigger download
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`image-analysis-${new Date().toISOString().split("T")[0]}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-8">
			<div className="text-center space-y-4">
				<h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					Image Analysis Hub
				</h2>
				<p className="text-gray-600 max-w-2xl mx-auto">
					Upload your images or folders and let AI analyze them for you.
				</p>
			</div>

			<div
				className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ease-in-out
					${
						dragActive
							? "border-blue-500 bg-blue-50"
							: "border-gray-300 hover:border-gray-400 bg-gray-50"
					}`}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
			>
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleFileChange}
					accept="image/*"
					multiple
					className="hidden"
				/>
				<input
					type="file"
					ref={folderInputRef}
					onChange={handleFileChange}
					accept="image/*"
					multiple
					{...{
						webkitdirectory: "",
						directory: "",
					}}
					className="hidden"
				/>
				<div className="text-center space-y-4">
					<div className="mx-auto w-16 h-16 text-gray-400">
						{/* biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<div className="space-y-4">
						<div className="flex justify-center gap-4">
							<button
								type="button"
								onClick={handleUploadClick}
								className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transform transition hover:-translate-y-0.5"
								disabled={loading}
							>
								{/* biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
								<svg
									className="-ml-1 mr-3 h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								Select Images
							</button>
							<button
								type="button"
								onClick={handleFolderUploadClick}
								className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-lg transform transition hover:-translate-y-0.5"
								disabled={loading}
							>
								{/* biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
								<svg
									className="-ml-1 mr-3 h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
									/>
								</svg>
								Select Folder
							</button>
						</div>
					</div>
					<p className="text-sm text-gray-500">
						or drag and drop your images/folders here
					</p>
				</div>
			</div>

			{Object.entries(groupedImages).map(([folderPath, folderImages]) => (
				<div key={folderPath} className="space-y-4">
					<div className="flex justify-between items-center border-b pb-2">
						<h3 className="text-xl font-semibold text-gray-800">
							{folderPath}
						</h3>
						<button
							onClick={handleDownloadCSV}
							className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
							title="Download CSV"
							type="button"
						>
							{/* biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 mr-2"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
									clipRule="evenodd"
								/>
							</svg>
							Download CSV
						</button>
					</div>
					<div className="overflow-x-auto shadow-md rounded-lg">
						<table className="min-w-full table-auto">
							<thead className="bg-gray-50">
								<tr>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 min-w-[12rem]"
									>
										Image
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[20rem]"
									>
										Title & Description
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[16rem]"
									>
										Keywords
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20"
									>
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{folderImages.map((img, index) => (
									<tr
										key={`${folderPath}-${
											// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
											index
										}`}
										className="hover:bg-gray-50"
									>
										<td className="px-6 py-4">
											<div className="relative w-40 h-40 mx-auto">
												<img
													src={img.imageUrl}
													alt={`${img.fileName || `Analyzed content ${index + 1}`}`}
													className="w-full h-full object-cover rounded-lg shadow-sm"
												/>
											</div>
											<div className="mt-2 text-sm text-gray-500 text-center break-words">
												{img.fileName}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm space-y-2">
												<div className="font-medium text-gray-900 break-words line-clamp-3 hover:line-clamp-none transition-all duration-200">
													{img.analysis?.title}
												</div>
												<div className="text-gray-500 break-words line-clamp-4 hover:line-clamp-none transition-all duration-200">
													{img.analysis?.description}
												</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="max-h-[12rem] overflow-y-auto custom-scrollbar">
												<div className="flex flex-wrap gap-1">
													{img.analysis?.show.split(",").map((keyword, i) => (
														<span
															key={`${folderPath}-${index}-${
																// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
																i
															}`}
															className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap"
														>
															{keyword.trim()}
														</span>
													))}
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
											<button
												onClick={() => handleRemoveImage(index)}
												className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 p-2 rounded-full transition-colors"
												title="Remove image"
												type="button"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="h-5 w-5"
													viewBox="0 0 20 20"
													fill="currentColor"
													aria-hidden="true"
													role="img"
												>
													<title>Remove image</title>
													<path
														fillRule="evenodd"
														d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
														clipRule="evenodd"
													/>
												</svg>
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<style jsx>{`
						.custom-scrollbar {
							scrollbar-width: thin;
							scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
						}
						.custom-scrollbar::-webkit-scrollbar {
							width: 6px;
						}
						.custom-scrollbar::-webkit-scrollbar-track {
							background: transparent;
						}
						.custom-scrollbar::-webkit-scrollbar-thumb {
							background-color: rgba(156, 163, 175, 0.5);
							border-radius: 3px;
						}
					`}</style>
				</div>
			))}

			{loading && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 shadow-xl">
						<div className="flex items-center space-x-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
							<p className="text-lg">Analyzing images...</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
