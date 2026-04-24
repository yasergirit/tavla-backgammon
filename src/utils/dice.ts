const DEV_LOG: number[][] = [];

const randomUnit = (): number => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0xffffffff;
  }
  return Math.random();
};

export const rollDie = (): number => Math.floor(randomUnit() * 6) + 1;

export const rollDice = (): [number, number] => {
  const dice: [number, number] = [rollDie(), rollDie()];
  if (import.meta.env.DEV) {
    DEV_LOG.unshift(dice);
    DEV_LOG.splice(20);
  }
  return dice;
};

export const getDiceDebugLog = (): number[][] => [...DEV_LOG];
