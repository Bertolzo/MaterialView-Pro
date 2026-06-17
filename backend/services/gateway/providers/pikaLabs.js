export async function pikaLabs(imageBase64, material, context, signal) {
  const apiKey = process.env.PIKA_API_KEY;
  if (!apiKey) throw new Error('PIKA_API_KEY not set');
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const prompt = `Replace the floor with ${material.color} ${material.type} tiles (${material.dimensions}). Keep all furniture, shadows and walls exactly as they are. Photorealistic result.`;

  const response = await fetch('https://api.pika.art/v1/generate', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: cleanBase64, prompt }),
    signal,
  });
  if (!response.ok) throw new Error(`Pika Labs HTTP ${response.status}`);
  const data = await response.json();

  let editedImageBase64 = null;
  if (data.image_base64) {
    editedImageBase64 = `data:image/jpeg;base64,${data.image_base64}`;
  } else if (data.image_url) {
    const imgResp = await fetch(data.image_url, { signal });
    const buf = await imgResp.arrayBuffer();
    editedImageBase64 = `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`;
  }
  if (!editedImageBase64) throw new Error('Pika Labs: sem imagem na resposta');
  return { success: true, editedImageBase64, fidelity: 0.75 };
}
