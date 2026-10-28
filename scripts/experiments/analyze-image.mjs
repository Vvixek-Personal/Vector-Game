import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function analyze() {
  try {
    const imagePart = {
      inlineData: {
        data: fs.readFileSync('/tmp/downloaded_image.jpg').toString("base64"),
        mimeType: "image/jpeg"
      }
    };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            imagePart,
            { text: 'Describe this UI mockup in extreme detail so a developer can recreate it perfectly using React and Tailwind CSS. Include layout structure, colors, spacing, icons, components, and all text content. Focus on exact structural details.' }
          ]
        }
      ]
    });
    console.log(response.text);
  } catch (err) {
    console.error(err);
  }
}

analyze();
