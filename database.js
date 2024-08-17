const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'suggestions.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        channelId TEXT NOT NULL,
        messageId TEXT NOT NULL,
        status TEXT,
        reason TEXT
    )`);
});

module.exports = db;
