const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for any other routes (SPA support if needed in future, mainly for 404s here)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('BioChem Analyzer Monitor is starting...');
});
