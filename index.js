const express = require('express');
const session = require('express-session');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'proHostSecret999', resave: false, saveUninitialized: true }));

let botProcess = null;
let botLogs = "System initialized. Waiting for bot startup...\n";

// Login Page (Professional Dark Theme)
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>VortexPanel - Login</title>
      <style>
        body { background: #0f172a; color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 320px; border: 1px solid #334155; }
        h2 { text-align: center; margin-bottom: 25px; color: #38bdf8; }
        input { width: 100%; padding: 12px; margin: 10px 0; background: #0f172a; border: 1px solid #475569; color: white; border-radius: 6px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        button:hover { background: #0ea5e9; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>⚡ VortexPanel</h2>
        <form action="/login" method="POST">
          <input type="text" name="username" placeholder="Username" required>
          <input type="password" name="password" placeholder="Password" required>
          <button type="submit">Login to Panel</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Simple check for demo (apne hisab se change kar sakte ho)
  if (username && password) {
    req.session.user = username;
    res.redirect('/dashboard');
  } else {
    res.redirect('/');
  }
});

// Main Dashboard (Pterodactyl / Wispbyte Look)
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  
  const statusColor = botProcess ? '#22c55e' : '#ef4444';
  const statusText = botProcess ? 'Running (Online)' : 'Offline';

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>VortexPanel - Dashboard</title>
      <style>
        body { background: #0f172a; color: #f8fafc; font-family: 'Segoe UI', sans-serif; margin: 0; display: flex; }
        .sidebar { width: 250px; background: #1e293b; height: 100vh; padding: 20px; border-right: 1px solid #334155; box-sizing: border-box; }
        .sidebar h2 { color: #38bdf8; font-size: 22px; margin-bottom: 30px; }
        .sidebar a { display: block; color: #94a3b8; text-decoration: none; padding: 10px 15px; border-radius: 6px; margin-bottom: 5px; font-weight: 600; }
        .sidebar a:hover, .sidebar a.active { background: #0284c7; color: white; }
        .main { flex: 1; padding: 30px; box-sizing: border-box; overflow-y: auto; height: 100vh; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 15px; margin-bottom: 25px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .box { background: #1e293b; padding: 20px; border-radius: 10px; border: 1px solid #334155; }
        .console { background: #090d16; color: #38bdf8; padding: 15px; font-family: monospace; border-radius: 6px; height: 180px; overflow-y: scroll; font-size: 13px; border: 1px solid #334155; white-space: pre-wrap; }
        .btn { padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: white; margin-right: 10px; }
        .btn-start { background: #16a34a; }
        .btn-start:hover { background: #15803d; }
        .btn-stop { background: #dc2626; }
        .btn-stop:hover { background: #b91c1c; }
        .badge { display: inline-block; width: 10px; height: 10px; background: ${statusColor}; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 8px ${statusColor}; }
      </style>
    </head>
    <body>
      <div class="sidebar">
        <h2>⚡ VortexPanel</h2>
        <a href="/dashboard" class="active">📊 Server Console</a>
        <a href="/logout" style="color: #f87171; margin-top: 50px;">🚪 Logout</a>
      </div>
      <div class="main">
        <div class="header">
          <h2>Welcome back, ${req.session.user}!</h2>
          <span>Server ID: <b>srv-node-01</b></span>
        </div>

        <div class="grid">
          <div class="box">
            <h3>Server Controls</h3>
            <p>Status: <span class="badge"></span><b>${statusText}</b></p>
            <br>
            <form action="/start" method="POST" style="display:inline;">
              <button class="btn btn-start">▶ Start</button>
            </form>
            <form action="/stop" method="POST" style="display:inline;">
              <button class="btn btn-stop">⏹ Stop</button>
            </form>
          </div>

          <div class="box">
            <h3>Resource Usage (Live)</h3>
            <p>CPU Usage: <b>1.4%</b></p>
            <p>RAM Usage: <b>48 MB / 512 MB</b></p>
            <p>Node Environment: <b>Active</b></p>
          </div>
        </div>

        <br>
        <div class="box">
          <h3>Live Console Output</h3>
          <div class="console">${botLogs}</div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Start Bot Process
app.post('/start', (req, res) => {
  if (!botProcess) {
    botLogs += `[System] Starting bot process...\n`;
    // Yahan bot.js file execute hogi
    botProcess = spawn('node', ['bot.js']);

    botProcess.stdout.on('data', (data) => {
      botLogs += `${data}`;
    });

    botProcess.stderr.on('data', (data) => {
      botLogs += `[Error] ${data}`;
    });

    botProcess.on('close', (code) => {
      botLogs += `[System] Bot stopped with code ${code}\n`;
      botProcess = null;
    });
  }
  res.redirect('/dashboard');
});

// Stop Bot Process
app.post('/stop', (req, res) => {
  if (botProcess) {
    botLogs += `[System] Stopping bot manually...\n`;
    botProcess.kill();
    botProcess = null;
  }
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Professional panel running on port ${PORT}`);
});
           
