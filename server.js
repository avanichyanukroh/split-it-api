const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(cors());

// parse various different custom JSON types as JSON
app.use(bodyParser.json({ type: 'application/*+json' }))


app.get('/', (req, res) => {
  res.send({
      msg: 'Hello! The server is currently running!'
  });
});

app.post('/api/mapJSON', (req, res) => {
    var asyncRequest = new Promise(function(resolve, reject){
        resolve(mapReceipt(req.body.results))
      })
      asyncRequest
      .then((mappedResults) => {
        res.status(201).send(mappedResults);
      })
      .catch((err)=> res.status(400).send(err))
});

function mapReceipt(data) {

  let textAnnotations = data.responses[0].textAnnotations;

  let mapOutput ={
      receipt: {}
  };
  let itemNameCount = 1;
  let itemPriceCount = 1;
  let rowPosition = 0;
  let rowQueue = [];
  let isCurrency = false;

  for (let i = 1; i < textAnnotations.length; i++) {
      console.log('rowQueue currently: ', rowQueue);
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
        console.log("reached $ on:, ", i)
          if (rowQueue.join(' ') === '') {
              console.log('mapping broke on: ', i);
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