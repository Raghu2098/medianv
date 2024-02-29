const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const jsonwebtoken = require("jsonwebtoken");
require("dotenv").config();

const app = express();

const dbpath = path.join(__dirname, "database.db");
let db = null;

app.use(cors());
app.use(express.json());

const intializeDb = async () => {
  try {
    db = await open({ filename: dbpath, driver: sqlite3.Database });
    //  db = await open({ filename: dbpath, driver: sqlite3.Database });

    app.listen(process.env.PORT, () => {
      console.log(`server running  at port ${process.env.PORT}`);
    });
  } catch (e) {
    console.log("Db error  :", e);
  }
};

intializeDb();

const authentication = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  //   console.log(authHeader);
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (authHeader === undefined) {
    response.status(407);
    response.send({ msg: "Inavlid user" });
  } else {
    jsonwebtoken.verify(jwtToken, "my-secret-token", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send({ msg: "invalid jwt token" });
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.get("/api/testing", (req, res) => {
  res.send({ msg: "testing message  and server is running" });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const query = `select * from userdetails where email=? AND password=?`;

  const user = await db.get(query, [email, password]);
  //   console.log(user);
  if (user === undefined) {
    res.status(400);
    res.send({ msg: "Invalid user" });
  } else {
    const payload = { username: email };

    const token = jsonwebtoken.sign(payload, "my-secret-token");
    res.send({ token });
  }
});

app.post("/api/signup", async (req, res) => {
  const { email, password, name } = req.body;
  console.log(req.body);

  const user = `select * from userdetails where email=?;`;
  const userdtls = await db.get(user, [email]);

  if (userdtls === undefined) {
    const query = `insert into userdetails(name,password,email)
    values(?,?,?);`;

    const upload = await db.run(query, [name, password, email]);
    res.send({ msg: "user created successfully" });
  } else {
    res.send({ msg: "User already exist please login" });
  }
});

app.get("/api/allblogs", authentication, async (req, res) => {
  const query = `select * from blogs LEFT JOIN comments ON
  blogs.bId=comments.bId`;
  const blogs = await db.all(query);

  res.send(blogs);
});

app.post("/api/postblog", authentication, async (req, res) => {
  let { username } = req;
  const { description } = req.body;
  //   console.log(title);
  const query = `select * from userdetails where email=?`;
  const userdtails = await db.get(query, [username]);

  const massageQry = `INSERT INTO blogs(content,uId) VALUES(?,?)`;
  const msgDetails = await db.run(massageQry, [description, userdtails.id]);

  res.send({ msg: "successfully blog posted" });
});

app.post("/api/postcomment", authentication, async (req, res) => {
  const { comment, bId } = req.body;

  const massageQry = `INSERT INTO comments(comment,bId) VALUES(?,?)`;
  const msgDetails = await db.run(massageQry, [comment, bId]);

  res.send({ msg: "comment posted successfully " });
});

app.put("/api/updateblog/:id", authentication, async (req, res) => {
  const { id } = req.params;
  const qry = `select * from blog where bId=?`;
  const data = await db.get(qry, [id]);

  const { description } = req.body;
  if (data !== undefined) {
    const query = `update blogs SET content=? where bId=?`;
    const details = await db.run(query, [description, id]);

    res.send({ msg: "blog updated successfully" });
  } else {
    res.send({ msg: "blog not exist" });
  }
});

app.delete("/api/deleteblog/:id", authentication, async (req, res) => {
  const { id } = req.params;
  const qry = `select * from blog where bId=?`;
  const data = await db.get(qry, [id]);

  if (data !== undefined) {
    const query = `delete from blogs  where bId=?`;
    const details = await db.run(query, [id]);

    res.send({ msg: "blog deleted successfully" });
  } else {
    res.send({ msg: "blog not exist" });
  }
});
