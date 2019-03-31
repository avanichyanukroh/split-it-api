const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(function (req, res) {
  res.setHeader('Content-Type', 'text/plain')
  res.write('you posted:\n')
  res.end(JSON.stringify(req.body, null, 2))
})

app.get('/', (req, res) => {
  res.send({
      msg: 'Hello! The server is currently running!'
  });
});

app.post('/api/mapJSON', (req, res) => {
  const mappedData = mapReceipt(req.body.results);
  console.log('mappedData: ', mappedData);
  res.status(201).send(mappedData);
});

function mapReceipt(data) {

  let textAnnotations = data.responses[0].textAnnotations

  console.log('req.body.results coming in: ', data);

  let mapOutput ={
      receipt: {}
  };
  let itemNameCount = 1;
  let itemPriceCount = 1;
  let rowPosition = 0;
  let rowQueue = [];
  let isCurrency = false;

  for (let i = 1; i < textAnnotations.length; i++) {
      if ((Math.abs(textAnnotations[i].boundingPoly.vertices[0].y - rowPosition) > 4 || i <= 1 ) && isCurrency === false) {
          rowPosition = textAnnotations[i].boundingPoly.vertices[0].y;
          rowQueue = [];
          isCurrency = false;
      }

      if ((Math.abs(textAnnotations[i].boundingPoly.vertices[0].y - rowPosition) > 4 || i <= 1 ) && isCurrency === true) {
          mapOutput.receipt[`item${itemPriceCount++}`].basePrice = rowQueue.join('');
          
          rowPosition = textAnnotations[i].boundingPoly.vertices[0].y;
          rowQueue = [];
          isCurrency = false;
      }

      if (textAnnotations[i].description === '$') {

          if (rowQueue.join(' ') === '') {
              break;
          }
          
          mapOutput.receipt[`item${itemNameCount++}`] = {
              name: rowQueue.join(' ')
          }
          rowQueue = [];
          isCurrency = true;
          continue;
      }

      rowQueue.push(textAnnotations[i].description);
  }
  
  let grandTotal = 0;
  let currentTotal;
  for (let i = 1; i < itemNameCount; i++) {
      mapOutput.receipt[`item${i}`]['fees'] = Math.floor(mapOutput.receipt[`item${i}`].basePrice * 0.098 * 100) / 100;
      currentTotal = parseFloat(mapOutput.receipt[`item${i}`].basePrice) + ((Math.floor(mapOutput.receipt[`item${i}`].basePrice * 0.098 * 100) / 100));
      grandTotal += currentTotal
      mapOutput.receipt[`item${i}`]['total'] = currentTotal;
  }

  mapOutput.receipt['grandTotal'] = Math.ceil(grandTotal * 100) / 100;
  
  return mapOutput;
}

app.listen(port, () => {
  console.log('Live and ready to hack! Listening on port: ' + port);
});