export function ArpeggioLegend() {
  return (
    <ul className="legend">
      <li>
        <span className="swatch swatch--root" aria-hidden="true" />
        Tônica
      </li>
      <li>
        <span className="swatch swatch--chord" aria-hidden="true" />
        Nota do arpejo
      </li>
      <li>
        <span className="swatch swatch--scale" aria-hidden="true" />
        Outra nota da escala
      </li>
    </ul>
  );
}
