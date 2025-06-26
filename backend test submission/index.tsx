import Log from '../logginmiddleware/Logs';

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import express from 'express';
const app = express();
app.use(express.json());


const PORT = process.env.PORT;
const directoryPath = path.join(__dirname, 'stored', 'directory.json');

// stores shortCodes to prevent excessive file read
let existingShortCodes: string[] = [];
function ifExist(shortCode: string): boolean {
    return existingShortCodes.includes(shortCode);
}

function generateRandomCode(): string {
    return crypto.randomBytes(4).toString('hex'); //for generating short codes
}

function getShortCode(url: string, validity: string, shortCode: string): [string, string] {
    let allData: any[] = [];
    // to store all data by push()

    try {
        allData = JSON.parse(fs.readFileSync(directoryPath, 'utf-8'));
    } catch (err) {
        allData = [];
    }

    let shortLink = '';
    const expiryDate: Date = new Date(Date.now() + Number(validity) * 60000);

    if (shortCode !== 'NA') {
        if (!ifExist(shortCode)) {
            // checks if the shortCode exists in database by reading local value in existingList
            shortLink = `http://localhost:${PORT}/${shortCode}`;

            allData.push({
                url,
                shortCode,
                validity,
                shortLink,
                expiry: expiryDate.toISOString()
            });

            fs.writeFileSync(directoryPath, JSON.stringify(allData), 'utf-8');
            existingShortCodes.push(shortCode);
            Log("backend", "info", "generate", `Created custom shortCode ${shortCode}`);
        } else {

            Log("backend", "warn", "generate", `shortCode ${shortCode} already exists, generating new`);
            return getShortCode(url, validity, 'NA');
        }
    } else {
        const newShortCode = generateRandomCode();
        // creates a random code in case user doesn't specify a unique code
        
        if (!ifExist(newShortCode)) {
            shortLink = `http://localhost:${PORT}/${newShortCode}`;
            allData.push({
                url,
                shortCode: newShortCode,
                validity,
                shortLink,
                expiry: expiryDate.toISOString()
            });
            fs.writeFileSync(directoryPath, JSON.stringify(allData), 'utf-8');
            existingShortCodes.push(newShortCode);
            Log("backend", "info", "generate", `Generated random shortCode ${newShortCode}`);
        }
    }

    return [shortLink, expiryDate.toISOString()];
}

// Post route
app.post('/shorturls', (req, res) => {
    try {
        const { url, validity = "30", shortCode = "NA" } = req.body;
        const [shortLink, expiry] = getShortCode(url, validity, shortCode);
        Log("backend", "info", "route", `Shortened URL: ${shortLink} (expires ${expiry})`);
        res.status(201).json({ shortLink, expiry });
    } catch (err: any) {
        Log("backend", "error", "route", `Request error: ${err.message}`);
        res.status(500).send(`Request Error: ${err.message}`);
    }
});

// Redirect logic
app.get('/:shortCode', (req, res) => {
    const shortCodeUrl = req.params.shortCode;
    try {
        const allData = JSON.parse(fs.readFileSync(directoryPath, 'utf-8'));
        const match = allData.find((item: any) => item.shortCode === shortCodeUrl);

        if (!match) {
            Log("backend", "warn", "redirect", `No URL found for shortCode: ${shortCodeUrl}`);
            return res.status(404).send('Short URL not found');
        }

        const isExpired = new Date(match.expiry) < new Date();
        if (isExpired) {
            Log("backend", "warn", "redirect", `Short URL ${shortCodeUrl} has expired`);
            return res.status(410).send('Link expired');
        }

        Log("backend", "info", "redirect", `Redirecting to ${match.url}`);
        return res.redirect(match.url);
    } catch (err: any) {
        Log("backend", "error", "redirect", `Redirection error: ${err.message}`);
        res.status(500).send(`Error: ${err.message}`);
    }
});

// Start server
app.listen(PORT, (err?: Error) => {
    if (err) {
        Log("backend", "fatal", "server", `Error starting server: ${err.message}`);
        console.error(err);
    } else {
        Log("backend", "info", "server", `Server running at http://localhost:${PORT}/`);
        console.log(`Listening to: http://localhost:${PORT}/`);
    }
});
