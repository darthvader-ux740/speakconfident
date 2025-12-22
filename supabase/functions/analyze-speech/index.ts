import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS configuration - restrict to known origins
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const allowedOrigins = [
    Deno.env.get('SUPABASE_URL') || '',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean);
  
  // Also allow Lovable preview URLs
  if (requestOrigin && (
    requestOrigin.includes('.lovableproject.com') ||
    requestOrigin.includes('.lovable.app') ||
    allowedOrigins.includes(requestOrigin)
  )) {
    return requestOrigin;
  }
  
  return allowedOrigins[0] || '*';
};

// Input validation constants
const MAX_FILE_SIZE_MB = 100;
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/mpeg',
  'audio/wav',
];

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('No authorization header provided');
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Please log in to use this feature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify the user with Supabase
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    console.error('Authentication failed:', authError?.message);
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid or expired session' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Authenticated user:', user.id);

  try {
    const { audio, fileName, mimeType } = await req.json();
    
    // Input validation
    if (!audio || typeof audio !== 'string') {
      throw new Error('No audio/video data provided');
    }

    if (!mimeType || typeof mimeType !== 'string') {
      throw new Error('MIME type is required');
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Invalid file type "${mimeType}". Supported types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Validate file size (base64 is ~4/3 larger than original)
    const estimatedSizeBytes = (audio.length * 3) / 4;
    const estimatedSizeMB = estimatedSizeBytes / (1024 * 1024);
    if (estimatedSizeMB > MAX_FILE_SIZE_MB) {
      throw new Error(`File too large (${estimatedSizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB`);
    }

    // Basic base64 format validation
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(audio)) {
      throw new Error('Invalid base64 data format');
    }

    // Sanitize filename for logging
    const sanitizedFileName = fileName ? String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) : 'unknown';
    
    console.log('Received file:', sanitizedFileName, 'Type:', mimeType, 'Size:', estimatedSizeMB.toFixed(2), 'MB');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use Gemini's multimodal capabilities to analyze the video/audio directly
    console.log('Sending video to Gemini for analysis...');
    
    // Determine the correct mime type for Gemini
    let geminiMimeType = mimeType;
    if (mimeType === 'video/mp4') {
      geminiMimeType = 'video/mp4';
    } else if (mimeType === 'video/webm') {
      geminiMimeType = 'video/webm';
    } else if (mimeType === 'audio/webm') {
      geminiMimeType = 'audio/webm';
    } else if (mimeType === 'audio/mp4' || mimeType === 'audio/m4a') {
      geminiMimeType = 'audio/mp4';
    }

    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert public speaking coach. You will analyze a video/audio recording of a speech and evaluate the speaker's performance.

IMPORTANT: You MUST analyze the ACTUAL content you hear in the recording. Listen carefully to:
- What the speaker is actually saying
- How they are saying it (tone, pace, clarity)
- Any filler words or hesitations
- The structure of their message
- Estimate the duration and word count

PROFICIENCY LEVELS (you MUST assign ONE of these 6 levels based on overall performance):

1. Beginner - Speaks with hesitation. Heavy reliance on notes. Limited structure. Fear is dominant.
2. Elementary - Can speak for short durations without freezing. Simple structure. Intro, body, close.
3. Intermediate - Comfortable in familiar settings. Clear structure and transitions. Can answer basic questions.
4. Upper-Intermediate - Adapts content to audience. Uses examples, pauses, and variation in tone. Handles interruptions and follow-ups.
5. Advanced - Speaks confidently in high-stakes situations. Strong presence. Minimal reliance on slides or notes. Handles Q&A, objections, and tough audiences.
6. Mastery - Commanding presence. Effortless delivery. Shapes thinking and decisions. Can improvise, persuade, and inspire consistently.

