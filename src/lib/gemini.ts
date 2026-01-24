import { GoogleGenerativeAI } from "@google/generative-ai";

export async function getAIFixRecommendation(apiKey: string, issueTitle: string, issueDescription: string, affectedItems: string[]) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    You are an expert Google Tag Manager architect. 
    I have a container audit issue:
    
    Issue: ${issueTitle}
    Description: ${issueDescription}
    Affected Items: ${affectedItems.join(", ")}
    
    Please provide a concise, step-by-step guide for a marketer on how to fix this in Google Tag Manager. 
    Focus on the exact steps in the GTM UI. 
    Use clear, actionable language. Avoid deep technical jargon where possible.
    Format the response in Markdown.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        throw new Error(error.message || "Failed to fetch AI recommendation.");
    }
}
