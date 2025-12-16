import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, fileName, mimeType } = await req.json();
    
    if (!audio) {
      throw new Error('No audio/video data provided');
    }

    console.log('Received file:', fileName, 'Type:', mimeType);

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

Return your analysis as a valid JSON object with this exact structure:
{
  "transcription": "<brief summary or key quotes from what was said>",
  "voiceModulation": {
    "score": <number 1-10>,
    "voiceClarity": { "score": <number 1-10>, "feedback": "<specific feedback based on what you heard>" },
    "tonalVariation": { "score": <number 1-10>, "feedback": "<specific feedback based on what you heard>" },
    "paceAndPauses": { "score": <number 1-10>, "feedback": "<specific feedback based on what you heard>" },
    "fillersAndVerbalHabits": { "score": <number 1-10>, "feedback": "<specific feedback - mention actual fillers you heard>" }
  },
  "thoughtStructure": {
    "score": <number 1-10>,
    "purposeArticulation": { "score": <number 1-10>, "feedback": "<specific feedback based on content>" },
    "logicalFlow": { "score": <number 1-10>, "feedback": "<specific feedback based on content>" },
    "signposting": { "score": <number 1-10>, "feedback": "<specific feedback based on content>" },
    "closureStrength": { "score": <number 1-10>, "feedback": "<specific feedback based on content>" }
  },
  "vocabulary": {
    "score": <number 1-10>,
    "sentenceEconomy": { "score": <number 1-10>, "feedback": "<specific feedback with examples>" },
    "specificity": { "score": <number 1-10>, "feedback": "<specific feedback with examples>" },
    "redundancyControl": { "score": <number 1-10>, "feedback": "<specific feedback with examples>" },
    "confidenceOfPhrasing": { "score": <number 1-10>, "feedback": "<specific feedback with examples>" },
    "grammar": { "score": <number 1-10>, "feedback": "<specific feedback with examples>" }
  },
  "overallScore": <number 1-10>,
  "summary": "<2-3 sentence overall assessment referencing specific things from the speech>"
}

Scoring guidelines:
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

BE HONEST AND ACCURATE. Base ALL feedback on ACTUAL content from the recording.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this speech recording. Listen carefully and provide detailed, specific feedback based on what the speaker actually says and how they say it.'
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
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not extract JSON from:', content);
      throw new Error('Invalid analysis response format');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    console.log('Analysis complete - Overall score:', analysis.overallScore);
    
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
