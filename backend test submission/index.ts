// backend test submission/index.ts
import Log from '../logginmiddleware/Logs';
import { Request, Response } from 'express';

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import express from 'express';
const app = express();
app.use(express.json());


const PORT = process.env.PORT || 8080;
const directoryPath = path.join(__dirname, 'stored', 'directory.json');

// stores shortCodes to prevent excessive file read
let existingShortCodes: string[] = [];
function ifExist(shortCode: string): boolean {
    return existingShortCodes.includes(shortCode);
}

//for generating short codes - randomly
function generateRandomCode(): string {
    return crypto.randomBytes(4).toString('hex'); 
}


// making short urls logic
function getShortCode(url: string, validity: string, shortCode: string): [string, string] {
    let allData: any[] = [];
    // to store all data(existing + new) by push()

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
            // JSON needs to be converted into string to write.

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
        Log("backend", "error", "route", `Request error: ${err.message?err.message:""}`);
        res.status(500).send(`Request Error: ${err.message?err.message:""}`);
    }
});

// Redirect logic
existingShortCodes.forEach(shortCodeUrl => {
    app.get(`/${shortCodeUrl}`, (req, res) => {
        try {
            const allData = JSON.parse(fs.readFileSync(directoryPath, 'utf-8'));
            const match = allData.find((item: any) => item.shortCode === shortCodeUrl);
    
            if (!match) {
                Log("backend", "warn", "route", `No URL found for shortCode: ${shortCodeUrl}`);
                res.send('Short URL not found');
            }
    
            const isExpired = new Date(match.expiry) < new Date();
            // log expiry of urls
            if (isExpired) {
                Log("backend", "warn", "route", `Short URL ${shortCodeUrl} has expired`);
                res.send('Link expired');
            }
    
            Log("backend", "info", "route", `Redirecting to ${match.url}`);
            res.redirect(match.url);
        } catch (err: any) {
    
            Log("backend", "error", "route", `Redirection error: ${err.message?err.message:""}`);
            res.status(500).send(`Error: ${err.message?err.message:""}`);
        }
    });
})


// Start server
app.listen(PORT, () => {
        Log("backend", "info", "route", `Server running at http://localhost:${PORT}/`);
        console.log(`Listening to: http://localhost:${PORT}/`);
});