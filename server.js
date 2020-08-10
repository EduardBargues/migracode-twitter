const express = require("express");
const app = express();
const { Pool } = require("pg");
const morgan = require('morgan');
const port = 3001;

// ESTABLISH DATABASE CONNECTION
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
app.use(morgan('dev'));

// FUNCTIONS
function findHashtags(searchText) {
    var regexp = /\B\#\w\w+\b/g
    result = searchText.match(regexp);
    return result;
}
async function foreachAsync(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}
async function saveHashtagsAsync(hashtags, res) {
    let hashtagsIds = [];
    await foreachAsync(hashtags, async hashtag => {
        let selectHashtagIdQuery = 'SELECT h.id FROM hashtags h WHERE h."content" = $1';
        await pool
            .query(selectHashtagIdQuery, [hashtag])
            .then(async result => {
                if (result.rowCount > 0) {
                    hashtagsIds.push(result.rows[0]);
                }
                else {
                    let saveHashtagQuery = 'INSERT INTO hashtags ("content") VALUES ($1) RETURNING id;';
                    await pool
                        .query(saveHashtagQuery, [hashtag])
                        .then(createdResult => {
                            hashtagsIds.push(createdResult.rows[0]);
                        })
                        .catch(error => {
                            console.log(error);
                            res.status(500).send(`could not safe hashtag ${hashtag}`);
                        });
                }
            })
            .catch(error => {
                console.log(error);
                res.status(500).send(`could not process hashtag ${hashtag}`);
            });
    });

    return hashtagsIds;
}
async function saveTweetAsync(content, authorId, res) {
    let query = 'INSERT INTO tweets (content, "creationDate", "authorId") VALUES ($1, $2, $3) RETURNING id;';
    let now = new Date();
    let tweetId = 0;
    await pool
        .query(query, [content, now, authorId])
        .then(result => tweetId = result.rows[0])
        .catch(error => {
            console.log(error);
            res.status(500).send("Could not save the tweet ...");
        });

    return tweetId;
}
async function linkHashtagsWithTweetAsync(tweetId, hashtagsIds, res) {
    await foreachAsync(hashtagsIds, async hashtagId => {
        let query = 'INSERT INTO tweet_vs_hashtags ("hashtagId", "tweetId") VALUES ($1, $2);';

        await pool
            .query(query, [hashtagId.id, tweetId.id])
            .then(() => { })
            .catch(error => {
                console.log(error);
                res.status(500).send(`Could not link hastag ${hashtagId} with tweet ${tweetId}...`);
            });
    });
}

// END POINTS
app.post("/tweet", async function (req, res) {
    let { content, authorId } = req.body;
    let hashtags = findHashtags(content);
    let hashtagsIds = await saveHashtagsAsync(hashtags, res);
    let tweetId = await saveTweetAsync(content, authorId, res);
    await linkHashtagsWithTweetAsync(tweetId, hashtagsIds, res);

    res.status(201).json(tweetId);
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
app.get("/users/:userId/liked-tweets", function (req, res) {
    let { userId } = req.params;
    let query = `select t.* from users u
    inner join likes l on l."followerId" = u.id
    inner join tweets t on t.id =l."tweetId" 
    where u.id=$1`;
    pool.query(query, [userId])
        .then(result => res.status(200).json(result.rows))
        .catch(error => {
            console.log(error);
            res.status(500).send("something went wrong :( ...");
        });
})
app.post("/follow", function (req, res) {
    let { followerId, followedId } = req.body;
    let query = `insert into follows ("followerId" , "followedId") values ($1, $2)`;
    pool.query(query, [followerId, followedId])
        .then(result => res.status(201).send("Following :) !"))
        .catch(error => {
            console.log(error);
            res.status(500).send("something went wrong :( ...");
        });
});
app.get("/users/:userId/followers", function (req, res) {
    let { userId } = req.params;
    let query = `select follower.* from users u 
    inner join follows f on f."followedId" = u.id
    inner join users follower on f."followerId" = follower.id
    where u.id=$1`;
    pool.query(query, [userId])
        .then(result => res.status(200).json(result.rows))
        .catch(error => {
            console.log(error);
            res.status(500).send("something went wrong :( ...");
        });
});
app.get("/users/:userId/followees", function (req, res) {
    let { userId } = req.params;
    let query = `select followee.* from users u 
    inner join follows f on f."followerId" =u.id 
    inner join users followee on followee.id =f."followedId" 
    where u.id = $1`;
    pool.query(query, [userId])
        .then(result => res.status(200).json(result.rows))
        .catch(error => {
            console.log(error);
            res.status(500).send("something went wrong :( ...");
        });
});
app.get("/users/:userId/recommendations", function (req, res) {
    let { userId } = req.params;
    let query = `select distinct t.* from tweets t 
    inner join tweet_vs_hashtags tvh on tvh."tweetId" =t.id 
    inner join hashtags h on h.id = tvh."hashtagId"
    where h.id in (
        select h2.id from likes l
        inner join tweets t2 on t2.id = l."tweetId" 
        inner join tweet_vs_hashtags tvh2 on tvh2."tweetId" =t2.id 
        inner join hashtags h2 on h2.id = tvh2."hashtagId" 
        where l."followerId" = $1
    ) or t."authorId" in (
        select u2.id from users u2 
        inner join tweets t3 on t3."authorId" = u2.id 
        inner join follows f2 on f2."followedId" = u2.id 
        where f2."followerId" = $2
    );`;
    pool.query(query, [userId, userId])
        .then(result => res.status(200).json(result.rows))
        .catch(error => {
            console.log(error);
            res.status(500).send("something went wrong :( ...");
        });
});

// START SERVER
app.listen(port, function () {
    console.log(`Server is listening on port ${port}. Ready to accept requests!`);
});


