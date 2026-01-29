#!/usr/bin/env node

// Test script to verify Anthropic and OpenAI API keys work correctly
// Run with: node test-api.js

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

console.log('🔍 Testing API Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('- ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Missing');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing');
console.log('');

async function testAnthropicAPI() {
    console.log('🤖 Testing Anthropic API...');

    if (!process.env.ANTHROPIC_API_KEY) {
        console.log('❌ ANTHROPIC_API_KEY not set\n');
        return false;
    }

    try {
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: 'Respond with exactly: "API test successful"'
                }
            ]
        });

        const response = message.content[0].text;
        console.log('✅ Anthropic API Response:', response);
        console.log('✅ Anthropic API is working correctly\n');
        return true;

    } catch (error) {
        console.log('❌ Anthropic API Error:');
        console.log('   Error type:', error.constructor.name);
        console.log('   Message:', error.message);
        if (error.status) {
            console.log('   Status:', error.status);
        }
        console.log('');
        return false;
    }
}

async function testOpenAIAPI() {
    console.log('🎨 Testing OpenAI API...');

    if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OPENAI_API_KEY not set (optional for images)\n');
        return false;
    }

    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Just test that we can create the client and make a simple call
        const response = await openai.models.list();

        console.log('✅ OpenAI API is working correctly');
        console.log('   Available models:', response.data.length);
        console.log('');
        return true;

    } catch (error) {
        console.log('❌ OpenAI API Error:');
        console.log('   Error type:', error.constructor.name);
        console.log('   Message:', error.message);
        if (error.status) {
            console.log('   Status:', error.status);
        }
        console.log('');
        return false;
    }
}

async function testStoryGeneration() {
    console.log('📖 Testing Story Generation (full flow)...');

    if (!process.env.ANTHROPIC_API_KEY) {
        console.log('❌ Cannot test story generation without ANTHROPIC_API_KEY\n');
        return false;
    }

    try {
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const systemPrompt = `You are a storyteller. Respond with valid JSON only, no markdown.
Format: {"text": "story text", "choices": []}`;

        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 500,
            temperature: 0.9,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: 'Begin a story in Stockholm. Return JSON with "text" and "choices" fields.'
                }
            ]
        });

        const responseText = message.content[0].text;
        console.log('Raw response preview:', responseText.substring(0, 150) + '...');

        // Try to parse JSON
        const cleanedResponse = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const parsed = JSON.parse(cleanedResponse);

        console.log('✅ Story generation successful');
        console.log('   Story text length:', parsed.text?.length || 0);
        console.log('   Choices:', parsed.choices?.length || 0);
        console.log('');
        return true;

    } catch (error) {
        console.log('❌ Story generation failed:');
        console.log('   Error:', error.message);
        console.log('');
        return false;
    }
}

async function runAllTests() {
    console.log('=' .repeat(60));
    console.log('AI Chronicle - API Testing Suite');
    console.log('=' .repeat(60));
    console.log('');

    const results = {
        anthropic: await testAnthropicAPI(),
        openai: await testOpenAIAPI(),
        story: await testStoryGeneration()
    };

    console.log('=' .repeat(60));
    console.log('Test Results Summary:');
    console.log('=' .repeat(60));
    console.log(`Anthropic API: ${results.anthropic ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`OpenAI API:    ${results.openai ? '✅ PASS' : '⚠️  SKIP (optional)'}`);
    console.log(`Story Gen:     ${results.story ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    if (results.anthropic && results.story) {
        console.log('✅ All critical tests passed! The API configuration is correct.');
    } else {
        console.log('❌ Some tests failed. Please check your API keys and try again.');
        process.exit(1);
    }
}

runAllTests();
