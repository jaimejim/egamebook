const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for the AI storyteller
const SYSTEM_PROMPT = `You are a master storyteller creating an interactive narrative set in Stockholm during Nobel Prize week in December 1963.

SETTING: Nobel Prize Week, Stockholm, December 1963
- Locations: Grand Hotel Stockholm, Stockholm Concert Hall, City Hall, Royal Palace
- Cold Swedish winter - early darkness, snow, candlelight
- Nobel laureates from around the world, journalists, diplomats, Swedish royalty
- Cold War era - tensions between East and West beneath formal ceremony
- Mix of glamorous banquets and dark secrets

ATMOSPHERE: Literary thriller inspired by Irving Wallace's "The Prize"
- Sophisticated, sepia-toned literary prose
- Elegant surface concealing intrigue and scandal
- Personal dramas intersecting with historical/political tensions
- Moral complexity - everyone has secrets, ambitions, vulnerabilities
- 1960s authenticity - fashion, technology, social norms of the era

Your role:
1. Generate rich narrative capturing Stockholm's winter elegance and underlying tension
2. Create compelling characters with depth - laureates, journalists, diplomats, locals
3. Weave together personal stories, political intrigue, scandals, and human drama
4. Present meaningful choices at dramatic moments (not every turn)
5. Use dice rolls for risky actions: confrontations, investigations, gambles, dangerous decisions
6. Track consequences - reputation/scandal can end a career, physical danger can be fatal
7. Generate image prompts for key visual moments

Story Guidelines:
- Authentic 1960s details (Cold War context, technology, fashion, social attitudes)
- Stockholm locations and Nobel ceremony protocol (week-long events, formal dress, Swedish customs)
- Character types: Nobel laureates (Physics, Chemistry, Medicine, Literature, Peace), journalists, diplomats, Swedish hosts, royal staff, spies
- Themes: ambition, scandal, loyalty, betrayal, Cold War tensions, human excellence and frailty
- Death can come from scandal/disgrace (career destruction) or physical danger
- Nobel Week structure guides pacing (arrival → receptions → ceremony → banquet → aftermath)
- Keep paragraphs concise but evocative (2-4 sentences)

IMAGE GENERATION:
Generate image prompts when:
- A new major scene begins (arriving at Grand Hotel, entering Concert Hall, etc.)
- A significant character is introduced
- A dramatic twist or revelation occurs
- Visual atmosphere is crucial to the moment

Image style: "Sepia-toned vintage photograph, 1960s Stockholm, film noir aesthetic, grainy texture, dramatic lighting"

Response Format:
You must respond with a valid JSON object containing:
{
    "text": "The narrative text to display",
    "protagonist": {"name": "character name", "description": "brief description"},
    "companions": ["companion1", "companion2"],
    "context": "brief summary of current situation for context",
    "isDead": false,
    "deathMessage": null,
    "requiresDiceRoll": false,
    "probability": 0.5,
    "rollReason": "why this needs a dice roll",
    "imagePrompt": "detailed image generation prompt in sepia style, or null if no image needed",
    "choices": [
        {"text": "choice text", "id": "choice_id", "probability": 0.7}
    ]
}

IMPORTANT: Always return valid JSON. Do not include markdown formatting or code blocks.`;

async function generateStory(action, state, choice = null, diceSuccess = null, previousData = null) {
    let userMessage = '';

    switch (action) {
        case 'start':
            userMessage = `Begin a new story set in Stockholm, December 1963, during Nobel Prize week.

FIRST: Present the player with initial choices to establish their character:
1. A journalist covering the Nobel ceremonies (American or European press)
2. A diplomat's aide attending the events
3. A Swedish interpreter/guide for the laureates
4. Let fate decide (you pick a compelling role)

Present these as choices so the player can select their path into the story.

After they choose, create their specific character, give them a name, and set the opening scene arriving in Stockholm. Generate an atmospheric image prompt for the opening (winter Stockholm, Grand Hotel arrival, etc.).`;
            break;

        case 'choice':
            userMessage = `The player chose: "${choice.text}" (ID: ${choice.id})

Current context: ${state.currentContext}
Story so far: ${state.storyHistory.slice(-2).join('\n\n')}

Continue the story based on this choice. Show the consequences and continue the narrative.`;
            break;

        case 'dice_result':
            const outcome = diceSuccess ? 'SUCCESS' : 'FAILURE';
            userMessage = `Dice roll result: ${outcome}

Roll was for: ${previousData?.rollReason || 'unknown action'}
Probability was: ${Math.round((previousData?.probability || 0.5) * 100)}%

Current context: ${state.currentContext}
Story so far: ${state.storyHistory.slice(-2).join('\n\n')}

Continue the story based on this ${outcome.toLowerCase()}. Show the consequences and continue the narrative. If this was a critical failure in a dangerous situation, the protagonist might die.`;
            break;

        case 'continue':
            userMessage = `Continue the story naturally.

Current context: ${state.currentContext}
Protagonist: ${state.protagonist?.name || 'unnamed'}
Companions: ${state.companions?.join(', ') || 'none'}
Recent story: ${state.storyHistory.slice(-2).join('\n\n')}

Continue the narrative. You may introduce new situations, characters, or developments. Present choices when narratively appropriate (not required every turn).`;
            break;

        default:
            throw new Error('Invalid action');
    }

    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            temperature: 0.9,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: userMessage
                }
            ]
        });

        const responseText = message.content[0].text;

        // Try to parse the JSON response
        let storyData;
        try {
            // Remove markdown code blocks if present
            const cleanedResponse = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            storyData = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('Failed to parse AI response:', responseText);
            // Fallback: create a structured response
            storyData = {
                text: responseText,
                protagonist: state.protagonist || { name: 'Unknown', description: 'A wanderer' },
                companions: state.companions || [],
                context: 'Story in progress',
                isDead: false,
                requiresDiceRoll: false,
                choices: []
            };
        }

        // Generate image if prompt is provided
        if (storyData.imagePrompt) {
            try {
                // For now, we'll use a placeholder system
                // TODO: Integrate with DALL-E, Midjourney, or Stability AI
                storyData.imageUrl = await generateImage(storyData.imagePrompt);
            } catch (imageError) {
                console.error('Image generation failed:', imageError);
                // Continue without image
                storyData.imageUrl = null;
            }
        }

        return storyData;

    } catch (error) {
        console.error('Error generating story:', error);
        throw error;
    }
}

// Placeholder for image generation
// TODO: Replace with actual API integration (DALL-E, Stability AI, etc.)
async function generateImage(prompt) {
    // For now, return null - images will be added in next phase
    // When ready, this will call: OpenAI DALL-E, Stability AI, or similar
    console.log('Image prompt:', prompt);

    // Example integration structure:
    // const response = await fetch('https://api.openai.com/v1/images/generations', {
    //     method: 'POST',
    //     headers: {
    //         'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //         prompt: prompt,
    //         n: 1,
    //         size: '512x512',
    //         style: 'natural'
    //     })
    // });
    // const data = await response.json();
    // return data.data[0].url;

    return null; // For now, no images
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { action, state, choice, success, previousData } = req.body;

        if (!action) {
            res.status(400).json({ error: 'Missing action parameter' });
            return;
        }

        const storyData = await generateStory(action, state, choice, success, previousData);

        res.status(200).json(storyData);

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            error: 'Failed to generate story',
            message: error.message
        });
    }
};
