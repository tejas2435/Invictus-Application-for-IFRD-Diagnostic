const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const dataFile = path.join(__dirname, 'responses.json');

// Ensure the data file exists
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([]));
}

app.post('/api/save', (req, res) => {
  try {
    const { userId, partId, data } = req.body;
    
    if (!userId) {
       return res.status(400).json({ error: 'userId is required' });
    }
    
    const fileContent = fs.readFileSync(dataFile, 'utf8');
    let responses = JSON.parse(fileContent);

    // Find if user already exists
    let userIndex = responses.findIndex(r => r.userId === userId);
    
    if (userIndex === -1) {
      responses.push({ userId, [partId]: data, lastUpdated: new Date() });
    } else {
      responses[userIndex][partId] = data;
      responses[userIndex].lastUpdated = new Date();
    }

    fs.writeFileSync(dataFile, JSON.stringify(responses, null, 2));
    res.json({ success: true, message: 'Saved successfully' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
