const fs=require("fs");
const mysql = require("mysql");
const fileUpload = require('express-fileupload');
const express = require('express');
const bodyParser = require('body-parser');
const moveFile = require('move-file');
const app = express();
const port = 8001;
const cors = require('cors')

app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  }));
app.use(cors());

app.use(bodyParser.json({
    limit: '50mb'
  }));
  
  app.use(bodyParser.urlencoded({
    limit: '50mb',
    parameterLimit: 100000,
    extended: false 
  }));
  
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if ('OPTIONS' == req.method) {
       res.sendStatus(200);
     }
     else {
       next();
     }});
  
     function urltoFile(url, filename, mimeType){

          return new File(url, filename,{type:mimeType});
        }
    
    
         
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "siaproj"
});
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
  });


  app.get("/accounts", (req,res)=>{
    con.query("SELECT * FROM accounts", function (err, result, fields) {
        if (err) throw err;
            res.send(result);
        });
      });
      app.get("/transactions", (req,res)=>{
      con.query("SELECT * FROM transactions", function (err, result, fields) {
        if (err) throw err;
            res.send(result);
        });
      });
      app.get("/applications", (req,res)=>{
      con.query("SELECT * FROM applications", function (err, result, fields) {
        if (err) throw err;
            res.send(result);
        });
      });
      app.get("/events", (req,res)=>{
      con.query("SELECT * FROM events", function (err, result, fields) {
        if (err) throw err;
            res.send(result);
        });
      });
      app.get("/admins", (req,res)=>{
      con.query("SELECT * FROM admins", function (err, result, fields) {
        if (err) throw err;
            res.send(result);
        });
      });

    app.post("/accounts", (req,res)=>{
            var values = [req.body.id, req.body.name, req.body.image, req.body.email, 
                req.body.contactnumber, req.body.birthday, req.body.address, req.body.username, req.body.grades,
            req.body.allowance, req.body.weeklyallowance, req.body.password];
            con.query("INSERT INTO accounts VALUES (?)", [values], function(err, res){
                if(err) throw err;
                
            })
            res.json({
                message: 'Success!'
            })
    });
    app.post("/events", (req,res)=>{
        var values = [req.body.event, req.body.date, req.body.time, 
            req.body.host, req.body.venue, req.body.id];
        con.query("INSERT INTO events VALUES (?)", [values], function(err, res){
            if(err) throw err;
            
        })
        res.json({
            message: 'Success!'
        })
});
    app.post("/transactions",cors(), (req,res)=>{
        var values = [req.body.id, req.body.userid, req.body.name, req.body.type, req.body.date, req.body.money, req.body.withdep];
        con.query("INSERT INTO transactions VALUES (?)", [values], function(err, res){
            if(err) throw err;
        })
        res.json({
            message: 'Success!'
        })
});
    app.put("/accounts/:id", (req,res)=>{
            var sql = `UPDATE accounts SET id=${req.params.id},name='${req.body.name}',image='${req.body.image}',email='${req.body.email}',contactnumber='${req.body.contactnumber}',birthday='${req.body.birthday}',address='${req.body.address}',username='${req.body.username}',grades=${req.body.grades},allowance=${req.body.allowance},weeklyallowance=${req.body.weeklyallowance},password='${req.body.password}' WHERE id=${req.params.id}`;
            con.query(sql, function(err, res, fields){
                if(err) throw err;
                
            });
            res.json({
                message: 'Success!'
            })
    })
    app.put("/applications/:id", (req,res)=>{
        
        var sql = `UPDATE applications SET approved= ${req.body.approved} WHERE id=${req.params.id}`;
        con.query(sql, function(err, res, fields){
            if(err) throw err;
        });
        res.json({
            message: 'Success!'
        })
})
    app.delete("/accounts/:id", (req,res)=>{
        var sql = `DELETE FROM accounts WHERE id= ${req.params.id}`;
        con.query(sql, function(err, res, fields){
            if(err) throw err;
        });
        res.json({
            message: 'Success!'
        })
    })
    app.get("/downloadFile/:id", (req, res)=>{
        fs.readFile("./files/"+req.params.id, "utf8", function(err, data){
            if(err) throw err;
            res.send(data);
        });
    })
    app.post('/uploadFile/:id', async (req, res) => {
        if (!req.files) {
            return res.status(500).send({ msg: "file is not found" })
        }
            // accessing the file
        const myFile = req.files.file;    //  mv() method places the file inside public directory
        myFile.mv(`temp/${req.params.id}${myFile.name}`, function (err) {
            if (err) {
                console.log(err)
                return res.status(500).send({ msg: "Error occured" });
            }
            // returing the response with file path and name
            return res.send({name: myFile.name, path: `/${myFile.name}`});
        });
    });
   app.post("/applications/", (req, res)=>{
    moveFile('./temp/'+req.body.bdaycert, './files/'+req.body.bdaycert);
    moveFile('./temp/'+req.body.grade, './files/'+req.body.grade);
    moveFile('./temp/'+req.body.schoolid, './files/'+req.body.schoolid);

    var values = [req.body.id, req.body.firstname, req.body.lastname, req.body.email, 
        req.body.phone, req.body.bday, req.body.address, req.body.bdaycert, req.body.grade,
        req.body.schoolid, req.body.image, req.body.approved];
    con.query("INSERT INTO applications VALUES (?)", [values], function(err, res){
        if(err) throw err;
        
    })
    res.json({
        message: 'Success!'
    })
   })
   app.delete("/applications/:id", (req,res)=>{
    var sql = `DELETE FROM applications WHERE id= ${req.params.id}`;
    con.query(sql, function(err, res, fields){
        if(err) throw err;
    });
    res.json({
        message: 'Success!'
    })
})
app.delete("/events/:id", (req,res)=>{
    var sql = `DELETE FROM events WHERE id= ${req.params.id}`;
    con.query(sql, function(err, res, fields){
        if(err) throw err;
    });
    res.json({
        message: 'Success!'
    })
})
  app.post('/addWeeklytoall', (req,res) => {
    con.query("SELECT * FROM accounts", function (err, result, fields) {
        if (err) throw err;
            for(var i=0; i<result.length; i++){
                var money = result[i].weeklyallowance + req.body.money;
                con.query(`UPDATE accounts SET weeklyallowance=${money} WHERE id=${result[i].id}`, function(err, res, fields){
                    if(err) throw err;
                });
            }
        });
        res.json({
            message: 'Success!'
        })
      });

app.listen(port, () => {
    console.log("app listening on port: ", port);
})