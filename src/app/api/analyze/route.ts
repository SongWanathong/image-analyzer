import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
	baseURL: "https://openrouter.ai/api/v1",
	apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
	try {
		const { imageUrl } = await req.json();

		if (!imageUrl) {
			return NextResponse.json(
				{ error: "Image URL is required" },
				{ status: 400 },
			);
		}

		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "Analyze this image and provide: 1. A title 2. A description 3. Keywords (comma separated). Format the response as JSON with fields: title, description, keywords",
						},
						{
							type: "image_url",
							image_url: imageUrl,
						},
					],
				},
			],
			max_tokens: 500,
		});

		const result = response.choices[0]?.message?.content;
		if (!result) {
			throw new Error("No response from OpenAI");
		}

		// Clean the result string by removing markdown code block syntax if present
		const cleanResult = result.replace(/```json\n|\n```/g, "").trim();

		// Parse the JSON response
		const analysis = JSON.parse(cleanResult);

		return NextResponse.json(analysis);
	} catch (error) {
		console.error("Error analyzing image:", error);
		return NextResponse.json(
			{ error: "Failed to analyze image" },
			{ status: 500 },
		);
	}
}
