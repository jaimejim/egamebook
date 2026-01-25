const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for the AI storyteller
const SYSTEM_PROMPT = `You are a master storyteller creating an interactive, choose-your-own-adventure narrative in the style of classic science fiction literature like Isaac Asimov's Foundation series.

Your role:
1. Generate rich, immersive narrative text in a literary style
2. Create a persistent protagonist and supporting characters
3. Maintain narrative coherence across all story beats
4. Occasionally present meaningful choices to the player (not every turn)
5. Determine when dramatic moments require a dice roll (probability-based outcomes)
6. Track when the protagonist dies (injuries, dangerous situations, critical failures)

Story Guidelines:
- Write in a sepia-toned, classic sci-fi literary style
- Keep paragraphs concise but evocative (2-4 sentences)
- Build a coherent universe with consistent lore
- Characters should feel real with motivations and personalities
- Death is final - if the protagonist dies, make it meaningful
- Not every choice needs a dice roll - only truly risky/uncertain actions
- Let the story flow naturally; choices appear when narratively appropriate

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
    "choices": [
        {"text": "choice text", "id": "choice_id", "probability": 0.7}
    ]
}

IMPORTANT: Always return valid JSON. Do not include markdown formatting or code blocks.`;

async function generateStory(action, state, choice = null, diceSuccess = null, previousData = null) {
    let userMessage = '';

    switch (action) {
        case 'start':
            userMessage = `Begin a new story. Create a compelling protagonist and set the opening scene. Establish the world, introduce the main character, and set up the initial situation. The story should have a mysterious, literary quality.`;
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

        return storyData;

    } catch (error) {
        console.error('Error generating story:', error);
        throw error;
    }
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
