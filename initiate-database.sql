DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tweets;
DROP TABLE IF EXISTS likes;

CREATE TABLE "users"
(
    "id" SERIAL PRIMARY KEY,
    "name" varchar UNIQUE
);

CREATE TABLE "tweets"
(
    "id" SERIAL PRIMARY KEY,
    "content" varchar not null,
    "creationDate" timestamp not null,
    "updateDate" timestamp null,
    "authorId" int not null
);

CREATE TABLE "likes"
(
    "id" SERIAL PRIMARY KEY,
    "tweetId" int not null,
    "followerId" int not null,
    "like" boolean not null,
    unique ("tweetId", "followerId")
);

ALTER TABLE "tweets" ADD FOREIGN KEY ("authorId") REFERENCES "users" ("id");
ALTER TABLE "likes" ADD FOREIGN KEY ("followerId") REFERENCES "users" ("id");
ALTER TABLE "likes" ADD FOREIGN KEY ("tweetId") REFERENCES "tweets" ("id");
