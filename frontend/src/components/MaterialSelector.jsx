// frontend/src/components/MaterialSelector.jsx
export default function MaterialSelector({ materials, selected, onChange }) {
  function handleChange(e) {
    const index = Number(e.target.value);
    onChange(materials[index]);
  }

  const selectedIndex = materials.indexOf(selected);

  return (
    <div>
      <label htmlFor="material-select">Selecione o material:</label>
      <select
        id="material-select"
        value={selectedIndex >= 0 ? selectedIndex : 0}
        onChange={handleChange}
      >
        {materials.map((mat, i) => (
          <option key={i} value={i}>
            {mat.type} — {mat.color} ({mat.dimensions})
          </option>
        ))}
      </select>
    </div>
  );
}
