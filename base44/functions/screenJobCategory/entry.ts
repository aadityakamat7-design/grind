import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// AI category + minimum-price check. Reads the job title + description and
// determines the best-fit category, then surfaces the minimum price for that
// category. The neighbor confirms or corrects the category before posting.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, description, priceModel } = await req.json();
    if (!title || !title.trim()) return Response.json({ error: 'title required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a job-category classifier for "Blockwork", a teen jobs marketplace. Read the job title and description below and pick the ONE category that best fits from this list:
- tutoring (academic help, homework, teaching a skill like music or coding)
- lawn_care (mowing, weeding, raking, yard cleanup, gardening)
- pet_sitting (dog walking, pet feeding, pet care)
- tech_help (phone setup, Wi-Fi, computer help, smart home)
- babysitting (childcare)
- car_washing (washing/detailing vehicles)
- odd_jobs (moving boxes, organizing, errands, anything that doesn't fit the above)

Job title: ${title}
Description: ${description || '(none)'}

Respond with:
- category: the single best-fit category from the list above (use the exact value).
- confidence: "high" if the match is obvious, "low" if it could fit multiple categories or is ambiguous.
- reason: one short sentence explaining why this category fits.`,
      response_json_schema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['tutoring', 'lawn_care', 'pet_sitting', 'tech_help', 'babysitting', 'car_washing', 'odd_jobs'] },
          confidence: { type: 'string', enum: ['high', 'low'] },
          reason: { type: 'string' },
        },
        required: ['category', 'confidence', 'reason'],
      },
    });

    return Response.json({ screening: result });
  } catch (error) {
    console.error('screenJobCategory error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});