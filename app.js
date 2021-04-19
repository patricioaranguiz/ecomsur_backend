require('dotenv').config();
const cors = require('cors')
const express = require('express');
const app = express();
const bodyParser = require('body-parser')
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cors())
const port = process.env.PORT || 3000;
app.use('/api', require('./src/routes/index'))

app.get('/', function (req, res) {
  res.send("Hola mundo");
})

app.listen(port, () => {
  console.log('Server run OK');
})
