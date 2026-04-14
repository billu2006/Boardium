
Copy

// backend/src/index.js
const express       = require('express');
const cors          = require('cors');
const matchesRouter = require('./routes/matches');
 
const app = express();
 
app.use(cors());
app.use(express.json());
 
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', source: 'backend' });
});
 
// Game routes
app.use('/', matchesRouter);
 
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
 