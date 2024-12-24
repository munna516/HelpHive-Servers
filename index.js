const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hqlh5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Data Base
    const volunteerNeedPostCollection = client
      .db("Volunteer-Management")
      .collection("Volunteer-Need-Post");

    const volunteerRequestCollection = client
      .db("Volunteer-Management")
      .collection("Volunteer-Request");

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
    app.get("/volunteer-post/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerNeedPostCollection.findOne(query);
      res.send(result);
    });

    //  Get a specifix post by Email
    app.get("/my-post/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "organizer.email": email };
      const result = await volunteerNeedPostCollection.find(query).toArray();
      res.send(result);
    });

    // Get a Specifix request By Email
    app.get("/my-request/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "volunteer.volunteerEmail": email };
      const result = await volunteerRequestCollection.find(query).toArray();
      res.send(result);
    });
    // Volunteer Need Post
    app.post("/volunteer-need-post", async (req, res) => {
      const volunteerNeedPost = req.body;
      const result = await volunteerNeedPostCollection.insertOne(
        volunteerNeedPost
      );
      res.send(result);
    });

    // Be a Volunter Request
    app.post("/volunteer-request", async (req, res) => {
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

    // Update Need Volunteer By Id
    app.put("/update-post/:id", async (req, res) => {
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