Return your analysis as a valid JSON object with this exact structure:
{
  "fullTranscript": "<the COMPLETE word-for-word transcript of what was said>",
  "mispronunciations": [
    {
      "word": "<the mispronounced word>",
      "timestamp": "<approximate time e.g., '0:15'>",
      "issue": "<what was wrong - e.g., 'slurred', 'unclear pronunciation', 'wrong emphasis'>",
      "correctPronunciation": "<how it should be pronounced>"
    }
  ],
  "wordsPerMinute": <estimated WPM as integer>,
  "totalWords": <estimated total word count>,
  "durationSeconds": <estimated duration in seconds>,
  "proficiencyLevel": "<EXACTLY one of: Beginner, Elementary, Intermediate, Upper-Intermediate, Advanced, Mastery>",
  "voiceModulation": {
    "score": <number 1-10>,
    "voiceClarity": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback based on what you heard>",
      "strengths": "<what they did well for this specific parameter - quote exact words/phrases from speech with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact words/phrases from speech with timestamps>"
    },
    "tonalVariation": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact words/phrases with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact words/phrases with timestamps>"
    },
    "paceAndPauses": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact words/phrases with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact words/phrases with timestamps>"
    },
    "fillersAndVerbalHabits": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback - mention actual fillers you heard>",
      "strengths": "<what they did well - quote exact words/phrases with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact fillers with timestamps>"
    }
  },
  "thoughtStructure": {
    "score": <number 1-10>,
    "purposeArticulation": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact words/phrases with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact words/phrases with timestamps>"
    },
    "logicalFlow": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact words/phrases with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact words/phrases with timestamps>"
    },
    "signposting": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact words/phrases with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact words/phrases with timestamps>"
    },
    "closureStrength": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact words/phrases with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact words/phrases with timestamps>"
    }
  },
  "vocabulary": {
    "score": <number 1-10>,
    "sentenceEconomy": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact sentences with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact sentences with timestamps>"
    },
    "specificity": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact words/phrases with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact vague phrases with timestamps>"
    },
    "redundancyControl": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact words/phrases with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact redundant phrases with timestamps>"
    },
    "confidenceOfPhrasing": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact confident phrases with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact hedging phrases with timestamps>"
    },
    "grammar": { 
      "score": <number 1-10>, 
      "feedback": "<specific feedback>",
      "strengths": "<what they did well - quote exact correct usage with timestamps>",
      "developmentAreas": "<what needs improvement - quote exact grammar errors with timestamps>"
    }
  },
  "summary": "<2-3 sentence overall assessment referencing specific things from the speech and why they received this proficiency level>",
  "timestampedFeedback": [
    {
      "timeRange": "<e.g., '0:30-0:45'>",
      "issue": "<what happened at this moment>",
      "suggestion": "<how to improve>"
    }
  ],
  "strengths": [
    "<strength 1 - be specific about what they did well>",
    "<strength 2>",
    "<strength 3>"
  ],
  "developmentAreas": [
    "<area 1 - be specific about what needs improvement>",
    "<area 2>",
    "<area 3>"
  ],
  "drillSuggestion": "<one specific practice exercise to improve the most critical development area>"
}

LEVEL ASSIGNMENT GUIDELINES:
- Beginner (Level 1): Many hesitations, unclear structure, heavy filler usage, monotone, lacks confidence
- Elementary (Level 2): Can complete short speeches, basic structure exists, moderate fillers, some tonal variation
- Intermediate (Level 3): Clear structure, good transitions, comfortable delivery, occasional fillers, decent pacing
- Upper-Intermediate (Level 4): Adapts well, uses pauses effectively, varied tone, minimal fillers, engages audience
- Advanced (Level 5): Confident presence, excellent structure, handles complexity, very few fillers, persuasive
- Mastery (Level 6): Commanding presence, effortless delivery, inspiring, virtually no fillers, leadership voice

SCORING SUB-PARAMETERS (1-10):
- Voice Clarity & Projection: Audibility and steadiness of voice
- Tonal Variation: Pitch changes to emphasize meaning, avoid monotone
- Pace & Pauses: Control over speaking speed and effective silence
- Fillers & Verbal Habits: Frequency of "um", "uh", "like", "you know", repetitive phrases
- Purpose Articulation: How clearly the objective is stated upfront
- Logical Flow: Ideas progress coherently and easy to follow
- Signposting: Explicit cues that help track where the talk is going
- Closure Strength: Effectiveness of conclusion or summary
- Sentence Economy: Short, direct sentences vs rambling
- Specificity: Concrete details and examples vs vague language
- Redundancy Control: Avoidance of unnecessary repetition
- Confidence of Phrasing: Clear, assertive language without excessive hedging
- Grammar: Correct tenses, verbs, and grammatical structure

TIMESTAMPED FEEDBACK: Provide 3-5 specific moments with timestamps (estimate based on the recording). Be precise, e.g., "At 0:30-0:45, you stuttered several times when explaining the main concept."

STRENGTHS: Identify the top 3 things the speaker did well. Be specific.

DEVELOPMENT AREAS: Identify the top 3 areas that need improvement. Be specific.

DRILL SUGGESTION: Provide ONE specific, actionable practice exercise.

