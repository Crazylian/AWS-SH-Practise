const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  return res.send(`OK - ${new Date()}`)
});

app.listen(port, () => {
  return console.log(`Example app listening on port ${port}`)
});