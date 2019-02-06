/** getElementById with exception handling. */
export function getElementById(id)
{
  const el = document.getElementById(id);
  if(!el) {throw new Error(`Element with id ${id} does not exist.`);}
  return el;
}
