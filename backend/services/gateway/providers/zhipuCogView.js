function buildFloorPrompt(material, context) {
  const lightingHint = context?.lighting?.direction !== 'unknown'
    ? `, maintaining ${context.lighting.direction} lighting`
    : '';
  return `Replace the entire floor with ${material.color} ${material.type} tiles (${material.dimensions}). Keep all furniture, shadows, walls, ceiling and decorations exactly as they are${lightingHint}. Photorealistic result.`;
}

export async function zhipuCogView(imageBase64, material, context, signal) {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) throw new Error('ZHIPU_API_KEY not set');

  const prompt = buildFloorPrompt(material, context);
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/edits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'cogview-3-flash',
      image: cleanBase64,
      prompt,
      n: 1,
      size: '1024x1024',
    }),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Zhipu HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error('Zhipu não retornou URL de imagem');

  const imgResp = await fetch(imageUrl, { signal });
  const arrayBuffer = await imgResp.arrayBuffer();
  const b64 = Buffer.from(arrayBuffer).toString('base64');

  return {
    success: true,
    editedImageBase64: `data:image/jpeg;base64,${b64}`,
    fidelity: 0.78,
  };
}
