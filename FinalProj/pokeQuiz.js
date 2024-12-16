"use strict";
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
let portNumber = 5000;
process.stdin.setEncoding("utf8");

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') });

const username = "jmosley4";
const password = "UEOwIIH6XARsiD25";
const uri = `mongodb+srv://${username}:${password}@cluster0.j1lo3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const name = "CMSC335DB";
const collection = "highScores";
const databaseAndCollection = {db: name, collection: collection};
const { MongoClient, ServerApiVersion } = require('mongodb');

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const images = [
    "https://pokeapi.co/api/v2/pokemon/sudowoodo",
    "https://pokeapi.co/api/v2/pokemon/dondozo",
    "https://pokeapi.co/api/v2/pokemon/gengar",
    "https://pokeapi.co/api/v2/pokemon/palkia",
    "https://pokeapi.co/api/v2/pokemon/iron-jugulis",
    "https://pokeapi.co/api/v2/pokemon/infernape",
    "https://pokeapi.co/api/v2/pokemon/blissey",
    "https://pokeapi.co/api/v2/pokemon/espeon",
    "https://pokeapi.co/api/v2/pokemon/shuckle",
    "https://pokeapi.co/api/v2/pokemon/eternatus-eternamax"
];
let pname;
let pstarter;
let question;
let score;

if (process.argv.length != 2) {
    process.stdout.write(`Usage pokeQuiz.js jsonFile`);
    process.exit(1);
}

async function connectToMongoDB() {
    try {
        await client.connect();
        return client.db(databaseAndCollection.db).collection(databaseAndCollection.collection);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
}

async function insertQuizResult(name, starter, score) {
    try {
        const collection = await connectToMongoDB();
        const quizResult = {
            name: name,
            starter: starter,
            score: score,
            timestamp: new Date()
        };
        const result = await collection.insertOne(quizResult);
    } catch (error) {
        console.error("Error inserting quiz result:", error);
    } finally {
        await client.close();
    }
}

async function retrieveHighScores() {
    try {
        const collection = await connectToMongoDB();
        const highScores = await collection.find().sort({ score: -1 }).limit(10).toArray();
        return highScores;
    } catch (error) {
        console.error("Error retrieving high scores:", error);
        throw error;
    } finally {
        await client.close();
    }
}

async function clearHighScores() {
    try {
        const collection = await connectToMongoDB();
        await collection.deleteMany({});
        return true;
    } catch (error) {
        console.error("Error clearing high scores:", error);
        throw error;
    } finally {
        await client.close();
    }
}

app.listen(portNumber, () => {
    console.log(`Web server started and running at http://localhost:${portNumber}`);

    app.set('view engine', 'ejs');
    app.set('views', './templates');
    app.get("/", (request, response) => {
        pikachu().then((sprite) => {
            response.render('index', {sprite: sprite});
        });
    });
    app.get("/info", (request, response) => {
        response.render('info');
    });
    app.use(bodyParser.urlencoded({extended:false}));
    app.post("/confirm", (request, response) => {
        let {name, starter} = request.body;
        pname = name;
        pstarter = starter;
        question = 0;
        score = 0;
        response.render('confirm', {name: name});
    });
    app.get("/question", (request, response) => {
        image(question).then((sprite) => {
            response.render('question', {question: question+1, 
                sprite: `<img src=${sprite.sprites.front_default} alt="pokemon">`, name: pname, starter: pstarter});
        });
    });
    app.use(bodyParser.urlencoded({extended:false}));
    app.post("/result", (request, response) => {
        let {pokemon} = request.body;
        let answer = pokemon.toLowerCase();
        let result;
        image(question++).then((sprite) => {
            if (answer === sprite.name) {
                result = "Correct!";
                score++;
            } else {
                result = "Incorrect";
            }
            if (question === 10) {
                response.render('lresult', {question: question, sprite: `<img src=${sprite.sprites.front_default} alt="pokemon">`, 
                    pokemon: sprite.name, result: result, name: pname, starter: pstarter});
            } else {
                response.render('result', {question: question, sprite: `<img src=${sprite.sprites.front_default} alt="pokemon">`, 
                    pokemon: sprite.name, result: result, name: pname, starter: pstarter});
            }
        });
    });
    app.use(bodyParser.urlencoded({extended:false}));
    app.post("/finalResults", async (request, response) => {
        try {
            await insertQuizResult(pname, pstarter, score);
            response.render('finalResults', {score: score, name: pname, starter: pstarter});
        } catch (error) {
            console.error("Error processing final results:", error);
            response.status(500).send("An error occurred while processing your results");
        }
    });

    app.get("/highScores", async (request, response) => {
        try {
            const highScores = await retrieveHighScores();
            response.render('highScores', { highScores: highScores });
        } catch (error) {
            response.status(500).send("Error retrieving high scores");
        }
    });

    app.post("/resetHighScores", async (request, response) => {
        try {
            await clearHighScores();
            response.redirect('/highScores');
        } catch (error) {
            response.status(500).send("Error resetting high scores");
        }
    });

    const prompt = "Stop to shutdown the server: ";
    process.stdout.write(prompt);
    process.stdin.on("readable", function () {
        const dataInput = process.stdin.read();
        if (dataInput !== null) {
            const command = dataInput.trim();
            if (command === "stop") {
                process.stdout.write("Shutting down the server");
                process.exit(0);
            } else {
                process.stdout.write("Invalid command: " + dataInput);
            }
            process.stdout.write(prompt);
            process.stdin.resume();
        }
    });
});

async function pikachu() {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon/pikachu");
    const data = await response.json();
    const img = data.sprites.front_default;
    const sprite = `<img src=${img} alt="Pikachu">`;
    return sprite;
}

async function image(i) {
    const response = await fetch(images[i]);
    const data = await response.json();
    const img = data.sprites.front_default;
    const sprite = `<img src=${img} alt="pokemon">`;
    return data;
}