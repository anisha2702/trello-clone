# Trello Clone — SDE Intern Fullstack Assignment

A full-stack Kanban project management application replicating Trello's design and user experience.

---

## Tech Stack

| Layer      | Technology                            |
|------------|---------------------------------------|
| Frontend   | React 18, React Router v6, @dnd-kit   |
| Backend    | Node.js, Express.js                   |
| Database   | MySQL 8                               |
| Styling    | Custom CSS (no framework)             |
| DnD        | @dnd-kit/core + @dnd-kit/sortable     |
| HTTP       | Axios                                 |

---

## Features Implemented

### Core
- ✅ Multiple boards with custom background colors
- ✅ Create, rename, delete lists (columns)
- ✅ Drag-and-drop list reordering
- ✅ Create, edit, archive cards
- ✅ Drag-and-drop cards within and between lists
- ✅ Card labels (colored tags, per-board)
- ✅ Card due dates with overdue/today indicators
- ✅ Checklists with items (complete/incomplete)
- ✅ Assign members to cards
- ✅ Search cards by title (header search)
- ✅ Filter cards by labels, members, due date
- ✅ Card cover colors
- ✅ Comments / activity on cards
- ✅ Star/unstar boards
- ✅ Sample seed data (5 members, 2 boards, 15 cards)

---

## Database Schema

### Tables
- **members** — users; `is_default=1` marks the logged-in user (no auth)
- **boards** — boards with background color, owner
- **board_members** — many-to-many boards ↔ members with role
- **lists** — columns within a board, ordered by `position` (DECIMAL for gap-based ordering)
- **labels** — per-board colored labels
- **cards** — cards within lists, ordered by `position`, support archive/cover/due
- **card_labels** — many-to-many cards ↔ labels
- **card_members** — many-to-many cards ↔ members
- **checklists** — checklists attached to cards
- **checklist_items** — items in a checklist
- **comments** — comments on cards
- **activity_log** — audit log for card/board actions
- **attachments** — file attachments on cards (schema ready)

### Key Design Decisions
- **Position ordering** uses `DECIMAL(10,5)` instead of integer indices, so single-item moves only update one row (no renumbering). New items get `maxPos + 1000`; after many moves the frontend sends a full reorder.
- **Soft deletes** via `is_archived` flag — data is never hard-deleted (except on cascade).
- **Separate `board_id` on cards** — denormalized for fast board-scoped queries without joining through lists.
- **JSON `data` column on activity_log** — flexible schema for action payloads without schema migrations.

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8 running locally

### 1. Clone / extract the project

```
trello-clone/
├── backend/
└── frontend/
```

### 2. Database setup

```bash
# Create the DB and run schema
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials

npm install
npm run migrate    # creates DB + all tables
npm run seed       # seeds sample data
```

### 3. Start the backend

```bash
# from /backend
npm run dev        # nodemon auto-reload on port 5000
# or
npm start
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm start          # opens http://localhost:3000
```

The frontend proxies `/api/*` to `http://localhost:5000` automatically (set in `package.json`).

---

## Environment Variables (backend/.env)

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=trello_clone
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

---

## API Endpoints

### Boards
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/boards | List all boards |
| POST   | /api/boards | Create board |
| GET    | /api/boards/:id | Full board (lists + cards + labels + members) |
| PATCH  | /api/boards/:id | Update board |
| DELETE | /api/boards/:id | Archive board |
| GET    | /api/boards/:id/activity | Board activity log |

### Lists
| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/lists | Create list |
| PATCH  | /api/lists/:id | Rename list |
| DELETE | /api/lists/:id | Archive list |
| POST   | /api/lists/reorder | Bulk reorder lists |

### Cards
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/cards/:id | Full card detail |
| POST   | /api/cards | Create card |
| PATCH  | /api/cards/:id | Update card |
| DELETE | /api/cards/:id | Archive card |
| POST   | /api/cards/reorder | Bulk move/reorder cards |
| POST   | /api/cards/:id/labels | Add label |
| DELETE | /api/cards/:id/labels/:labelId | Remove label |
| POST   | /api/cards/:id/members | Assign member |
| DELETE | /api/cards/:id/members/:memberId | Remove member |
| POST   | /api/cards/:id/checklists | Add checklist |
| DELETE | /api/cards/:id/checklists/:clId | Delete checklist |
| POST   | /api/cards/:id/checklists/:clId/items | Add item |
| PATCH  | /api/cards/:id/checklists/:clId/items/:itemId | Update item |
| DELETE | /api/cards/:id/checklists/:clId/items/:itemId | Delete item |
| POST   | /api/cards/:id/comments | Add comment |
| DELETE | /api/cards/:id/comments/:cmId | Delete comment |

### Members & Search
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/members | All members |
| GET    | /api/members/default | Current (default) member |
| GET    | /api/search/cards | Search/filter cards |

---

## Assumptions

1. **No authentication** — a single member with `is_default=1` is treated as the logged-in user. All write actions are attributed to this member.
2. **Sample members** seeded: Alex Johnson (default), Sarah Chen, Marcus Webb, Priya Patel, Daniel Kim.
3. **Archive vs delete** — "deleting" a card or list sets `is_archived=1` and hides it from the UI. True deletion is only via MySQL cascade when a board is deleted.
4. **Labels are per-board** — each board gets its own set of labels. Default labels (Feature, Bug, Improvement, Critical, Research, Backend) are created automatically with each new board.
5. **Drag-and-drop positions** — on drop, a bulk reorder call updates all affected cards' positions. This keeps positions consistent without floating point drift.
6. **File uploads schema** is designed (attachments table) but the upload endpoint is not wired up in the frontend (bonus feature).

---

## Project Structure

```
backend/src/
├── config/database.js      # MySQL pool
├── controllers/            # Business logic
│   ├── boardController.js
│   ├── listController.js
│   ├── cardController.js
│   ├── memberController.js
│   └── searchController.js
├── routes/                 # Express routers
├── migrations/schema.sql   # Full DB schema
├── seeds/run.js            # Sample data seeder
└── index.js                # App entry point

frontend/src/
├── components/
│   ├── Board/              # BoardsHome, BoardView, FilterBar
│   ├── List/               # BoardList (sortable column)
│   ├── Card/               # CardItem (thumbnail), CardModal (detail)
│   └── Common/             # Header, Avatar, Notification
├── context/
│   ├── AppContext.js       # Global state (member, notification)
│   └── BoardContext.js     # Board-level state (lists, cards)
├── utils/api.js            # Axios API layer
└── styles/globals.css      # Design system / variables
```
