# Boardium 🎲

**Boardium** is a centralised hub for classic board games (e.g. Chess, Checkers, Ludo), supporting:

- 🌐 Online multiplayer
- 🤖 Bot opponents with multiple difficulty levels
- 🏗️ A shared backend architecture to avoid duplicated game logic

> This repository is under active development and follows a structured team workflow.

---

## 📁 Project Structure

```
Boardium/
├── backend/        # Node.js + Express API
│   ├── src/
│   │   └── index.js
│   └── package.json
│
├── frontend/       # React (Vite) frontend
│   ├── src/
│   │   └── App.jsx
│   └── package.json
│
├── docs/           # Diagrams, proposal material, notes
├── .gitignore
└── README.md
```

---

## ✅ Current Status

### Implemented
- React frontend scaffolded with Vite
- Express backend server running on port `3001`
- CORS configured
- Frontend successfully connects to backend via `/health` endpoint
- Clean Git workflow using `main` + `dev` branches

### Not Yet Implemented
- Authentication
- Game logic (Chess, Checkers, Ludo)
- Database schema (SQLite)
- Matchmaking or polling

---

## 🚀 Getting Started (For Team Members)

### 1. Clone the repository (SSH required)

```bash
git clone git@github.com:<ORG-OR-USERNAME>/Boardium.git
cd Boardium
```

> Make sure you have added your SSH key to GitHub before cloning.

### 2. Switch to the development branch

```bash
git checkout dev
```

> All active development happens on `dev`, not `main`.

### 3. Install dependencies

**Backend:**

```bash
cd backend
npm install
```

**Frontend:**

```bash
cd ../frontend
npm install
```

### 4. Run the application (two terminals)

**Terminal 1 – Backend:**

```bash
cd backend
npm run dev
```

Expected output:

```
Server running on port 3001
```

**Terminal 2 – Frontend:**

```bash
cd frontend
npm run dev
```

Open the URL shown (usually `http://localhost:5173`). You should see:

```
Boardium
Backend status: ok
```

---

## 🔁 Development Workflow

> ⚠️ **Do NOT commit directly to `main` or `dev`.**

### Branch Rules

| Branch | Purpose |
|--------|---------|
| `main` | Stable, release-ready code only |
| `dev` | Integration branch |
| `feature/*` | All new work |

### Starting Work

```bash
git checkout dev
git pull origin dev
git checkout -b feature/<short-description>
```

**Branch name examples:**
- `feature/chess-engine`
- `feature/matchmaking`
- `feature/sqlite-schema`

### Committing & Pushing

```bash
git add .
git commit -m "feat: short meaningful message"
git push origin feature/<short-description>
```

Then open a **Pull Request into `dev`**.

---

## 🧹 Git Hygiene

- `node_modules/` is ignored via `.gitignore`
- Each developer runs `npm install` locally
- No secrets or database files should ever be committed

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database *(planned)* | SQLite |
| Version Control | Git + GitHub |
| Dev Workflow | Feature branches + Pull Requests |

---

## 📌 Next Planned Steps

- [ ] Define SQLite schema (users, matches, moves)
- [ ] Add core API routes: `/create-match`, `/move`, `/state`
- [ ] Implement shared game engine interface
- [ ] Add polling for online matches
- [ ] Implement bots with adjustable difficulty

---

## 👥 Team Notes

If something doesn't run:

1. Check you're on the `dev` branch
2. Run `npm install` in both `backend/` and `frontend/`
3. Make sure **both** servers are running simultaneously

If still stuck, ask in the group chat before force-pushing or rebasing.
