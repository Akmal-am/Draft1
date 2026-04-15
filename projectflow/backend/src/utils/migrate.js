const { pool } = require('../config/db');
const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin','manager','member')),
        department VARCHAR(100), is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, description TEXT,
        status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('pending','active','review','done','blocked')),
        priority VARCHAR(10) DEFAULT 'med' CHECK (priority IN ('low','med','high')),
        progress INT DEFAULT 0, start_date DATE, end_date DATE,
        manager_id INT REFERENCES users(id) ON DELETE SET NULL,
        excel_file_name VARCHAR(255), excel_file_path VARCHAR(500),
        excel_uploaded_at TIMESTAMP, excel_uploaded_by INT REFERENCES users(id),
        created_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, user_id)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY, title VARCHAR(300) NOT NULL, description TEXT,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','active','review','done','blocked')),
        priority VARCHAR(10) DEFAULT 'med' CHECK (priority IN ('low','med','high')),
        due_date DATE, created_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id SERIAL PRIMARY KEY, title VARCHAR(300) NOT NULL, description TEXT,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        due_date DATE, status VARCHAR(20) DEFAULT 'pending',
        created_by INT REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id SERIAL PRIMARY KEY, title VARCHAR(300) NOT NULL, type VARCHAR(50),
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        requested_by INT REFERENCES users(id), reviewed_by INT REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        note TEXT, reviewed_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS excel_imports (
        id SERIAL PRIMARY KEY, project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        file_name VARCHAR(255), file_path VARCHAR(500),
        imported_by INT REFERENCES users(id), row_count INT, sheet_count INT,
        status VARCHAR(20) DEFAULT 'success', error_log TEXT,
        imported_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS column_permissions (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        column_name VARCHAR(200) NOT NULL,
        can_edit BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(project_id, user_id, column_name)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS excel_edits (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id),
        sheet_name VARCHAR(200), row_index INT, column_name VARCHAR(200),
        old_value TEXT, new_value TEXT, edited_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_col_perms ON column_permissions(project_id,user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_excel_edits ON excel_edits(project_id,user_id);');
    await client.query('COMMIT');
    console.log('Migration complete');
  } catch(err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally { client.release(); pool.end(); }
};
migrate();
