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

  let textAnnotations = results.responses[0].textAnnotations;
  let receipt = {};
  let itemNameCount = 1;
  let itemPriceCount = 1;
  let rowQueue = [];
  let isCurrency = false;
  let rows = [];
  let tempItem;
  let tempCX = 0;
  let tempCY = 0;

  for (let i = 1; i < textAnnotations.length; i++) {

      tempCX = (textAnnotations[i].boundingPoly.vertices[0].x + textAnnotations[i].boundingPoly.vertices[1].x) / 2;
      tempCY = (textAnnotations[i].boundingPoly.vertices[0].y + textAnnotations[i].boundingPoly.vertices[2].y) / 2;
      tempItem = {
          description: textAnnotations[i].description,
          cx: tempCX / 10,
          cy: Math.round(tempCY / 10)
      }
      rows.push(tempItem)
  }

  rows.sort((a, b) => {
      return a.cy - b.cy && b.cx - b.cx
  })

  for (let i = 0; i < rows.length; i++) {
      if (i > 0) {
          if ((Math.abs(rows[i].cy - rows[i - 1].cy) > 3) && isCurrency === false) {
              rowQueue = [];
          }
  
          if ((Math.abs(rows[i].cy - rows[i - 1].cy) > 3) && isCurrency === true) {
              receipt[`item${itemPriceCount++}`].basePrice = rowQueue.join('');
              rowQueue = [];
              isCurrency = false;
          }
      }
      if (rows[i].description === "$") {
          if (rowQueue.join(' ') === '') {
              console.log('mapping broke on: ', i);
              break;
          }
          receipt[`item${itemNameCount++}`] = {
              name: rowQueue.join(' ')
          }
          rowQueue = [];
          isCurrency = true;
          continue;
      }

      rowQueue.push(rows[i].description);
  }

  let grandTotal = 0;
  let currentTotal;
  for (let i = 1; i < itemNameCount; i++) {
      receipt[`item${i}`]['fees'] = Math.floor(receipt[`item${i}`].basePrice * 0.098 * 100) / 100;
      currentTotal = parseFloat(receipt[`item${i}`].basePrice) + ((Math.floor(receipt[`item${i}`].basePrice * 0.098 * 100) / 100));
      grandTotal += currentTotal
      receipt[`item${i}`]['total'] = currentTotal;
  }

  receipt['grandTotal'] = Math.ceil(grandTotal * 100) / 100;
  console.log('FINAL RESULTS:  ', receipt);

  const mappedOutput = { receipt };
  return mappedOutput;
}

app.listen(port, () => {
  console.log('Live and ready to hack! Listening on port: ' + port);
});