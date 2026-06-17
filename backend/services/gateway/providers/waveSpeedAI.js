// backend/services/gateway/providers/waveSpeedAI.js
// Endpoint oficial: https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit
// Documentação: https://wavespeed.ai/docs/docs-api/wavespeed-ai/qwen-image-edit

const WAVESPEED_BASE_URL = 'https://api.wavespeed.ai/api/v3';
const WAVESPEED_ENDPOINT = '/wavespeed-ai/qwen-image/edit';
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 15; // 45s total

/**
 * Constrói prompt adaptativo baseado na dificuldade da tarefa e tipo de superfície (IRT-Router).
 * Suporta pisos, paredes, tetos, carrocerias e móveis.
 */
function buildMaterialPrompt(material, context) {
  const difficulty = context?.difficulty || 'low';
  const surfaceType = context?.surfaceType || 'floor';
  const surfaceLabel = { floor: 'floor surface', wall: 'wall surface', ceiling: 'ceiling', 'car-body': 'car body', furniture: 'furniture surface' }[surfaceType] || 'surface';
  const lightingHint = context?.lighting?.direction && context.lighting.direction !== 'unknown'
    ? `, maintaining ${context.lighting.direction} lighting direction`
    : '';

  const baseInstruction = `Apply ${material.color} ${material.type} (${material.dimensions}) to the ${surfaceLabel}. Keep all other elements exactly as they are, preserving the original scene structure.`;

  if (difficulty === 'high') {
    return `${baseInstruction} This is a complex scene with multiple objects and challenging lighting. Preserve EXACTLY: all furniture positions, shadow directions and intensities, wall colors and textures, ceiling, decorations, and all non-target elements. Apply realistic reflections on the new surface. The material application must be seamless and photorealistic${lightingHint}.`;
  }

  if (difficulty === 'medium') {
    return `${baseInstruction} Keep all furniture, shadows, walls, ceiling and decorations exactly as they are. Apply realistic texture with proper perspective${lightingHint}. Photorealistic result.`;
  }

  return `${baseInstruction} Keep all furniture, shadows, walls, ceiling and decorations exactly as they are${lightingHint}. Photorealistic result.`;
}

async function extractImage(data, signal) {
  const outputs = data?.data?.outputs;
  if (Array.isArray(outputs) && outputs.length > 0) {
    const output = outputs[0];
    if (typeof output === 'string' && output.startsWith('http')) {
      const imgResp = await fetch(output, { signal });
      const arrayBuffer = await imgResp.arrayBuffer();
      return `data:image/jpeg;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    }
    if (typeof output === 'string' && output.length > 0) {
      return output.startsWith('data:') ? output : `data:image/jpeg;base64,${output}`;
    }
  }

  const imageValue = data?.output?.results?.[0]?.image;
  if (imageValue) {
    if (imageValue.startsWith('http')) {
      const imgResp = await fetch(imageValue, { signal });
      const arrayBuffer = await imgResp.arrayBuffer();
      return `data:image/jpeg;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    }
    return imageValue.startsWith('data:') ? imageValue : `data:image/jpeg;base64,${imageValue}`;
  }

  if (data?.data?.[0]?.url) {
    const imgResp = await fetch(data.data[0].url, { signal });
    const arrayBuffer = await imgResp.arrayBuffer();
    return `data:image/jpeg;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
  }
  if (data?.data?.[0]?.b64_json) {
    return `data:image/jpeg;base64,${data.data[0].b64_json}`;
  }

  return null;
}

async function pollResult(taskId, apiKey, signal) {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const resp = await fetch(`${WAVESPEED_BASE_URL}/predictions/${taskId}/result`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal,
    });

    if (!resp.ok) {
      throw new Error(`WaveSpeedAI polling HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const status = data?.data?.status || data?.status;

    if (status === 'completed' || status === 'succeeded') {
      return { data: data.data };
    }
    if (status === 'failed' || status === 'error') {
      throw new Error(`WaveSpeedAI task failed: ${JSON.stringify(data).slice(0, 200)}`);
    }
    console.log(`[WaveSpeedAI] Polling attempt ${attempt + 1}/${POLL_MAX_ATTEMPTS}, status: ${status}`);
  }
  throw new Error(`WaveSpeedAI timeout after ${POLL_MAX_ATTEMPTS} polling attempts`);
}

export async function waveSpeedAI(imageBase64, material, context, signal) {
  const apiKey = process.env.WAVESPEED_API_KEY;
  if (!apiKey) throw new Error('WAVESPEED_API_KEY not set');

  const prompt = buildMaterialPrompt(material, context);
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const response = await fetch(`${WAVESPEED_BASE_URL}${WAVESPEED_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: cleanBase64,
      prompt,
      size: '1024x1024',
      seed: -1,
      output_format: 'jpeg',
      enable_base64_output: true,
      enable_sync_mode: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`WaveSpeedAI HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();

  let editedImageBase64 = await extractImage(data, signal);

  if (!editedImageBase64) {
    const taskId = data?.data?.id || data?.id;
    if (taskId) {
      console.log(`[WaveSpeedAI] Modo assíncrono, task ID: ${taskId}`);
      const pollData = await pollResult(taskId, apiKey, signal);
      editedImageBase64 = await extractImage(pollData, signal);
    }
  }

  if (!editedImageBase64) {
    console.log('[WaveSpeedAI] Resposta inesperada:', JSON.stringify(data).slice(0, 500));
    throw new Error('WaveSpeedAI não retornou imagem');
  }

  return { success: true, editedImageBase64, fidelity: 0.85 };
}
