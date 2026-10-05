// Browser call to the Claude API with the visitor's own key. The key is passed in per call and never stored.
// The SDK is loaded only when a visitor runs a live assessment, so it adds nothing to the normal page load.
import type { LiveOutput } from './liveAssessment';
import type { z } from 'zod';

export const LIVE_MODEL = 'claude-opus-5-5';

export class LiveAssessmentError extends Error {}

export async function requestLiveAssessment(opts: {
  apiKey: string;
  system: string;
  ruleId: string;
  schema: z.ZodType<LiveOutput>;
  signal?: AbortSignal;
}): Promise<LiveOutput> {
  const [{ default: Anthropic }, { betaZodOutputFormat }] = await Promise.all([import('@anthropic-ai/sdk'), import('@anthropic-ai/sdk/helpers/beta/zod')]);
  // dangerouslyAllowBrowser sends the anthropic-dangerous-direct-browser-access header. Acceptable here only
  // because the key belongs to the visitor, lives in memory for this page, and goes straight to Anthropic.
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
  try {
    const response = await client.beta.messages.parse(
      {
        model: LIVE_MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'high', format: betaZodOutputFormat(opts.schema) },
        system: opts.system,
        messages: [{ role: 'user', content: `Assess submission ${opts.ruleId} against all 15 criteria. Return findings only.` }],
      },
      { signal: opts.signal },
    );
    if (response.stop_reason === 'refusal') throw new LiveAssessmentError('The model declined this request. Try again or assess the rule manually.');
    if (response.stop_reason === 'max_tokens') throw new LiveAssessmentError('The response was cut off before it finished. Try again.');
    if (!response.parsed_output) throw new LiveAssessmentError('The response did not match the expected format. Try again.');
    return response.parsed_output;
  } catch (e) {
    if (e instanceof LiveAssessmentError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new LiveAssessmentError('The API key was not accepted. Check it and try again.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new LiveAssessmentError('This API key does not have access to the model.');
    if (e instanceof Anthropic.RateLimitError) throw new LiveAssessmentError('Rate limit reached for this key. Wait a minute and try again.');
    if (e instanceof Anthropic.APIUserAbortError) throw new LiveAssessmentError('Cancelled.');
    if (e instanceof Anthropic.APIConnectionError) throw new LiveAssessmentError('Could not reach the Claude API from this browser. Check the network and try again.');
    if (e instanceof Anthropic.APIError) throw new LiveAssessmentError(`The Claude API returned an error (${e.status ?? 'no status'}). Try again later.`);
    throw e;
  }
}
