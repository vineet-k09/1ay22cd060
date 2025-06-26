import Log from '../logginmiddleware/Logs'

import fs from 'fs'
import path from 'path'
const directoryPath = path.join(__dirname,'stored','directory.json')

import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
const app = express()
app.use(express.json()) //for json parsing in post methods

function getCode(): string {
    const data = fs.readFileSync(directoryPath,'utf-8')
    let shortcode = 'var';
    return shortcode
}

app.post('shorturls',(req,res) => {
    try {
    const url = req.body.url;
    const validity = req.body.validity || 30; // in minutes
    const shortcode = req.body.shortcode || getCode()
    }
    catch(err){
        res.status(500).send(`Request Error: ${err.body}`)
        Log("backend","error","route",`(test) Request error: ${err.body}`)
    }
})