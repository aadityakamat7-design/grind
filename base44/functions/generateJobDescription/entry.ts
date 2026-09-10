import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Generates a clear, friendly job description from a couple of keywords
// the neighbor types in. Uses the LLM so the neighbor doesn't have to write
// a full paragraph themselves.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, keywords } = await req.json();
    if (!keywords || !keywords.trim()) {
      return Response.json({ error: 'Please enter a few words about the job.' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a helpful assistant for "Blockwork", a neighborhood marketplace where teens (ages 13-17) do local jobs for neighbors. All work is outdoor (lawn care, car washing, yard work) or online (tutoring, tech help) — teens never enter a client's home.

Write a clear, friendly job description based on these details:
- Job title: ${title || '(not set yet)'}
- Key details from the neighbor: ${keywords}

The description should:
- Be 2-4 sentences, under 200 words
- Explain what needs to be done clearly so a teen knows exactly what to expect
- Mention any tools or prep the teen should bring or know about
- Be friendly, specific, and practical
- NOT include pay, scheduling, or contact info (those are handled separately)
- NOT mention anything about entering a home — all work is outdoor or online

Return only the description text.`,
      response_json_schema: {
        type: 'object',
        properties: {
          description: { type: 'string' },
        },
        required: ['description'],
      },
    });

    return Response.json({ description: result.description });
  } catch (error) {
    console.error('generateJobDescription error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});