export async function localFallback(imageBase64, material, context, signal) {
  const surfaceLabel = { floor: 'à superfície', wall: 'à parede', ceiling: 'ao teto', 'car-body': 'à carroceria', furniture: 'ao móvel' }[context?.surfaceType] || 'à superfície';
  return {
    success: false,
    fallback: true,
    editedImageBase64: null,
    fidelity: 0.0,
    fallbackDescription: `Simulação indisponível. O material '${material.type} ${material.color} ${material.dimensions}' seria aplicado ${surfaceLabel}.`,
  };
}
