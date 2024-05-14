var express = require("express");
var cors = require("cors");
var app = express();
var jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middle-ware
app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rrsh6.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb://127.0.0.1:27017/?retryWrites=true&w=majority`
// const uri = `mongodb+srv://abhi:sadhguru123@cluster0.txvwiss.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify jwt token
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db("Doctors-portals").collection("Services");
    const appointmentCollection = client.db("Doctors-portals").collection("Appointments");
    const userCollection = client.db("Doctors-portals").collection("users");
    const bookingCollection = client.db("Doctors-portals").collection("Bookings");
    const doctorsCollection = client.db("Doctors-portals").collection("Doctors");

    // Get all doctors
    app.get('/doctors', async (req, res) => {
      try {
        const doctors = await doctorsCollection.find().toArray();
        res.json(doctors);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Add a new doctor
    app.post('/doctors', async (req, res) => {
      try {
        const newDoctor = req.body;
        const result = await doctorsCollection.insertOne(newDoctor);
        res.json(result.insertedId);
      } catch (error) {
        console.error('Error adding doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Remove a doctor
    app.delete('/doctors/:id', async (req, res) => {
      try {
        const doctorId = req.params.id;
        const result = await doctorsCollection.deleteOne({ _id: ObjectId(doctorId) });
        if (result.deletedCount === 1) {
          res.json({ message: 'Doctor removed successfully' });
        } else {
          res.status(404).json({ error: 'Doctor not found' });
        }
      } catch (error) {
        console.error('Error removing doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    //  login to save user info and generate access-token
    app.put("/login/:email", async (req, res) => {
      const email = req.params.email;

      let user = "";
      if (req.body.email === process.env.ADMIN) {
        user = { ...req.body, role: "admin" };
      } else {
        user = req.body;
      }

      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      var token = jwt.sign(user, process.env.SECRET_KEY);
      res.send({ result, token });
    });
    // update user profile
    app.put("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const options = { upsert: true };
      const updateDoc = {
        $set: req.body,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    // get user all data for specific user
    app.get("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });
    // check admin
    app.get("/isAdmin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      if (user.role === "admin") {
        return res.status(200).send({ isAdmin: true });
      }
      return res.status(401).send({ isAdmin: false });
    });
    //  get all users info for admin board
    app.get("/users/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const isAdmin = await userCollection.findOne({ email });
      if (isAdmin.role === "admin") {
        const cursor = await userCollection.find({}).toArray();
        return res.status(200).send(cursor);
      }
      return res.status(401).send({ message: "forbidden access" });
    });

    // change appointment status for admin
    app.put("/appointment", async (req, res) => {
      const email = req.query.email;
      const id = req.query.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          stage: req.body.stage,
          capacity: req.body.capacity || 11, // Update capacity if provided, otherwise use the default value
        },
      };
      const result = await appointmentCollection.updateOne(
        filter,
        updateDoc,
        option
      );
      res.send(result);
    });

    // delete appointment by id [admin route]
    app.delete("/appointments/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) };

      try {
        const appointment = await appointmentCollection.findOne(query);

        if (appointment.filled > 0) {
          return res.status(403).json({ error: "Cannot delete appointment with bookings" });
        }

        const result = await appointmentCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          res.send(result);
        } else {
          res.status(403).send({
            message: "No documents matched the query. Deleted 0 documents.",
          });
        }
      } catch (error) {
        console.error("Error deleting appointment:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // delete user info and appointment for admin route
    app.delete("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const removeUser = await userCollection.deleteOne({ email: email });
      const removeHistory = await appointmentCollection.deleteMany({
        email: email,
      });
      res.send({ removeHistory, removeUser });
    });

    app.get("/invoice_appointment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };

      try {
        const invoice = await appointmentCollection.findOne(query);
        if (invoice) {
          res.json(invoice);
        } else {
          res.status(404).json({ error: "Invoice not found", Tinvoice: invoice });
        }
      } catch (error) {
        console.error("Error retrieving invoice:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/invoice/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };

      try {
        const invoice = await bookingCollection.findOne(query);
        if (invoice) {
          res.json(invoice);
        } else {
          res.status(404).json({ error: "Invoice not found", Tinvoice: invoice });
        }
      } catch (error) {
        console.error("Error retrieving invoice:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // // get  appointment invoice by id [get]
    // app.get("/invoice/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: ObjectId(id) };
    //   const invoice = await appointmentCollection.findOne(query);
    //   res.send(invoice);
    // });

    app.put("/bookings/:id", async (req, res) => {
      const { id } = req.params;
      const { completionStatus, status } = req.body;

      try {
        let updateData;
        if (completionStatus) {
          updateData = { completionStatus };
        } else if (status) {
          updateData = { status };
        } else {
          return res.status(400).json({ error: "Invalid update data" });
        }

        const result = await bookingCollection.updateOne(
          { _id: ObjectId(id) },
          { $set: updateData }
        );
        res.json(result);
      } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Create a new booking [POST]
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // Get all bookings [GET]
    app.get("/bookings", async (req, res) => {
      try {
        const bookings = await bookingCollection.find().toArray();
        res.json(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Approve booking [PUT]
    app.put("/bookings/:id/approve", async (req, res) => {
      const bookingId = req.params.id;

      try {
        const result = await bookingCollection.updateOne(
          { _id: ObjectId(bookingId) },
          { $set: { status: "Approved" } }
        );
        res.send(result);
      } catch (error) {
        console.error("Error approving booking:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.put("/appointments/:id/filled", async (req, res) => {
      const appointmentId = req.params.id;
      const { filledChange } = req.body;

      try {
        const appointment = await appointmentCollection.findOne({ _id: ObjectId(appointmentId) });

        if (!appointment) {
          return res.status(404).json({ error: "Appointment not found" });
        }

        const updatedFilled = appointment.filled ? appointment.filled + filledChange : filledChange;

        const result = await appointmentCollection.updateOne(
          { _id: ObjectId(appointmentId) },
          { $set: { filled: updatedFilled } }
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating appointment filled value:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Get user's bookings [GET]
    app.get("/bookings/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings);
    });

    // Get all available appointments [GET]
    app.get("/appointments", async (req, res) => {
      const appointments = await appointmentCollection.find().toArray();
      res.send(appointments);
    });

    // book appointment [post]
    app.post("/appointment", async (req, res) => {
      try {
        const { capacity, ...otherFields } = req.body;
        const appointment = await appointmentCollection.insertOne({
          ...otherFields,
          capacity: capacity || 11,
          filled: 0
        });
        res.send(appointment);
      } catch (error) {
        console.error("Error creating appointment:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // get appointment for authorized user [get]
    app.get("/my_appointment/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const token = req.headers.authorization;
      const cursor = appointmentCollection.find({ userId: email });
      const myAppointments = await cursor.toArray();
      res.send(myAppointments);
    });

    // get all services [get]
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find({});
      const services = await cursor.toArray();
      res.send(services);
    });

    // get selected services by id [get]
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });
  } finally {
  }
  app.get('/services', async (req, res) => {
    try {
      const services = await serviceCollection.find().toArray();
      res.json(services);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  app.post('/services/addDate', async (req, res) => {
      try {
          const { name, date, slot } = req.body;
          // Update service with the new date and slot in 'scheduledDates'
          await serviceCollection.updateOne(
              { name: name },
              { $push: { scheduledDates: { date, slot } } } // Pushing an object with date and slot
          );
          res.status(200).send('Date and slot added to service');
      } catch (error) {
          res.status(500).send(error);
      }
  });

}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("welcome to doctor portals");
});
app.listen(port, () => {
  console.log("doctor portals is running on port", port);
});
