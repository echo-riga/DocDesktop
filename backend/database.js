const { app } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Use app.getPath('userData') to store your DB
const dbPath = path.join(app.getPath("userData"), "app.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Database opened at:", dbPath);
  }
});

db.serialize(() => {
  // PATIENTS TABLE
  db.run(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      birth DATE,
      phone TEXT,
      address TEXT,
      gender TEXT,
      blood_type TEXT,

      allergies TEXT,        -- JSON array
      past_illnesses TEXT,   -- JSON array
      surgery_history TEXT,  -- JSON array

      chief_complaint TEXT,
      follow_up_date DATE,

      bp TEXT,               -- "120/80"
      hr INTEGER,
      rr INTEGER,
      temperature REAL,
      height REAL,
      weight REAL,
      bmi REAL,              -- calculated in app

      physical_exam TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // FORMS TABLE (fully dynamic JSON)
  db.run(`
    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      form_type TEXT NOT NULL,     -- 'lab', 'prescription', 'cert', etc.
      form_date DATE DEFAULT CURRENT_DATE,
      data TEXT,                  -- JSON (dynamic objects/arrays)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);
});

module.exports = db;
