# Adversarial Minesweeper

A twist on the classic game where mines are placed *after* you click. The board updates adversarially to punish guessing and ensure only logically safe moves are rewarded.

This version of Minesweeper uses constraint satisfaction and backtracking to place mines only when consistent with all revealed information—so every mistake is your fault.

## Features

- Delayed, adversarial mine placement
- Smart backtracking with pruning to enforce constraints
- Intentionally unfair (but logically consistent)
- Some boards may require guessing – this results in an automatic loss by adversarial mine placement

## How to Play

1. Click on any square to begin.
2. The computer will place mines *after* your first click.
3. Mines will never violate the revealed numbers.
4. Guessing will be punished. Think before you click!