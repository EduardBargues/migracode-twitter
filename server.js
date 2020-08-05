const express = require("express");
const app = express();
const { Pool } = require("pg");
const morgan = require('morgan');

const pool = new Pool({
    user: "eduar",
    host: "localhost",
    database: "twitter",
    password: "1459",
    port: 5432,
});

// READ BODIES AND URL FROM REQUESTS
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// LOG ALL REQUEST
app.use(morgan('tiny'));

// END POINTS
app.post("/tweet", function (req, res) {
    let { content, authorId } = req.body;
    let query = 'INSERT INTO tweets (content, date, "authorId") VALUES ($1, $2, $3);';
    let now = new Date();
    pool
        .query(query, [content, now, authorId])
        .then(result => res.status(201).send("Tweet created :) !"))
        .catch(error => {
            console.log(error);
            res.status(500).send("something went wrong :( ...");
        });
});
app.get("/users/:userId/tweets", function (req, res) {
    let { userId } = req.params;
    let query = 'SELECT * FROM tweets WHERE "authorId" = $1';
    pool.query(query, [userId])
        .then(result => res.status(200).json(result.rows))
        .catch(error => {
            console.log(error);
            res.status(500).send("something went wrong :( ...");
        });
});
app.put("/tweets/:tweetId", function (req, res) {
    let { content } = req.body;
    let { tweetId } = req.params;
    let query = 'UPDATE tweets SET content = $1, "updateDate" = $2 WHERE id = $3;';
    let now = new Date();
    pool
        .query(query, [content, now, tweetId])
        .then(result => res.status(200).send("tweet updated"))
        .catch(error => {
            console.log(error);
            res.status(500).send("something went wrong :( ...");
        });
});
app.delete("/tweets/:tweetId", function (req, res) {
    let { tweetId } = req.params;
    let query = 'DELETE FROM tweets WHERE id = $1;';
    pool
        .query(query, [tweetId])
        .then(result => res.status(200).send("tweet deleted"))
        .catch(error => {
            console.log(error);
            res.status(500).send("something went wrong :( ...");
        });
});
app.post("/tweets/:tweetId/like", function (req, res) {
    let { followerId, like } = req.body;
    let { tweetId } = req.params;
    let query = 'INSERT INTO likes ("tweetId", "followerId", "like") VALUES ($1, $2, $3);';
    pool
        .query(query, [tweetId, followerId, like])
        .then(result => res.status(200).send("tweet liked :) !"))
        .catch(error => {
            console.log(error);
            res.status(500).send("something went wrong :( ...");
        });
});

// START SERVER
app.listen(3001, function () {
    console.log("Server is listening on port 3001. Ready to accept requests!");
});