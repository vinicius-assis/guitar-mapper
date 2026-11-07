export function ScaleLegend({ target = false }: { target?: boolean }) {
  return (
    <ul className="legend">
      <li>
        <span className="swatch swatch--root" aria-hidden="true" />
        Tônica
      </li>
      <li>
        <span className="swatch swatch--scale" aria-hidden="true" />
        Nota da escala
      </li>
      {target && (
        <li>
          <span className="swatch swatch--target" aria-hidden="true" />
          Nota destacada
        </li>
      )}
    </ul>
  );
}
