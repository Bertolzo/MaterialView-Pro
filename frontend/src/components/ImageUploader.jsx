// frontend/src/components/ImageUploader.jsx
export default function ImageUploader({ onImage }) {
  function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label htmlFor="image-upload">Selecione uma imagem do ambiente:</label>
      <input
        id="image-upload"
        type="file"
        accept="image/*"
        onChange={handleChange}
      />
    </div>
  );
}
