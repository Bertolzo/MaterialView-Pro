// frontend/src/components/ResultViewer.jsx
export default function ResultViewer({ result, error }) {
  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!result) {
    return null;
  }

  if (result.editedImageBase64) {
    return (
      <img
        src={result.editedImageBase64}
        alt="Simulação de piso"
        style={{ maxWidth: '100%' }}
      />
    );
  }

  // fallbackDescription já tratado como error em App.jsx
  return null;
}
