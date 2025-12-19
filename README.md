# 🎯 AtomFall — Correct-Only Mode

AtomFall is a browser-based educational reflex game built with **HTML5 Canvas and Vanilla JavaScript**.
The goal is simple: **click only the correct chemical element symbol** while ignoring all others.

---

## 🧪 Gameplay

- A **target element** (name, symbol, atomic number, atomic mass) is shown.
- Multiple circles fall from the top of the screen, each labeled with a chemical symbol.
- Only **one symbol matches the target**.

### Rules
- ✅ Click the **correct symbol** → gain score and combo
- ❌ Click a **wrong symbol** → no life lost, combo reset, small score penalty
- ⛔ Let the **correct symbol hit the floor** → lose a life
- ✔ Let **wrong symbols** fall → no penalty

Game ends when all lives are lost.

---

## 🎮 Controls

| Action | Input |
|------|------|
| Click symbol | Mouse / Touch |
| Pause / Resume | `P` |
| Reset | `R` |
| Toggle sound | Sound button |

---

## ⚙️ Features

- Dynamic difficulty scaling
- Combo-based scoring
- Accuracy tracking
- Local high score (LocalStorage)
- Particle effects and sound feedback
- Responsive Canvas rendering
- Educational chemistry elements dataset

---

## 🗂 Project Structure

```
.
├── index.html
├── game.js
├── style.css
└── README.md
```

---

## 🚀 How to Run

### Open locally
Simply open `index.html` in a modern browser.

### Run via local server (recommended)
```bash
python -m http.server
```
Then visit:
```
http://localhost:8000
```

---

## 🧠 Educational Purpose

This game helps with:
- Memorizing chemical symbols
- Improving reaction time
- Practicing selective attention
- Avoiding impulsive clicking

---

## 🔊 Audio

- Generated using the **Web Audio API**
- No external audio files
- Can be toggled on/off in-game

---

## 📦 Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)
- Canvas API
- Web Audio API
- LocalStorage

---

## 📜 License

Open-source — free to use, modify, and learn from.