BE HONEST AND ACCURATE. Base ALL feedback on ACTUAL content from the recording.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this speech recording. Listen carefully and provide detailed, specific feedback based on what the speaker actually says and how they say it. Include timestamped feedback, WPM, strengths, development areas, and a drill suggestion.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${geminiMimeType};base64,${audio}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('AI analysis error:', analysisResponse.status, errorText);
      throw new Error(`Failed to analyze speech: ${errorText}`);
    }

    const analysisData = await analysisResponse.json();
    console.log('Received AI response');
    
    const content = analysisData.choices[0].message.content;
    
    // Helper function to clean and fix truncated JSON
    const cleanAndParseJSON = (jsonStr: string): any => {
      // Remove any markdown code block markers
      let cleaned = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Fix common issues with AI-generated JSON
      // Remove trailing commas before closing braces/brackets
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
      
      // Fix unescaped quotes in strings (common issue)
      // This is a simplified fix - replaces unescaped newlines in strings
      cleaned = cleaned.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      
      // Try to parse as-is first
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        // If parsing fails, try to find the last complete object
        console.log('Initial parse failed, attempting to fix truncated JSON...');
        
        // Count braces to find where JSON might be truncated
        let braceCount = 0;
        let lastValidIndex = 0;
        
        for (let i = 0; i < cleaned.length; i++) {
          if (cleaned[i] === '{') braceCount++;
          if (cleaned[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              lastValidIndex = i + 1;
              break;
            }
          }
        }
        
        if (lastValidIndex > 0) {
          const truncatedJson = cleaned.substring(0, lastValidIndex);
          try {
            return JSON.parse(truncatedJson);
          } catch (e2) {
            // Try adding closing braces if still unbalanced
            let fixedJson = cleaned;
            let openBraces = (fixedJson.match(/{/g) || []).length;
            let closeBraces = (fixedJson.match(/}/g) || []).length;
            
            // Add missing closing braces
            while (closeBraces < openBraces) {
              // Remove any trailing incomplete content after last comma
              fixedJson = fixedJson.replace(/,\s*"[^"]*"?\s*:?\s*[^,}]*$/, '');
              fixedJson += '}';
              closeBraces++;
            }
            
            // Also balance brackets
            let openBrackets = (fixedJson.match(/\[/g) || []).length;
            let closeBrackets = (fixedJson.match(/\]/g) || []).length;
            while (closeBrackets < openBrackets) {
              fixedJson = fixedJson.replace(/,\s*$/, '');
              fixedJson += ']';
              closeBrackets++;
            }
            
            return JSON.parse(fixedJson);
          }
        }
        
        throw e;
      }
    };
    
    // Extract and parse JSON from the response with proper error handling
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON structure found in AI response');
        console.error('Response preview:', content?.substring(0, 500) || 'empty');
        throw new Error('Invalid analysis response format');
      }
      
      analysis = cleanAndParseJSON(jsonMatch[0]);
      
      // Validate required fields and provide defaults for missing ones
      if (!analysis.proficiencyLevel) {
        analysis.proficiencyLevel = 'Intermediate';
      }
      if (!analysis.summary) {
        analysis.summary = 'Analysis completed. Please review the detailed feedback below.';
      }
      
      // Ensure all required nested objects exist with defaults
      const ensureScoreObject = (obj: any, key: string) => {
        if (!obj[key]) obj[key] = { score: 5, feedback: 'No specific feedback available.' };
        if (typeof obj[key].score !== 'number') obj[key].score = 5;
      };
      
      if (!analysis.voiceModulation) analysis.voiceModulation = { score: 5 };
      ensureScoreObject(analysis.voiceModulation, 'voiceClarity');
      ensureScoreObject(analysis.voiceModulation, 'tonalVariation');
      ensureScoreObject(analysis.voiceModulation, 'paceAndPauses');
      ensureScoreObject(analysis.voiceModulation, 'fillersAndVerbalHabits');
      
      if (!analysis.thoughtStructure) analysis.thoughtStructure = { score: 5 };
      ensureScoreObject(analysis.thoughtStructure, 'purposeArticulation');
      ensureScoreObject(analysis.thoughtStructure, 'logicalFlow');
      ensureScoreObject(analysis.thoughtStructure, 'signposting');
      ensureScoreObject(analysis.thoughtStructure, 'closureStrength');
      
      if (!analysis.vocabulary) analysis.vocabulary = { score: 5 };
      ensureScoreObject(analysis.vocabulary, 'sentenceEconomy');
      ensureScoreObject(analysis.vocabulary, 'specificity');
      ensureScoreObject(analysis.vocabulary, 'redundancyControl');
      ensureScoreObject(analysis.vocabulary, 'confidenceOfPhrasing');
      ensureScoreObject(analysis.vocabulary, 'grammar');
      
    } catch (parseError) {
      const parseErrorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error('Failed to parse AI response JSON:', parseErrorMessage);
      console.error('Raw content length:', content?.length || 0);
      console.error('Content preview:', content?.substring(0, 1000) || 'empty');
      throw new Error('Failed to process analysis results. The AI response was incomplete. Please try again.');
    }
    
    console.log('Analysis complete - Proficiency:', analysis.proficiencyLevel, 'WPM:', analysis.wordsPerMinute);
    
    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in analyze-speech function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
