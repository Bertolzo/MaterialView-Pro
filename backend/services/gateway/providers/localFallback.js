export async function localFallback(imageBase64, material, context, signal) {
  return {
    success: false,
    fallback: true,
    editedImageBase64: null,
    fidelity: 0.0,
    fallbackDescription: `Simulação indisponível. O material '${material.type} ${material.color} ${material.dimensions}' seria aplicado ao piso.`,
  };
}
