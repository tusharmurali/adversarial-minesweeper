# Adversarial Minesweeper

A version of the classic game where mines are placed *after* you click. The board updates adversarially to punish guessing and ensure only logically safe moves are rewarded.

This version uses constraint satisfaction and backtracking to manifest mines only when consistent with revealed information. It includes a Windows 95 UI overhaul using accurate bevels, MS Sans Serif, and CSS-based pixel art.

## Features

- Delayed, adversarial mine placement
- Accurate Win95 UI and CSS pixel-art sprites
- Backtracking with pruning to enforce constraints
- Automatic loss on any move that requires guessing

## How to Play

1. Click on any square to begin (first click is always safe).
2. The computer will place mines after your first click.
3. Mines will never violate the revealed numbers.
4. Guessing will be punished. Think before you click!
