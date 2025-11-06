const { ChatOpenAI } = require('@langchain/openai');

// Initialize OpenAI client (only if API key is available)
let llm = null;
if (process.env.OPENAI_API_KEY) {
  try {
    llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.warn('Failed to initialize LangChain OpenAI client:', error.message);
  }
}

// Simple OpenAI client for direct API calls
const OpenAI = require('openai');
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.warn('Failed to initialize OpenAI client:', error.message);
  }
}

/**
 * Calculate cost based on model and token usage
 */
function calculateCost(model, promptTokens, completionTokens) {
  // Pricing per 1M tokens (as of 2024)
  const pricing = {
    'gpt-4-turbo-preview': { input: 10, output: 30 },
    'gpt-4': { input: 30, output: 60 },
    'gpt-4o': { input: 5, output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'gpt-3.5-turbo-1106': { input: 1, output: 2 },
  };

  const modelKey = Object.keys(pricing).find(key => model.includes(key)) || 'gpt-4o-mini';
  const rates = pricing[modelKey] || pricing['gpt-4o-mini'];
  
  const inputCost = (promptTokens / 1000000) * rates.input;
  const outputCost = (completionTokens / 1000000) * rates.output;
  
  return {
    inputCost: inputCost,
    outputCost: outputCost,
    totalCost: inputCost + outputCost,
    currency: 'USD',
  };
}

/**
 * Log AI consumption
 */
async function logAIConsumption(model, usage, functionName, metadata = {}) {
  const cost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);
  
  console.log('\n=== AI Consumption Log ===');
  console.log(`Function: ${functionName}`);
  console.log(`Model: ${model}`);
  console.log(`Prompt Tokens: ${usage.prompt_tokens.toLocaleString()}`);
  console.log(`Completion Tokens: ${usage.completion_tokens.toLocaleString()}`);
  console.log(`Total Tokens: ${usage.total_tokens.toLocaleString()}`);
  console.log(`Input Cost: $${cost.inputCost.toFixed(6)}`);
  console.log(`Output Cost: $${cost.outputCost.toFixed(6)}`);
  console.log(`Total Cost: $${cost.totalCost.toFixed(6)} ${cost.currency}`);
  console.log('========================\n');
  
  // Save to database if available
  try {
    const AIConsumption = require('../models/AIConsumption');
    const mongoose = require('mongoose');
    
    // Ensure projectId is a valid ObjectId string, not an object
    let projectIdValue = null;
    if (metadata.projectId) {
      if (typeof metadata.projectId === 'string') {
        // Check if it's a valid ObjectId string
        if (mongoose.Types.ObjectId.isValid(metadata.projectId)) {
          projectIdValue = metadata.projectId;
        } else {
          console.warn(`[AIConsumption] Invalid projectId format: ${metadata.projectId}`);
        }
      } else if (metadata.projectId && typeof metadata.projectId === 'object') {
        // If it's an object, try to extract _id
        if (metadata.projectId._id) {
          projectIdValue = metadata.projectId._id.toString();
        } else if (metadata.projectId.toString && mongoose.Types.ObjectId.isValid(metadata.projectId.toString())) {
          // If it's a Mongoose ObjectId, convert to string
          projectIdValue = metadata.projectId.toString();
        } else {
          // Log the full object for debugging but don't fail
          console.warn(`[AIConsumption] Invalid projectId format: ${JSON.stringify(metadata.projectId)}`);
        }
      }
    }
    
    // Ensure meetingId is a valid ObjectId string
    let meetingIdValue = null;
    if (metadata.meetingId) {
      if (typeof metadata.meetingId === 'string') {
        if (mongoose.Types.ObjectId.isValid(metadata.meetingId)) {
          meetingIdValue = metadata.meetingId;
        }
      } else if (metadata.meetingId._id) {
        meetingIdValue = metadata.meetingId._id.toString();
      }
    }
    
    // Ensure userId is a valid ObjectId string
    let userIdValue = null;
    if (metadata.userId) {
      if (typeof metadata.userId === 'string') {
        if (mongoose.Types.ObjectId.isValid(metadata.userId)) {
          userIdValue = metadata.userId;
        }
      } else if (metadata.userId._id) {
        userIdValue = metadata.userId._id.toString();
      }
    }
    
    await AIConsumption.create({
      functionName,
      model,
      projectId: projectIdValue,
      meetingId: meetingIdValue,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      inputCost: cost.inputCost,
      outputCost: cost.outputCost,
      totalCost: cost.totalCost,
      currency: cost.currency,
      createdBy: userIdValue,
    });
  } catch (dbError) {
    // Don't fail if database logging fails
    console.warn('Failed to save AI consumption to database:', dbError.message);
  }
  
  return cost;
}

