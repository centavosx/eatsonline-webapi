const fs=require("fs");
const data = require("./firebase/firebasecon");
const cors = require('cors');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const {generateCode, checkLastKey, email} = require("./functions.js");
const e = require("cors");
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
app.use(function(err, req, res, next) {
  res.status(err.status || 500).json({error: true, message:"Error"});
});

app.post("/api/v1/register", async(req,res)=>{
    try{
      let datas = req.body;
      data.ref("accounts").orderByChild("email").equalTo(datas.email).once("value", async(snapshot)=>{
        let ch = false;
        if(snapshot.val()!=null){
          snapshot.forEach((x)=>{
            let key = "";
            key = x;
            if(x.val().verified){
              ch = true;
              res.send({registered: false,
                registered: false,
                message: 'Email is already registered'
              });
            }else{
              data.ref("accounts").child(x.key).remove();
            }
          });   
        }
        if(!ch){
          const id = await checkLastKey('accounts');
          let date = new Date();
          let endDate = new Date(parseInt(date.getTime())+86400000).toString();
          datas.id = id;
          datas.totalspent = 0;
          datas.verified = false;
          datas.verificationCode = generateCode();
          datas.verifyend = endDate;
          datas.dateCreated = date.toString();
          let x = data.ref("accounts").push(datas);
          data.ref("accounts").child(x.key).child("addresses").push({address:datas.address, primary: true}).then(()=>{
            email(datas.email, "Verification Code for your Eats Online PH account", datas.verificationCode, datas.name, endDate).then((x)=>{
              if(x){
                res.send({
                  registered: true,
                  message: 'Successfully registered and a verification code has been sent to your email...'
                });
              }else{          
                res.send({
                  registered: false,
                  message: 'Failed to send verification code...'
                });
              }
            })
          })
        }
      })
    }catch(e){
      res.status(500).send({error: true, message: "Error"});
    }

})


app.post("/api/v1/login", (req, res)=>{
    try{
      let datas = req.body;
      data.ref("accounts").orderByChild("email").equalTo(datas.email).once("value", (snapshot)=>{
        snapshot.forEach((x)=>{
          if(x.val().password === datas.password){
            if(x.val().verified){
              res.send({
                id: x.key,
                name: x.val().name,
                login: true,
                message: "Successful"
              })
            }else{
              res.send({
                id: x.key,
                name: x.val().name,
                login: false,
                message: "Not verified"
              })
            }
          }else{
            res.send({
              login: false,
              message: "Wrong password"
            });
          }
        });
      });
    }catch(e){
      res.status(500).send({error: true, message: "Error"});
    }
 
});

app.patch("/api/v1/reverify", (req, res)=>{
  try{
    let datas = req.body;
    let date = new Date();
    let endDate = new Date(parseInt(date.getTime())+86400000).toString();
    let update = {}
    update.verificationCode = generateCode();
    update.verifyend = endDate;
    data.ref("accounts").child(datas.id).update(update).then(()=>{
      email(datas.email, "Verification Code for your Eats Online PH account", update.verificationCode, datas.name, endDate).then((x)=>{
        if(x){
          res.send({
            registered: true,
            message: 'New verification has been sent!'
          });
        }else{          
          res.send({
            registered: false,
            message: 'Failed to send verification code...'
          });
        }
      })
    })
  }catch(e){
    res.status(500).send({error: true, message:"Error"});
  }
})


