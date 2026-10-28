export function Score({ coverage }: { coverage: number | null }) {
  const tone = coverage === null ? "" : coverage >= 75 ? "score-good" : coverage >= 50 ? "score-mid" : "score-low";
  return (
    <div className={`score ${tone}`}>
      {coverage === null ? "–" : `${coverage}%`}
      <small>keywords</small>
    </div>
  );
}
