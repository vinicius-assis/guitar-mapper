export function ChordLegend() {
  return (
    <ul className="legend">
      <li>
        <span className="swatch swatch--root" aria-hidden="true" />
        Fundamental
      </li>
      <li>
        <span className="swatch swatch--chord" aria-hidden="true" />
        Nota do acorde
      </li>
      <li>○ Corda solta</li>
      <li>× Corda abafada</li>
    </ul>
  );
}
