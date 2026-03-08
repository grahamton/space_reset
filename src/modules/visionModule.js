/**
 * visionModule - Handles image analysis via Google Gemini API
 */

import { PERSONAS, DEFAULT_PERSONA } from '../config/personas';

const fileToGenerativePart = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Fallback "5 Things" missions when API fails
export const DEFAULT_FALLBACK_DATA = {
  missions: [
    {
      id: 'm1',
      title: 'The Trash Harvest',
      description:
        'Grab a trash bag. Scan the room. Ignore laundry, ignore books. Just find the trash. Wrappers, receipts, empty bottles—if it\'s trash, it goes in the bag.',
      time: 120,
      type: 'trash',
      strategy: 'Tunnel vision: If it\'s not trash, it doesn\'t exist right now.'
    },
    {
      id: 'm2',
      title: 'Laundry Raid',
      description: 'Grab a basket. Swoop up all clothes on the floor. Do not sort them. Just contain them.',
      time: 180,
      type: 'laundry',
      strategy: 'Containment is the goal, not perfection.'
    },
    {
      id: 'm3',
      title: 'Dish Dash',
      description: 'Gather all cups, plates, and bottles. Relocate them to the kitchen sink.',
      time: 60,
      type: 'dishes',
      strategy: 'Don\'t wash them yet. Just get them out of this room.'
    },
    {
      id: 'm4',
      title: 'Surface Sweep',
      description: 'Clear the most annoying flat surface (desk or nightstand).',
      time: 300,
      type: 'clear',
      strategy: 'Make one spot nice to look at.'
    }
  ]
};

export const visionModule = {
  analyzeImage: async (file, apiKey, persona) => {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    try {
      const imagePart = await fileToGenerativePart(file);

      // Construct prompt using the selected persona's instructions
      const systemInstruction = persona?.systemInstruction || PERSONAS[DEFAULT_PERSONA].systemInstruction;

      const prompt = `
        ${systemInstruction}
        
        Analyze this image. Create 4-6 cleaning "Missions" using the "5 Things" method.
        
        Rules:
        1. Batch tasks (e.g., "All Trash", "All Laundry").
        2. Keep descriptions actionable and matching your persona's tone.
        3. Assign a "type" (trash, laundry, dishes, clear, organize).
        4. Assign a "strategy" tip matching your persona.
        
        Return raw JSON:
        {
          "missions": [
            {
              "id": "unique_id",
              "title": "Title",
              "description": "Instructions",
              "time": 120,
              "type": "trash",
              "strategy": "Tip"
            }
          ]
        }
      `;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, imagePart] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'API Error');
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      console.log('Gemini Raw Response:', text);

      // Robust JSON extraction
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Vision Analysis Failed:', error);
      alert(`Analysis failed: ${error.message}. Using offline mode.`);
      return DEFAULT_FALLBACK_DATA;
    }
  }
};
