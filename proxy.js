require('dotenv').config();
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 9198;
const JWT_SECRET = process.env.JWT_SECRET || 'my_secret_key';
const PLAIN_TOKEN = process.env.PLAIN_TOKEN || 'token';
const AUTH_TYPE = process.env.AUTH_TYPE || 'plain';
let USE_AUTH;
if (process.env.USE_AUTH !== undefined) {
    USE_AUTH = process.env.USE_AUTH === 'true'; 
} else {
    USE_AUTH = true; 
}



app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
    next();
});

const authenticateToken = (req, res, next) => {
    if (!USE_AUTH) return next();
    
    const token = req.params.token;
    if (!token) return res.status(401).json({ error: 'Token required' });

    if (AUTH_TYPE === 'jwt') {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Invalid JWT token' });
            req.user = user;
            next();
        });
    } else if (AUTH_TYPE === 'plain') {
        if (token !== PLAIN_TOKEN) return res.status(403).json({ error: 'Invalid plain token' });
        next();
    } else {
        return res.status(500).json({ error: 'Invalid AUTH_TYPE' });
    }
};

app.get('/auth', (req, res) => {
    if (!USE_AUTH || AUTH_TYPE !== 'jwt') return res.status(403).json({ error: 'Authentication disabled or using plain token' });

    const user = { name: 'streamUser' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

app.get('/:token/*', authenticateToken, async (req, res) => {
    try {
        const videoUrl = req.params[0];
        if (!videoUrl.startsWith('http')) return res.status(400).json({ error: 'Invalid video URL' });

        const range = req.headers.range || 'bytes=0-';
        const videoResponse = await axios.get(videoUrl, { headers: { Range: range }, responseType: 'stream' });

        res.writeHead(206, {
            'Content-Range': videoResponse.headers['content-range'],
            'Accept-Ranges': 'bytes',
            'Content-Length': videoResponse.headers['content-length'],
            'Content-Type': videoResponse.headers['content-type']
        });

        videoResponse.data.pipe(res);
    } catch (error) {
        res.status(500).json({ error: `Error streaming video: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/YOUR_TOKEN/https://example.com/video.mp4`));
