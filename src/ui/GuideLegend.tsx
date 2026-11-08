export function GuideLegend() {
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
      <li>
        <span className="swatch swatch--guide" aria-hidden="true" />
        Nota-guia (3ª e 7ª)
      </li>
      <li>× Corda abafada</li>
    </ul>
  );
}
