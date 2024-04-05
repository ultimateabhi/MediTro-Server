## NodeJs Server for Appointment Booking app

## Brief

The challenge is to building a NodeJs server for a Appointment booking app. Where authorized users can booked appointment on their desire date and time and track their appointment status via user dashboard. There also have to a admin dashboard for manage appointment and manipulate users

## Collections and end points

- login to save user info and generate access-token >>>
  app.put("/login/:email", function)
- // update user profile >>>
  app.put("/profile/:email", function)
- // get data for specific user >>>
  app.get("/profile/:email", function)
- // check admin >>>
  app.get("/isAdmin/:email", function)
- // get all users info for admin dashboard >>>
  app.get("/users/:email", function)
- // change appointment status [admin-route] >>>
  app.put("/appointment", function)
- // delete appointment by id [admin-route] >>>
  app.delete("/appointments/:id",function)
- // delete user info and appointment for [admin-route] >>>
  app.delete("/user/:email", function)
- // get appointment invoice by id >>>
  app.get("/invoice/:id", function)
- // book appointment >>>
  app.post("/appointment", function)
- // get all services >>>
  app.get("/services", function)
- // view service details by id >>>
  app.get("/service/:id", function)

## Technologies

- NodeJs
- ExpressJs
- Firebase Authentication
- jsonwebtoken
- Mongodb
- Cors

## Instructions for setup


### Firebase Setup

- Create a firebase account.
- Sign in.
- Go to Console (on top left)
- Create Project
- Dashboard > Project Settings. The secret key is the Web API Key.
- Modify MediTro-Health-Care/src/firebaseConfig.js to add configuration from this page.

### Setup MongoDB

- Install mongoDB. Run mongodb shell with `mongosh`. Get localhost IP and port from Welcome message. 
- Create `Doctors-portals` database in mongodb
- Create Services collection in mongodb :  `mongoimport --jsonArray --db Doctors-portals --collection Services --file MediTro-Server/services.json`
- Update monogodb server url in index.js.

### Start Server

`ADMIN=abhiag.719@gmail.com SECRET_KEY=<firebase-web-api-key> PORT=5001 node index.js`

### Add Admin

- Login with admin email so that the user gets create in the users collection in the mongoDB
- Change the role of `abhiag.719@gmail.com` to admin with (in mongosh) :

```
use Doctors-portals

db.users.updateOne(
  { email: "abhiag.719@gmail.com" },
  { $set: { role: "admin" } }
)
```

