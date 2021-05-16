require('dotenv').config();
const fileUpload = require('express-fileupload');
const cors = require('cors')
const express = require('express');
const app = express();
const bodyParser = require('body-parser')
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cors())
app.use(fileUpload());
const port = process.env.PORT || 3000;
app.use('/api', require('./src/routes/index'))

app.use('/api/charts', require('./src/routes/charts'));

app.get('/', function (req, res) {
  res.send("Hola mundo");
})

app.listen(port, () => {
  console.log('Server run OK in port ', port);
})
