const express = require('express');
const session = require('express-session');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'mySuperSecretHostingKey',
  resave: false,
  saveUninitialized: true
}));

// Temporary database for users and their servers
const users = [];
const servers = {}; // To store user's bot info

// Home / Login Page
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.send(`
    <div style="font-family: Arial; text-align: center; margin-top: 40px;">
      <h2>🚀 Multi-Language Bot Hosting Panel</h2>
      <p>Host your Node.js and Python Discord bots for FREE!</p>
      
      <div style="display: inline-block; text-align: left; background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
        <form action="/login" method="POST" style="margin-bottom: 20px;">
          <h3>Login</h3>
          <input type="text" name="username" placeholder="Username" required style="padding: 8px; margin: 5px; width: 200px;"><br>
          <input type="password" name="password" placeholder="Password" required style="padding: 8px; margin: 5px; width: 200px;"><br>
          <button type="submit" style="padding: 8px 15px; background: #007bff; color: white; border: none; cursor: pointer; width: 215px;">Login</button>
        </form>
        <hr>
        <form action="/register" method="POST" style="margin-top: 15px;">
          <h3>Register</h3>
          <input type="text" name="username" placeholder="Choose Username" required style="padding: 8px; margin: 5px; width: 200px;"><br>
          <input type="password" name="password" placeholder="Choose Password" required style="padding: 8px; margin: 5px; width: 200px;"><br>
          <button type="submit" style="padding: 8px 15px; background: #28a745; color: white; border: none; cursor: pointer; width: 215px;">Register</button>
        </form>
      </div>
    </div>
  `);
});

// Handle Registration
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    return res.send("<script>alert('Username already exists!'); window.location='/';</script>");
  }
  users.push({ username, password });
  res.send("<script>alert('Registration Successful! Please login.'); window.location='/';</script>");
});

// Handle Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    req.session.user = username;
    res.redirect('/dashboard');
  } else {
    res.send("<script>alert('Invalid username or password!'); window.location='/';</script>");
  }
});

// Dashboard Page with Python/Node selection
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  const username = req.session.user;
  const userServer = servers[username];

  let serverBox = '';
  if (!userServer) {
    serverBox = `
      <div style="border: 2px dashed #007bff; padding: 20px; display: inline-block; background: #fff; border-radius: 8px;">
        <h3>Create Your Bot Server</h3>
        <form action="/createServer" method="POST">
          <label>Select Language:</label><br>
          <select name="language" style="padding: 8px; margin: 10px; width: 180px;">
            <option value="Node.js">Node.js (JavaScript)</option>
            <option value="Python">Python (Discord.py)</option>
          </select><br>
          <button type="submit" style="padding: 10px 20px; background: #ffc107; border: none; cursor: pointer; font-weight: bold; border-radius: 4px;">Deploy Server</button>
        </form>
      </div>
    `;
  } else {
    serverBox = `
      <div style="border: 2px solid #28a745; padding: 20px; display: inline-block; background: #e8f5e9; border-radius: 8px;">
        <h3>Your Active Server</h3>
        <p><b>Language:</b> ${userServer.language}</p>
        <p><b>Status:</b> <span style="color: green; font-weight: bold;">Online 🟢</span></p>
        <form action="/deleteServer" method="POST">
          <button type="submit" style="padding: 8px 15px; background: #dc3545; color: white; border: none; cursor: pointer; border-radius: 4px;">Delete / Reset Server</button>
        </form>
      </div>
    `;
  }

  res.send(`
    <div style="font-family: Arial; text-align: center; margin-top: 40px;">
      <h2>Welcome, ${username}! 🎉</h2>
      <p>Manage your Python and Node.js bots from here.</p>
      <br>
      ${serverBox}
      <br><br><br>
      <a href="/logout" style="color: red; text-decoration: none; font-weight: bold;">Logout</a>
    </div>
  `);
});

// Create Server Route
app.post('/createServer', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const username = req.session.user;
  const { language } = req.body;

  servers[username] = { language, status: 'Running' };
  res.redirect('/dashboard');
});

// Delete Server Route
app.post('/deleteServer', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  delete servers[req.session.user];
  res.redirect('/dashboard');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hosting panel is running on port ${PORT}`);
});

    
