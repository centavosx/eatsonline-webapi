const fs=require("fs");
const mysql = require("mysql");
const cors = require('cors');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = process.env.PORT || 8001;

  app.use(cors());
  app.use(bodyParser.json({
    limit: '50mb'
  }));
  app.use(cors());
  
  app.use(bodyParser.urlencoded({
    limit: '50mb',
    parameterLimit: 100000,
    extended: false 
  }));
  
 app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
  

const con = mysql.createConnection({
    host: "mysql5035.site4now.net",
    user: "a6b241_beejay",
    password: "09156401774w",
    database: "db_a6b241_beejay"
});
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
  });


  app.post("/transactions", (req,res)=>{
    var values = req.body.values;
    con.query("INSERT INTO Transactions VALUES ?", [values], function(err, res){
        if(err) throw err

    })
    res.send(req.body.values);
   
});

app.listen(port, () => {
    console.log("app listening on port: ", port);
})