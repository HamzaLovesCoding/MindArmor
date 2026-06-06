'use strict';

const { GoogleGenAI } = require('@google/genai');

// Gemini 2.0 Flash is fast, free-tier friendly, and supports native JSON mode.
// 2.5 Flash is also free-tier eligible but its endpoint gets congested often,
// so we default to 2.0. Override with GEMINI_MODEL for a different snapshot.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Exact system prompt from the feature spec.
const SYSTEM_PROMPT = `You are a CBT-trained reframing assistant inside a youth mental health app. The user will share one stressful thought. Your job is narrow and specific.

Return ONLY valid JSON in this exact shape, no markdown, no preamble:
{
  "distortion": "Name of the cognitive distortion (one of: catastrophizing, all-or-nothing thinking, mind reading, fortune telling, overgeneralization, personalization, should statements, emotional reasoning, mental filter, labeling)",
  "distortion_explanation": "One sentence explaining what this distortion is.",
  "why_it_misleads": "2-3 sentences on why this thinking pattern misrepresents reality, written warmly and non-judgmentally.",
  "reframe": "A balanced, realistic alternative thought in the user's voice. First person. Not toxic positivity — acknowledges difficulty while showing a fuller picture.",
  "action": "One concrete, small action the user could take in the next hour. Specific and doable.",
  "needs_human_support": false
}

Critical rules:
- NEVER diagnose. You are not a therapist.
- NEVER use clinical labels for the person ("you have anxiety" / "you are depressed").
- If the user's thought mentions suicide, self-harm, wanting to die, hurting others, abuse they're experiencing, or active substance overdose risk: set "needs_human_support" to true and put all other fields as empty strings. Do not attempt to reframe these thoughts.
- Tone: warm, brief, non-preachy. Like a thoughtful friend who happens to know CBT.
- Use "tú" / "you" — informal.
- The reframe is in the user's voice, first person ("I can…" / "Maybe…"), not advice-giving ("you should…").`;

const ES_SUFFIX = '\n\nRespond in Spanish (informal tú form). All JSON values in Spanish.';

function buildSystem(locale) {
  return locale === 'es' ? SYSTEM_PROMPT + ES_SUFFIX : SYSTEM_PROMPT;
}

// A conservative crisis backstop. The model is instructed to flag these too,
// but for a youth mental-health tool we never want to miss one — if the thought
// itself contains explicit self-harm / suicide language we short-circuit to the
// crisis card without sending anything to the model.
const CRISIS_RE = new RegExp([
  'kill (myself|me)', 'killing myself', 'suicid', 'want to die', 'wanna die',
  'end (my|it all|my life)', 'take my (own )?life', 'no reason to live',
  "don'?t want to (be alive|live)", 'better off dead', 'hurt(ing)? myself',
  'harm(ing)? myself', 'self[- ]?harm', 'cut(ting)? myself', 'overdose',
  // Spanish
  'matarme', 'me quiero morir', 'quiero morir(me)?', 'suicid', 'quitarme la vida',
  'acabar con mi vida', 'no quiero vivir', 'hacerme da[ñn]o', 'lastimarme', 'sobredosis',
].join('|'), 'i');

function isCrisisThought(text) {
  return CRISIS_RE.test(String(text || ''));
}

const CRISIS_RESULT = {
  distortion: '',
  distortion_explanation: '',
  why_it_misleads: '',
  reframe: '',
  action: '',
  needs_human_support: true,
};

// Strip markdown fences / preamble and parse the model's JSON defensively.
function parseReframeJSON(raw) {
  let text = String(raw || '').trim();
  // Remove ```json ... ``` or ``` ... ``` fences.
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  // Fall back to the first {...} block if there's any stray prose around it.
  if (text[0] !== '{') {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
  }
  const obj = JSON.parse(text);
  return {
    distortion: String(obj.distortion || ''),
    distortion_explanation: String(obj.distortion_explanation || ''),
    why_it_misleads: String(obj.why_it_misleads || ''),
    reframe: String(obj.reframe || ''),
    action: String(obj.action || ''),
    needs_human_support: obj.needs_human_support === true,
  };
}

// Lazily constructed so the app boots fine without a key configured.
let client = null;
function getClient() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return null;
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

// Free-tier Gemini endpoints occasionally return 503 UNAVAILABLE during demand
// spikes. A short retry with exponential backoff hides most of these from the
// user without papering over real errors.
function isTransient(err) {
  const status = err && (err.status || err.code);
  const msg = String((err && err.message) || '');
  return status === 503 || /UNAVAILABLE|503/i.test(msg);
}

async function generateReframe({ thought, locale }) {
  const c = getClient();
  if (!c) {
    const err = new Error('Assistant is not configured.');
    err.code = 'unavailable';
    throw err;
  }

  const callOnce = () => c.models.generateContent({
    model: MODEL,
    contents: thought,
    config: {
      systemInstruction: buildSystem(locale),
      // Native JSON mode — Gemini guarantees the response is valid JSON.
      responseMimeType: 'application/json',
      maxOutputTokens: 1000,
      // Low temperature for consistent CBT-style structured output.
      temperature: 0.4,
    },
  });

  let response;
  const delays = [400, 1200]; // ~1.6s total worst case before surfacing the error
  for (let attempt = 0; ; attempt++) {
    try {
      response = await callOnce();
      break;
    } catch (err) {
      if (attempt < delays.length && isTransient(err)) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
      throw err;
    }
  }

  const text = response.text || '';
  return parseReframeJSON(text);
}

module.exports = {
  MODEL,
  isCrisisThought,
  parseReframeJSON,
  generateReframe,
  CRISIS_RESULT,
  buildSystem,
};
