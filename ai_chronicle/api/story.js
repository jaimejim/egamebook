const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

// Logging helper
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (level === 'error') {
        console.error(logMessage, data || '');
    } else if (level === 'warn') {
        console.warn(logMessage, data || '');
    } else {
        console.log(logMessage, data || '');
    }
}

// Initialize API clients with error handling
let anthropic = null;
let openai = null;

try {
    if (process.env.ANTHROPIC_API_KEY) {
        anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        log('info', 'Anthropic client initialized');
    } else {
        log('error', 'ANTHROPIC_API_KEY not set');
    }
} catch (error) {
    log('error', 'Failed to initialize Anthropic client', error.message);
}

try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        log('info', 'OpenAI client initialized');
    } else {
        log('warn', 'OPENAI_API_KEY not set - image generation disabled');
    }
} catch (error) {
    log('warn', 'Failed to initialize OpenAI client', error.message);
}

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
- TARGET: Create a complete story spanning ~50 pages worth of narrative (12,000-15,000 words total)
- Authentic 1960s details (Cold War context, technology, fashion, social attitudes)
- Stockholm locations and Nobel ceremony protocol (week-long events, formal dress, Swedish customs)
- Character types: Nobel laureates (Physics, Chemistry, Medicine, Literature, Peace), journalists, diplomats, Swedish hosts, royal staff, spies
- Themes: ambition, scandal, loyalty, betrayal, Cold War tensions, human excellence and frailty
- Death can come from scandal/disgrace (career destruction) or physical danger
- Nobel Week structure guides pacing (arrival → receptions → ceremony → banquet → aftermath)
- Each story segment should be 200-400 words (building toward 50-page total)
- CRITICAL: Remember and reference ALL past choices and events in the story history
- Build narrative momentum - each segment should advance plot, deepen character, or reveal secrets
- Vary pacing: some segments have choices, some are pure narrative continuation

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
    log('info', `Generating story for action: ${action}`);

    if (!anthropic) {
        throw new Error('Anthropic API client not initialized. Check ANTHROPIC_API_KEY.');
    }

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
            userMessage = `Continue the story naturally, building toward a complete 50-page narrative.

Current page: ${state.pageNumber || 1}
Current context: ${state.currentContext}
Protagonist: ${state.protagonist?.name || 'unnamed'}
Companions: ${state.companions?.join(', ') || 'none'}
Recent story: ${state.storyHistory.slice(-3).join('\n\n')}

Continue the narrative (200-400 words). Build on everything that has happened. Reference past choices and events. You may introduce new situations, characters, or developments. Present choices when narratively appropriate (not every turn). Generate an image prompt if entering a new scene or meeting a significant character.`;
            break;

        default:
            throw new Error(`Invalid action: ${action}`);
    }

    try {
        log('info', 'Calling Anthropic API');

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
        log('info', `Received response (${responseText.length} chars)`);

        // Try to parse the JSON response
        let storyData;
        try {
            // Remove markdown code blocks if present
            const cleanedResponse = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            storyData = JSON.parse(cleanedResponse);
            log('info', 'Successfully parsed JSON response');
        } catch (parseError) {
            log('error', 'Failed to parse AI response as JSON', parseError.message);
            log('debug', 'Raw response', responseText.substring(0, 500));

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

        // Generate image if prompt is provided and OpenAI is available
        if (storyData.imagePrompt && openai) {
            try {
                log('info', 'Generating image');
                storyData.imageUrl = await generateImage(storyData.imagePrompt);
            } catch (imageError) {
                log('warn', 'Image generation failed', imageError.message);
                storyData.imageUrl = null;
            }
        }

        return storyData;

    } catch (error) {
        log('error', 'Story generation error', error.message);

        if (error.status) {
            log('error', `API error status: ${error.status}`);
        }

        throw error;
    }
}

// Generate sepia-toned vintage images using DALL-E 3
async function generateImage(prompt) {
    if (!openai) {
        log('warn', 'OpenAI client not available, skipping image generation');
        return null;
    }

    try {
        log('info', 'Calling DALL-E API');

        // Enhance prompt for sepia vintage aesthetic
        const enhancedPrompt = `${prompt}. Style: Sepia-toned vintage photograph from 1963, grainy film texture, dramatic noir lighting, high contrast black and white photograph with sepia filter, vintage documentary photography aesthetic, realistic but atmospheric`;

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: enhancedPrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "natural"
        });

        const imageUrl = response.data[0].url;
        log('info', 'Image generated successfully');

        return imageUrl;
    } catch (error) {
        log('error', 'DALL-E API error', error.message);
        return null;
    }
}

module.exports = async (req, res) => {
    // Enable CORS with explicit headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        log('warn', `Invalid method: ${req.method}`);
        return res.status(405).json({
            error: 'Method not allowed',
            message: 'Only POST requests are accepted'
        });
    }

    // Check for API key before processing
    if (!process.env.ANTHROPIC_API_KEY) {
        log('error', 'ANTHROPIC_API_KEY not configured');
        return res.status(500).json({
            error: 'Configuration Error',
            message: 'ANTHROPIC_API_KEY is not configured',
            hint: 'Please set environment variables in Vercel Dashboard → Settings → Environment Variables'
        });
    }

    try {
        const { action, state, choice, success, previousData } = req.body;

        if (!action) {
            log('warn', 'Missing action parameter');
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Missing required parameter: action'
            });
        }

        log('info', `Processing request - action: ${action}`);

        const storyData = await generateStory(action, state, choice, success, previousData);

        log('info', 'Request completed successfully');
        return res.status(200).json(storyData);

    } catch (error) {
        log('error', 'Request failed', error.message);

        // Provide more specific error messages
        let errorMessage = error.message || 'Unknown error occurred';
        let hint = null;

        if (error.message?.includes('API key') || error.message?.includes('authentication')) {
            errorMessage = 'Invalid API key configuration';
            hint = 'Please check your ANTHROPIC_API_KEY in Vercel environment variables';
        } else if (error.message?.includes('rate limit') || error.status === 429) {
            errorMessage = 'API rate limit exceeded';
            hint = 'Please wait a moment and try again';
        } else if (error.status === 401) {
            errorMessage = 'Authentication failed';
            hint = 'Your API key may be invalid or expired';
        } else if (error.status === 500) {
            errorMessage = 'Anthropic API server error';
            hint = 'The AI service is temporarily unavailable';
        }

        return res.status(500).json({
            error: 'Story Generation Failed',
            message: errorMessage,
            hint: hint,
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
