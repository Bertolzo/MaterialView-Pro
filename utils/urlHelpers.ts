export function parseSimulationParams(search: string): {
  img: string | null;
  sku: string | null;
  x: number | null;
  y: number | null;
} {
  const params = new URLSearchParams(search);
  
  return {
    img: params.get('img'),
    sku: params.get('sku'),
    x: params.get('x') ? parseFloat(params.get('x')!) : null,
    y: params.get('y') ? parseFloat(params.get('y')!) : null
  };
}