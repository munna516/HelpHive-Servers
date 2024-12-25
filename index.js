const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
const cookieParser = require("cookie-parser");

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hqlh5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verifyToken
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "Unauthorized access" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Data Base
    const volunteerNeedPostCollection = client
      .db("Volunteer-Management")
      .collection("Volunteer-Need-Post");

    const volunteerRequestCollection = client
      .db("Volunteer-Management")
      .collection("Volunteer-Request");

    // Generate Jwt
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.JWT_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // logout || clear cookie from browser
    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });
    // Get All Volunteer Post
    app.get("/all-volunteer-need-post", async (req, res) => {
      const search = req.query.search;
      let options = {};
      let query = {
        title: {
          $regex: search,
          $options: "i",
        },
      };
      const result = await volunteerNeedPostCollection
        .find(query, options)
        .toArray();
      res.send(result);
    });
    // Get a Specific Post by id
    app.get("/volunteer-post/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerNeedPostCollection.findOne(query);
      res.send(result);
    });

    //  Get a specifix post by Email
    app.get("/my-post", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.user?.email !== req.query.email) {
        return res
          .status(403)
          .send({ message: "Access to the requested resource is forbidden" });
      }
      const query = { "organizer.email": email };
      const result = await volunteerNeedPostCollection.find(query).toArray();
      res.send(result);
    });

    // Get a Specifix request By Email
    app.get("/my-request", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.user?.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden" });
      }
      const query = { "volunteer.volunteerEmail": email };
      const result = await volunteerRequestCollection.find(query).toArray();
      res.send(result);
    });
    // Volunteer Need Post
    app.post("/volunteer-need-post", verifyToken, async (req, res) => {
      const volunteerNeedPost = req.body;
      const result = await volunteerNeedPostCollection.insertOne(
        volunteerNeedPost
      );
      res.send(result);
    });

    // Be a Volunter Request
    app.post("/volunteer-request", verifyToken, async (req, res) => {
      const volunteerReq = req.body;
      const result = await volunteerRequestCollection.insertOne(volunteerReq);

      //1. Decrease the volunteer Need count
      const filter = { _id: new ObjectId(volunteerReq.postId) };
      const update = {
        $inc: { numberOfVolunteer: -1 },
      };
      const updateCount = await volunteerNeedPostCollection.updateOne(
        filter,
        update
      );
      res.send(result);
    });
    // Volunteer Nees Now Section
    app.get("/volunteer-need-now", async (req, res) => {
      const result = await volunteerNeedPostCollection
        .find()
        .sort({ deadline: 1 })
        .limit(6)
        .toArray();

      res.send(result);
    });

    // Update Need Volunteer By Id
    app.put("/update-post/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatePost = req.body;
      const updated = {
        $set: updatePost,
      };
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await volunteerNeedPostCollection.updateOne(
        query,
        updated,
        options
      );
      res.send(result);
    });

    // Delete My Post
    app.delete("/delete-post/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerNeedPostCollection.deleteOne(query);
      res.send(result);
    });
    // Cancle My Request
    app.delete("/cancle-request/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result1 = await volunteerRequestCollection.findOne(query);
      const result = await volunteerRequestCollection.deleteOne(query);

      //1. Increase the volunteer Need count
      const filter = { _id: new ObjectId(result1.postId) };
      const update = {
        $inc: { numberOfVolunteer: 1 },
      };
      const updateCount = await volunteerNeedPostCollection.updateOne(
        filter,
        update
      );
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is Running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