/**
 * Generate text using OpenAI
 */
async function generateText(prompt, options = {}) {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
  }
  
  // Use cost-efficient model by default
  const model = options.model || 'gpt-4o-mini';
  const functionName = options.functionName || 'generateText';
  
  try {
    console.log(`[AI] ${functionName} - Using model: ${model}`);
    console.log(`[AI] ${functionName} - Prompt length: ${prompt.length} characters`);
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: options.systemPrompt || 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 2000,
    });

    const content = response.choices[0].message.content;
    
    // Log consumption
    if (response.usage) {
      await logAIConsumption(model, response.usage, functionName, {
        projectId: options.projectId,
        meetingId: options.meetingId,
        userId: options.userId,
      });
    }
    
    // Log response (truncated if too long)
    const responsePreview = content.length > 500 
      ? content.substring(0, 500) + '... (truncated)'
      : content;
    console.log(`[AI] ${functionName} - Response preview:`, responsePreview);
    
    return content;
  } catch (error) {
    console.error(`[AI] ${functionName} - Error:`, error.message);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Generate JSON structured output
 */
async function generateJSON(prompt, schema, options = {}) {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
  }
  
  // Use cost-efficient model that supports JSON mode
  const model = options.model || 'gpt-4o-mini';
  const functionName = options.functionName || 'generateJSON';
  const supportsJSONMode = ['gpt-4-turbo-preview', 'gpt-4-1106-preview', 'gpt-3.5-turbo-1106', 'gpt-4o', 'gpt-4o-mini'].includes(model);
  
  try {
    console.log(`[AI] ${functionName} - Using model: ${model}`);
    console.log(`[AI] ${functionName} - Prompt length: ${prompt.length} characters`);
    console.log(`[AI] ${functionName} - Schema:`, JSON.stringify(schema, null, 2));
    
    // Try with JSON mode if supported
    if (supportsJSONMode) {
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a helpful assistant that returns valid JSON. Always return only valid JSON, no additional text.',
          },
          {
            role: 'user',
            content: `${prompt}\n\nReturn the response as valid JSON matching this schema: ${JSON.stringify(schema)}. 

CRITICAL: Return actual data values, NOT the schema structure itself. For example, if the schema has "assignments": {"type": "array", "items": {...}}, return "assignments": [actual assignment objects here], NOT the schema structure.

Return only the JSON object, no markdown formatting or additional text.`,
          },
        ],
        temperature: options.temperature || 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      
      // Log consumption
      if (response.usage) {
        await logAIConsumption(model, response.usage, functionName, {
          projectId: options.projectId,
          meetingId: options.meetingId,
          userId: options.userId,
        });
      }
      
      // Log response
      console.log(`[AI] ${functionName} - Response:`, content);
      
      const parsed = JSON.parse(content);
      console.log(`[AI] ${functionName} - Parsed successfully`);
      
      return parsed;
    } else {
      // Fallback: parse JSON from text response
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a helpful assistant that returns valid JSON. Always return only valid JSON, no additional text or markdown formatting.',
          },
          {
            role: 'user',
            content: `${prompt}\n\nReturn the response as valid JSON matching this schema: ${JSON.stringify(schema)}. Return only the JSON object, no markdown code blocks, no explanations, just the raw JSON.`,
          },
        ],
        temperature: options.temperature || 0.3,
      });

      let content = response.choices[0].message.content.trim();
      
      // Log consumption
      if (response.usage) {
        await logAIConsumption(model, response.usage, functionName, {
          projectId: options.projectId,
          meetingId: options.meetingId,
          userId: options.userId,
        });
      }
      
      // Log raw response
      console.log(`[AI] ${functionName} - Raw response:`, content);
      
      // Remove markdown code blocks if present
      if (content.startsWith('```json')) {
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/```\n?/g, '').replace(/```\n?/g, '');
      }
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      console.log(`[AI] ${functionName} - Extracted JSON:`, content);
      
      const parsed = JSON.parse(content);
      console.log(`[AI] ${functionName} - Parsed successfully`);
      
      return parsed;
    }
  } catch (error) {
    // If JSON parsing fails, log the error and rethrow
    console.error(`[AI] ${functionName} - Error:`, error.message);
    if (error.message.includes('JSON')) {
      console.error(`[AI] ${functionName} - JSON parsing error. Response content:`, error.message);
    }
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

module.exports = {
  llm,
  openai,
  generateText,
  generateJSON,
};

