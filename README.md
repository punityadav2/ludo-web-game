# Ludo Master

A modern, web-based implementation of the classic Ludo board game. Built with HTML, CSS, and Vanilla JavaScript.

## Features

- **Multiplayer Support**: Play with 2, 3, or 4 players.
- **Dynamic Gameplay**: 
  - Real-time token movement animations.
  - Dice rolling mechanics.
  - Kill/Capture system (send opponent tokens back home).
  - Safe spots (Stars) where tokens cannot be captured.
- **Audio Effects**: Sound effects for dice rolls, token kills, and winning.
- **Responsive Design**: Playable on different screen sizes.
- **Custom Names**: Enter names for each player before starting.

## How to Play

1. **Start the Game**: Open `index.html` in your web browser.
2. **Select Players**: Choose the number of players (2, 3, or 4).
3. **Enter Names**: Input names for each color.
4. **Roll the Dice**: Click your team's dice (in your home base) when it's your turn.
   - You need a **6** to move a token out of home.
   - Rolling a **6** gives you an extra turn.
   - Capturing an opponent's token gives you an extra turn.
5. **Win**: The first player to get all 4 tokens to the center (Finish) wins!

## Project Structure

- `index.html`: Main game structure.
- `style.css`: Styling for the board, tokens, and UI.
- `script.js`: Game logic (state management, movement, rules).
- `assets/`: Contains images and audio files.


