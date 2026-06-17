export async function cometAPI(imageBase64, material, context, signal) {
  const apiKey = process.env.COMET_API_KEY;
  if (!apiKey) throw new Error('COMET_API_KEY not set');
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const surfaceLabel = context?.surfaceType === 'car-body' ? 'car body' : context?.surfaceType === 'wall' ? 'wall' : context?.surfaceType === 'ceiling' ? 'ceiling' : 'surface';
  const prompt = `Apply ${material.color} ${material.type} (${material.dimensions}) to the ${surfaceLabel}. Keep all scene elements exactly as they are. Photorealistic result.`;

  const response = await fetch('https://api.cometapi.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen-image-edit', image: cleanBase64, prompt }),
    signal,
  });
  if (!response.ok) throw new Error(`CometAPI HTTP ${response.status}`);
  const data = await response.json();

  let editedImageBase64 = null;
  if (data.image_base64) {
    editedImageBase64 = `data:image/jpeg;base64,${data.image_base64}`;
  } else if (data.image_url) {
    const imgResp = await fetch(data.image_url, { signal });
    const buf = await imgResp.arrayBuffer();
    editedImageBase64 = `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`;
  }
  if (!editedImageBase64) throw new Error('CometAPI: sem imagem na resposta');
  return { success: true, editedImageBase64, fidelity: 0.80 };
}
