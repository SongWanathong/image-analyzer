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
							text: " Generate title based on main image context with  Descriptive title format: Action or Event Subject, Location, Content Type, Environment, Viewpoint, Concept for SEO Impact  + description format: explain the story in detail in 150 character The title must be strictly 100 - 150 characters long and Do not exceed 150 characters  Generate 121 keywords using single words or compound words (e.g., Coffee,Coffee table, High school, Well-being, Long-term, Living room). Do not create combined words without proper spaces (e.g., livingroom or wrong-room). Include keywords that cover diverse topics like home, lifestyle, technology, health, and nature. Ensure 70% are SEO-friendly and 30% are common words. Split the output into two groups clearly  use concept 'saleorasciishirtfront thumbnail' as 30% reference.  + Analyze category based on '1.Adobe-Category' dataset",
						},
						{
							type: "image_url",
							image_url: imageUrl,
						},
					],
				},
				{
					role: "system",
					content:
						' Always refer to the following \'1.Adobe-Category\' dataset: [{"id":1,"name":"Animals"},{"id":2,"name":"Architecture"},{"id":3,"name":"Business"},{"id":4,"name":"Drinks"},{"id":5,"name":"Nature"},{"id":6,"name":"Emotions"},{"id":7,"name":"Food"},{"id":8,"name":"Graphic"},{"id":9,"name":"Hobbies"},{"id":10,"name":"Industry"},{"id":11,"name":"Landscape"},{"id":12,"name":"Lifestyle"},{"id":13,"name":"People"},{"id":14,"name":"Plants"},{"id":15,"name":"Culture"},{"id":16,"name":"Science"},{"id":17,"name":"Social Issues"},{"id":18,"name":"Sports"},{"id":19,"name":"Technology"},{"id":20,"name":"Transport"},{"id":21,"name":"Travel"}] Generate only english contain only correctly spelled words with SEO exclude any brand names, trademarks, copyrighted terms, genericized trademark, or specific commercial products. Output is plain text title="title" description="description" keys=[,,] categoryId="id"',
				},
			],

			max_tokens: 4000,
			temperature: 0.8,
		});
		console.log(response);
		const result = response.choices[0]?.message?.content;
		console.log(response.choices[0]);
		if (!result) {
			throw new Error("No response from OpenAI");
		}

		// Parse the custom format response
		const titleMatch = result.match(/title="([^"]+)"/);
		const descriptionMatch = result.match(/description="([^"]+)"/);
		const keysMatch = result.match(/keys=\[([\s\S]+?)\]/);
		const categoryMatch = result.match(/categoryId="(\d+)"/);

		if (!titleMatch || !descriptionMatch || !keysMatch || !categoryMatch) {
			throw new Error("Invalid response format from OpenAI");
		}

		const keywords = keysMatch[1]
			.split(",")
			.map((k) => k.trim().replace(/"/g, ""))
			.filter((k) => k.length > 0)
			.join(",");

		const analysis = {
			title: titleMatch[1],
			description: descriptionMatch[1],
			keywords: keywords,
			categoryId: Number(categoryMatch[1]),
		};

		return NextResponse.json(analysis);
	} catch (error) {
		console.error("Error analyzing image:", error);
		return NextResponse.json(
			{ error: "Failed to analyze image" },
			{ status: 500 },
		);
	}
}
