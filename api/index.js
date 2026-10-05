const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Strava Motos API funcionando!'
    });
});

if (require.main === module) {
    app.listen(3000, () => {
        console.log('API rodando em http://localhost:3000');
    });
}

module.exports = app;