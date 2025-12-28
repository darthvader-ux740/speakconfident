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
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured. Please add it to your Supabase secrets.');
    }

    // STEP 1: Use Groq Whisper for high-quality transcription
    console.log('Step 1: Transcribing audio with Groq Whisper...');
    
    // Convert base64 to binary for Groq
    const audioBuffer = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    
    // Create form data for Groq Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, fileName || 'audio.webm');
    formData.append('model', 'whisper-large-v3-turbo'); // 228x faster than real-time, FREE
    formData.append('response_format', 'verbose_json'); // Get word-level timestamps & confidence
    formData.append('temperature', '0'); // More deterministic output
    
    const transcriptionResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('Groq Whisper error:', transcriptionResponse.status, errorText);
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    console.log('Transcription complete. Duration:', transcriptionData.duration, 'seconds');
    
    // Extract transcript and word-level data
    const fullTranscript = transcriptionData.text;
    const segments = transcriptionData.segments || [];
    const words = transcriptionData.words || [];
    
    // Identify unclear words based on confidence scores (< 0.7 threshold)
    const unclearWords: Array<{word: string, timestamp: number, confidence: number}> = [];
    if (words.length > 0) {
      words.forEach((wordData: any) => {
        if (wordData.confidence && wordData.confidence < 0.7) {
          unclearWords.push({
            word: wordData.word,
            timestamp: wordData.start,
            confidence: wordData.confidence,
          });
        }
      });
    }
    
    console.log(`Found ${unclearWords.length} unclear/mispronounced words`);
    
    // STEP 2: Use Gemini for speech analysis with the clean transcript
    console.log('Step 2: Analyzing speech with Gemini...');

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
            content: `You are an expert public speaking coach. You will analyze a speech based on its transcript and provide detailed feedback.

IMPORTANT: You are receiving a TRANSCRIPT that was generated by Whisper AI. The transcript is highly accurate (95%+ accuracy).

UNCLEAR/MISPRONOUNCED WORDS:
${unclearWords.length > 0 ? `The following words had LOW CONFIDENCE scores (< 0.7), indicating unclear pronunciation or mispronunciation:\n${unclearWords.map(w => `- "${w.word}" at ${w.timestamp.toFixed(1)}s (confidence: ${(w.confidence * 100).toFixed(0)}%)`).join('\n')}` : 'No words with low confidence detected - pronunciation was generally clear.'}

TRANSCRIPT METADATA:
- Duration: ${transcriptionData.duration.toFixed(1)} seconds
- Total words: ${words.length}
- Estimated WPM: ${Math.round((words.length / transcriptionData.duration) * 60)}

ANALYSIS INSTRUCTIONS:
1. Read the transcript carefully
2. Note the unclear/mispronounced words listed above
3. Analyze speech patterns, filler words, structure, and vocabulary
4. Provide specific feedback with exact quotes from the transcript

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
      "word": "<the mispronounced or unclear word from the list above>",
      "timestamp": "<time in format '0:15'>",
      "issue": "<what was wrong - e.g., 'unclear pronunciation', 'low confidence', 'slurred'>",
      "correctPronunciation": "<how it should be pronounced, if applicable>"
    }
  ],
  "wordsPerMinute": <calculated WPM based on metadata above>,
  "totalWords": <total word count from metadata>,
  "durationSeconds": <duration from metadata>,
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

TIMESTAMPED FEEDBACK: Use the word-level timestamps from Whisper to provide precise feedback. Example: "At 0:30-0:45, excessive filler words: 'um' (0:32), 'like' (0:38), 'you know' (0:43)."

MISPRONUNCIATIONS: Focus on the words listed above with low confidence scores. These indicate unclear pronunciation or mispronunciation that needs attention.

STRENGTHS: Identify the top 3 things the speaker did well based on the transcript. Quote specific phrases.

DEVELOPMENT AREAS: Identify the top 3 areas that need improvement. Reference specific parts of the transcript.

DRILL SUGGESTION: Provide ONE specific, actionable practice exercise targeting the most critical issue.

BE HONEST AND ACCURATE. Base ALL feedback on the TRANSCRIPT provided below.`
          },
          {
            role: 'user',
            content: `Please analyze this speech transcript and provide detailed feedback.

FULL TRANSCRIPT:
"""
${fullTranscript}
"""

SPEECH METADATA:
- Duration: ${transcriptionData.duration.toFixed(1)} seconds
- Total Words: ${words.length}
- Words Per Minute: ${Math.round((words.length / transcriptionData.duration) * 60)}

${unclearWords.length > 0 ? `PRONUNCIATION ISSUES DETECTED:
${unclearWords.map(w => `- "${w.word}" at ${Math.floor(w.timestamp / 60)}:${(w.timestamp % 60).toFixed(0).padStart(2, '0')} (confidence: ${(w.confidence * 100).toFixed(0)}%)`).join('\n')}

Please note these words in the mispronunciations array with specific feedback.` : 'No significant pronunciation issues detected.'}

Please provide a complete analysis following the JSON structure specified in the system prompt. Include specific quotes from the transcript to support your feedback.`
          }
        ],
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('AI analysis error:', analysisResponse.status, errorText);
      
      // Check if it's a service outage
      if (analysisResponse.status === 503 || errorText.includes('Temporarily unavailable')) {
        throw new Error('The AI service is temporarily unavailable. Please try again in a few minutes.');
      }
      
      // Check if it's a rate limit
      if (analysisResponse.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
      
      throw new Error(`AI service error (${analysisResponse.status}). Please try again.`);
    }

    const analysisData = await analysisResponse.json();
    console.log('Gemini analysis complete');
    
    const content = analysisData.choices[0].message.content;
    
    // Helper function to clean and fix truncated JSON
    const cleanAndParseJSON = (jsonStr: string): any => {
      console.log('Attempting to parse JSON of length:', jsonStr.length);
      
      // Remove any markdown code block markers
      let cleaned = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      
      // Try to parse as-is first (most reliable)
      try {
        return JSON.parse(cleaned);
      } catch (firstError) {
        console.log('First parse attempt failed:', (firstError as Error).message);
      }
      
      // Remove trailing commas before closing braces/brackets
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
      
      try {
        return JSON.parse(cleaned);
      } catch (secondError) {
        console.log('Second parse attempt failed:', (secondError as Error).message);
      }
      
      // Try to extract just the outermost JSON object
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extracted = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(extracted);
        } catch (thirdError) {
          console.log('Third parse attempt failed:', (thirdError as Error).message);
        }
      }
      
      // Final attempt: try to balance braces
      let fixedJson = cleaned;
      const openBraces = (fixedJson.match(/{/g) || []).length;
      const closeBraces = (fixedJson.match(/}/g) || []).length;
      const openBrackets = (fixedJson.match(/\[/g) || []).length;
      const closeBrackets = (fixedJson.match(/]/g) || []).length;
      
      console.log('Brace count - open:', openBraces, 'close:', closeBraces);
      console.log('Bracket count - open:', openBrackets, 'close:', closeBrackets);
      
      // Remove incomplete trailing content
      fixedJson = fixedJson.replace(/,\s*"[^"]*"?\s*:?\s*("[^"]*)?$/, '');
      
      // Add missing closing brackets
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixedJson += ']';
      }
      
      // Add missing closing braces
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixedJson += '}';
      }
      
      console.log('Fixed JSON length:', fixedJson.length);
      return JSON.parse(fixedJson);
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
      
      // Enrich analysis with accurate Whisper metadata
      if (!analysis.wordsPerMinute) {
        analysis.wordsPerMinute = Math.round((words.length / transcriptionData.duration) * 60);
      }
      if (!analysis.totalWords) {
        analysis.totalWords = words.length;
      }
      if (!analysis.durationSeconds) {
        analysis.durationSeconds = Math.round(transcriptionData.duration);
      }
      if (!analysis.fullTranscript) {
        analysis.fullTranscript = fullTranscript;
      }
      
      // Add mispronunciations from Whisper confidence scores if not provided
      if (!analysis.mispronunciations || analysis.mispronunciations.length === 0) {
        analysis.mispronunciations = unclearWords.slice(0, 10).map(w => ({
          word: w.word,
          timestamp: `${Math.floor(w.timestamp / 60)}:${(w.timestamp % 60).toFixed(0).padStart(2, '0')}`,
          issue: `Unclear pronunciation (${(w.confidence * 100).toFixed(0)}% confidence)`,
          correctPronunciation: w.word,
        }));
      }
      
      console.log('Analysis enriched with Whisper metadata:', {
        wpm: analysis.wordsPerMinute,
        totalWords: analysis.totalWords,
        duration: analysis.durationSeconds,
        mispronunciations: analysis.mispronunciations?.length || 0,
      });
      
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
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error in analyze-speech function:', error);
    console.error('Error message:', errorMessage);
    console.error('Error stack:', errorStack);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stack: errorStack,
        type: error?.constructor?.name || 'Unknown'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
