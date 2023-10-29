const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT||5000;


app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l5bthlr.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyJWT = (req,res,next)=>{
  console.log('jwt token hitting');
  console.log(req.headers.authorization);
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error:true, message:'unauthorized access'})
  }

  const token = authorization.split(' ')[1];
  console.log('token inside verify jwt',token);
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRITY,(error,decoded)=>{
    if(error){
      return res.status(403).send({error:true,message:'unauthorized'})
    }
    req.decoded = decoded;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servicesCollection = client.db('carDoctor').collection('services') 

    const checkCollection = client.db('carDoctor').collection('checkOuts')

    // jwt

  app.post('/jwt',(req,res)=>{
    const user = req.body;
    console.log(user);
    const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRITY,{
      expiresIn:'720h'
    })
    // console.log(token);
    res.send({token})
  })

  app.get('/services',async(req,res)=>{
    const cursor = servicesCollection.find();
    const result = await cursor.toArray();
    res.send(result)
  })

  app.get('/services/:id',async(req,res)=>{
    const id = req.params.id;
    const query = { _id: new ObjectId(id)}

    const options = {
      // Include only the `title` and `imdb` fields in the returned document
      projection: {title: 1,price:1, service_id:1, img:1 },
    };

    const result = await servicesCollection.findOne(query,options)
    res.send(result)
  })

  // checkOuts

  app.post('/checkOuts',async(req,res)=>{
    const checkOut = req.body;
    const result = await checkCollection.insertOne(checkOut)
    res.send(result)
  })

  app.get('/checkOuts',verifyJWT, async(req,res)=>{
    const decoded = req.decoded;
    console.log('come back after verify',decoded);

    let query = {};
    if(req.query?.email){
      query = {email:req.query.email}
    }

    if(decoded.email !== query.email){
      return res.status(403).send({error:1, message:'forbidden access'})
     
    }

    const result = await checkCollection.find(query).toArray();
    res.send(result)
  })

  app.delete('/checkOuts/:id',async(req,res)=>{
    const id = req.params.id;
    const query = {_id:new ObjectId(id)}
    const result = await checkCollection.deleteOne(query)
    res.send(result)
  })

  app.patch('/checkOuts/:id',async(req,res)=>{
    const id = req.params.id;
    const filter = { _id: new ObjectId(id)}
    const updatedBooking = req.body;
    console.log(updatedBooking);
    const updateDoc = {
      $set: {
        status:updatedBooking.status
      },
    };
    const result = await checkCollection.updateOne(filter,updateDoc)
    res.send(result)
  })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send("car doctor is running")
})

app.listen(port,()=>{
    console.log(`car doctor server is running on PORT:${port}`);
})
