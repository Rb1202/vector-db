export function randomLevel(mL) {
  const u = Math.random();

  return Math.floor(
    -Math.log(u) * mL
  );
}