-- ============================================================
-- Trello Clone Database Schema
-- ============================================================

-- CREATE DATABASE IF NOT EXISTS trello_clone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE trello_clone;

-- ------------------------------------------------------------
-- members (users) — no auth required, default user pre-seeded
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id          VARCHAR(36)  PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  avatar_url  VARCHAR(500),
  avatar_color VARCHAR(20) DEFAULT '#0079bf',
  initials    VARCHAR(4)   NOT NULL,
  is_default  TINYINT(1)   DEFAULT 0,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- boards
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boards (
  id              VARCHAR(36)  PRIMARY KEY,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  background_color VARCHAR(20) DEFAULT '#0079bf',
  background_image VARCHAR(500),
  is_starred      TINYINT(1)   DEFAULT 0,
  is_archived     TINYINT(1)   DEFAULT 0,
  owner_id        VARCHAR(36)  NOT NULL,
  created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- board_members — many-to-many
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS board_members (
  board_id    VARCHAR(36) NOT NULL,
  member_id   VARCHAR(36) NOT NULL,
  role        ENUM('owner','admin','member') DEFAULT 'member',
  joined_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (board_id, member_id),
  FOREIGN KEY (board_id)  REFERENCES boards(id)  ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- lists  (columns on a board)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lists (
  id          VARCHAR(36)  PRIMARY KEY,
  board_id    VARCHAR(36)  NOT NULL,
  title       VARCHAR(200) NOT NULL,
  position    DECIMAL(10,5) NOT NULL DEFAULT 0,
  is_archived TINYINT(1)   DEFAULT 0,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  INDEX idx_lists_board_position (board_id, position)
);

-- ------------------------------------------------------------
-- labels  (per-board)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS labels (
  id       VARCHAR(36) PRIMARY KEY,
  board_id VARCHAR(36) NOT NULL,
  name     VARCHAR(100),
  color    VARCHAR(20) NOT NULL,
  created_at DATETIME  DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- cards
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cards (
  id          VARCHAR(36)   PRIMARY KEY,
  list_id     VARCHAR(36)   NOT NULL,
  board_id    VARCHAR(36)   NOT NULL,
  title       VARCHAR(500)  NOT NULL,
  description TEXT,
  position    DECIMAL(10,5) NOT NULL DEFAULT 0,
  due_date    DATETIME,
  due_complete TINYINT(1)   DEFAULT 0,
  cover_color VARCHAR(20),
  cover_image VARCHAR(500),
  is_archived TINYINT(1)   DEFAULT 0,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id)  REFERENCES lists(id)  ON DELETE CASCADE,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  INDEX idx_cards_list_position (list_id, position),
  INDEX idx_cards_board (board_id),
  FULLTEXT INDEX ft_cards_title (title)
);

-- ------------------------------------------------------------
-- card_labels  (many-to-many)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS card_labels (
  card_id  VARCHAR(36) NOT NULL,
  label_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (card_id, label_id),
  FOREIGN KEY (card_id)  REFERENCES cards(id)  ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- card_members  (many-to-many)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS card_members (
  card_id   VARCHAR(36) NOT NULL,
  member_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (card_id, member_id),
  FOREIGN KEY (card_id)   REFERENCES cards(id)   ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- checklists
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklists (
  id         VARCHAR(36)  PRIMARY KEY,
  card_id    VARCHAR(36)  NOT NULL,
  title      VARCHAR(200) NOT NULL DEFAULT 'Checklist',
  position   INT          NOT NULL DEFAULT 0,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- checklist_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklist_items (
  id           VARCHAR(36)  PRIMARY KEY,
  checklist_id VARCHAR(36)  NOT NULL,
  title        VARCHAR(500) NOT NULL,
  is_complete  TINYINT(1)   DEFAULT 0,
  position     INT          NOT NULL DEFAULT 0,
  due_date     DATETIME,
  assignee_id  VARCHAR(36),
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id)  REFERENCES members(id)    ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- comments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id         VARCHAR(36) PRIMARY KEY,
  card_id    VARCHAR(36) NOT NULL,
  member_id  VARCHAR(36) NOT NULL,
  content    TEXT        NOT NULL,
  created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id)   REFERENCES cards(id)   ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- activity_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id          VARCHAR(36)  PRIMARY KEY,
  board_id    VARCHAR(36)  NOT NULL,
  card_id     VARCHAR(36),
  member_id   VARCHAR(36)  NOT NULL,
  action_type VARCHAR(50)  NOT NULL,
  data        JSON,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id)  REFERENCES boards(id)  ON DELETE CASCADE,
  FOREIGN KEY (card_id)   REFERENCES cards(id)   ON DELETE SET NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_activity_board (board_id, created_at)
);

-- ------------------------------------------------------------
-- attachments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id          VARCHAR(36)  PRIMARY KEY,
  card_id     VARCHAR(36)  NOT NULL,
  member_id   VARCHAR(36)  NOT NULL,
  filename    VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type   VARCHAR(100),
  file_size   INT,
  url         VARCHAR(500) NOT NULL,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id)   REFERENCES cards(id)   ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
