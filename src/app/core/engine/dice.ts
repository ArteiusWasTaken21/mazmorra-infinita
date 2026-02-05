import { randInt } from './rng';

export type Dice = 1 | 2 | 3;

export interface RollResult {
  dice: Dice;
  rolls: number[];
  total: number;
}

export function rollND6(rng: () => number, dice: Dice): RollResult {
  const rolls: number[] = [];
  for (let i = 0; i < dice; i++) rolls.push(randInt(rng, 1, 6));
  return { dice, rolls, total: rolls.reduce((a, b) => a + b, 0) };
}