app.patch("/api/v1/verify", (req, res)=>{
    try{
    let datas = req.body;
    data.ref("accounts").orderByKey().equalTo(datas.id).once("value", (snapshot)=>{
      if(snapshot.val()==null){
        res.send({
          verified: false,
          message: "Account not found"
        })
      }else{
        snapshot.forEach((snap)=>{
          if(!snap.val().verified){
            if(snap.val().verificationCode===datas.code){
              let date = new Date(snap.val().verifyend);
              if(new Date() < date){
                data.ref("accounts").child(snap.key).update({verified: true, verificationCode: null, verifyend: null}).then(()=>{
                  res.send({
                    verified: true,
                    message: "Your account has been verified!"
                  })
                })
              }else{
                res.send({
                  verified: false,
                  message: "Verification code has been expired!"
                })
              }
            }else{
              res.send({
                verified: false,
                message: "Wrong Verification Code!"
              });
            }
          }else{
            res.send({
              verified: false,
              message: "Account is already verified!"
            });
          }
        })
      }
    })
    }catch(e){
      res.status(500).send({error: true, message: "Error"});
    }
})

app.post("/api/v1/profileData", (err, req) => {
    try{
      let datas = req.body;
      data.ref("accounts").orderByKey().equalTo(datas.id).once("value", (snapshot)=>{
        let object = {};  
        snapshot.forEach((snaps)=>{
            for(let key in snaps.val()){
              if(typeof datas.data === "object"){
                if(datas.data.includes(key)){
                  object[key] = snaps.val()[key];
                }
              }
            }
          })
        res.send(object);
      });
    }catch(e){
      res.status(500).send({error: true, message: "Error"});
    }
});


app.post("/api/v1/search", (err, req)=>{
    try{
      let datas = req.body;
      data.ref(datas.reference).orderByChild(datas.data).startAt(datas.value.toUpperCase()).endAt(datas.value.toLowerCase()+ "\uf8ff").once("value", (snapshot) =>{
        let x = [];
        snapshot.forEach((snap)=>{
          if(snap.val()[datas.data].toLowerCase().includes(datas.value.toLowerCase())){
            x.push([snap.key, snap.val()]);
          }
        });
        res.send({
          search:true,
          data: x
        })
      });
    }catch(e){
      res.status(500).send({error: true, message: "Error"});
    }
})

app.post("/api/v1/getData", (req, res)=>{
    try{
      let datas = req.body;
      data.ref(datas.reference).orderByChild(datas.sortwhat).once("value", (snapshot)=>{
        let x = [];
        if("index" in datas){
          let i = 0;
          snapshot.forEach((snap)=>{
            if(i >= (snapshot.numChildren()-datas.index[1]) && i <= (snapshot.numChildren() - datas.index[0])){
              x.push([snap.key, snap.val()]);
            }
            i++;
          })
        }else{
          snapshot.forEach((snap)=>{
            x.push([snap.key, snap.val()]);
          })
        }
        x.reverse();
        res.send({
          data: x
        })
      })
    }catch(e){
      res.status(500).send({error: true, message: "Error"});
    }

})

app.post("/api/v1/comment", (req, res)=>{
    try{
      let datas = req.body;
      data.ref("products").child(datas.id).child('comments').push({date: new Date().toString(), message: datas.message, user: datas.user, rating: datas.rate, email: datas.email, uid: datas.uid}).then(()=>{
        res.send({
          comment: datas.message,
          success: true,
          message: "Comment posted!"
        })
      });
    }catch(e){
      res.status(500).send({error: true, message: "Error"});
    }

})

app.get("/api/v1/comment", (req, res) =>{

    try{
      let datas = req.body;
      data.ref("products").child(datas.id).child("comments").once("value", (snapshot)=>{
        let x = [];
        snapshot.forEach((val)=>{
          x.push([val.key, val.val()]);
        })
        res.send({data:x});
      })
    }catch(e){
      res.status(500).send({error: true, message: "Error"});
    }
})

app.patch("/api/v1/profileData", (req, res)=>{
    try{
      let datas = req.body;
      data.ref("accounts").child(datas.id).update(datas.data).then(()=>{
        res.send({update: true, message:"Account Updated!"});
      })
    }catch(e){
      res.status(500).send({error: true, message: "Error"});
    }
})

app.listen(port, () => {
    console.log("app listening on port: ", port);
})