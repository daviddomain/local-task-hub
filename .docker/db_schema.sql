-- Local Task Hub Phase 1 schema
-- Scope: tasks, task links, task tags, task person references, and task time sessions.

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  status ENUM('open', 'in_progress', 'blocked', 'waiting', 'review', 'done') NOT NULL DEFAULT 'open',
  later BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_tasks_updated_at (updated_at),
  INDEX idx_tasks_status_later_updated (status, later, updated_at),
  INDEX idx_tasks_later_updated (later, updated_at),
  FULLTEXT INDEX ft_tasks_title_note (title, note)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id BIGINT UNSIGNED NOT NULL,
  url TEXT NOT NULL,
  label VARCHAR(255) NULL,
  source_type ENUM('jira', 'gitlab', 'github', 'confluence', 'other') NOT NULL DEFAULT 'other',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_task_links_task_id
    FOREIGN KEY (task_id)
    REFERENCES tasks(id)
    ON DELETE CASCADE,
  INDEX idx_task_links_task_id (task_id),
  INDEX idx_task_links_source_type_task (source_type, task_id),
  FULLTEXT INDEX ft_task_links_url_label (url, label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id BIGINT UNSIGNED NOT NULL,
  tag VARCHAR(100) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_task_tags_task_id
    FOREIGN KEY (task_id)
    REFERENCES tasks(id)
    ON DELETE CASCADE,
  CONSTRAINT uq_task_tags_task_id_tag UNIQUE (task_id, tag),
  INDEX idx_task_tags_tag (tag),
  INDEX idx_task_tags_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_person_references (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id BIGINT UNSIGNED NOT NULL,
  person_reference VARCHAR(100) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_task_person_references_task_id
    FOREIGN KEY (task_id)
    REFERENCES tasks(id)
    ON DELETE CASCADE,
  CONSTRAINT uq_task_person_references_task_id_person_reference UNIQUE (task_id, person_reference),
  INDEX idx_task_person_references_person_reference (person_reference),
  INDEX idx_task_person_references_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_time_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id BIGINT UNSIGNED NOT NULL,
  started_at DATETIME(3) NOT NULL,
  ended_at DATETIME(3) NULL,
  duration_seconds INT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_task_time_sessions_task_id
    FOREIGN KEY (task_id)
    REFERENCES tasks(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_task_time_sessions_end_after_start
    CHECK (ended_at IS NULL OR ended_at >= started_at),
  INDEX idx_task_time_sessions_task_id_started_at (task_id, started_at),
  INDEX idx_task_time_sessions_task_id_ended_at (task_id, ended_at),
  INDEX idx_task_time_sessions_started_at (started_at),
  INDEX idx_task_time_sessions_ended_at (ended_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
