import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// AI price recommendation. Reads the job title, description, and context,
// and returns a fair recommended price for a teen to charge.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, description, category, priceModel, state } = await req.json();
    if (!title || !title.trim()) return Response.json({ error: 'title required' }, { status: 400 });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a pricing advisor for "Kickstart", a neighborhood marketplace where teens (ages 13-17) do local jobs for neighbors. Given the job details below, recommend a fair price.

Job title: ${title}
Description: ${description || '(none)'}
Category: ${category || 'unknown — infer from the title and description'}
Price model: ${priceModel === 'HOURLY' ? 'per hour' : 'flat fee'}
State: ${state || 'unknown'}

Consider:
- The typical market rate for this type of work done by a responsible teen (not a professional adult)
- The complexity, tools needed, and estimated time involved
- That this is teen labor, so prices should be fair but modest
- For hourly jobs, recommend a per-hour rate; for fixed jobs, recommend a total flat price
- Keep the recommendation between $10 and $100

Respond with:
- recommended_price: a number (the suggested price in USD)
- min_price: a number (the low end of a fair range)
- max_price: a number (the high end of a fair range)
- reason: one short sentence explaining the recommendation
- confidence: "high" or "low"`,
      response_json_schema: {
        type: 'object',
        properties: {
          recommended_price: { type: 'number' },
          min_price: { type: 'number' },
          max_price: { type: 'number' },
          reason: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'low'] },
        },
        required: ['recommended_price', 'min_price', 'max_price', 'reason', 'confidence'],
      },
    });

    return Response.json({ recommendation: result });
  } catch (error) {
    console.error('recommendPrice error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});