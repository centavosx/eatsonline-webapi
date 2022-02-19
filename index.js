const fs = require("fs");
const data = require("./firebase/firebasecon");
const cors = require('cors');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const {encrypt, encryptJSON, decryptJSON, decrypt, generateCode, checkLastKey, email, sendProfileData} = require("./functions.js");
const e = require("cors");
const CryptoJS = require("crypto-js");
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
  res.status(err.status || 500).json(encryptJSON({error: true, message:"Error"}));
});

app.post("/api/v1/guest",


)

app.post("/api/v1/guest", async(req,res)=>{
    try{ 
      let date = new Date();
      const id = await checkLastKey('accounts');
      let x = data.ref("accounts").push({
        dateCreated: date.toString(),
        totalspent: 0,
        phoneNumber: "",
        email: "GUEST",
        guest: true,
        id: id,
        verified: true
      });
      data.ref("accounts").child(x.key).update({name: 'Guest -'+encrypt(x.key)}).then(()=>{
        res.send(encryptJSON({
          registered: true,
          id: encrypt(x.key)
        }))
      })
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));
    }
})

app.post("/api/v1/register", async(req,res)=>{
    try{  req.body = decryptJSON(req.body.data)
      let datas = req.body;
      data.ref("accounts").orderByChild("email").equalTo(datas.email).once("value", async(snapshot)=>{
        let ch = false;
        if(snapshot.val()!=null){
          snapshot.forEach((x)=>{
            let key = "";
            key = x;
            if(x.val().verified){
              ch = true;
              res.send(encryptJSON({registered: false,
                registered: false,
                message: 'Email is already registered'
              }));
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
          datas.guest = false;
          let x = data.ref("accounts").push(datas);
          data.ref("accounts").child(x.key).child("addresses").push({address:datas.address, primary: true}).then(()=>{
            email(datas.email, "Verification Code for your Eats Online PH account", datas.verificationCode, datas.name, endDate).then((x)=>{
              if(x){
                res.send(encryptJSON({
                  registered: true,
                  message: 'Successfully registered and a verification code has been sent to your email...'
                }));
              }else{          
                res.send(encryptJSON({
                  registered: false,
                  message: 'Failed to send verification code...'
                }));
              }
            })
          })
        }
      })
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));
    }
})



app.post("/api/v1/login", (req, res)=>{
    try{  req.body = decryptJSON(req.body.data)
      let datas = req.body;
      data.ref("accounts").orderByChild("email").equalTo(datas.email).once("value", (snapshot)=>{
        snapshot.forEach((x)=>{
          if(x.val().password === datas.password){
            if(x.val().verified){
              res.send(encryptJSON({
                id: encrypt(x.key),
                name: x.val().name,
                login: true,
                message: "Successful"
              }))
            }else{
              res.send(encryptJSON({
                id: encrypt(x.key),
                name: x.val().name,
                login: false,
                message: "Not verified"
              }))
            }
          }else{
            res.send(encryptJSON({
              login: false,
              message: "Wrong password"
            }));
          }
        });
      });
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));
    }
 
});

app.patch("/api/v1/reverify", (req, res)=>{
  try{  req.body = decryptJSON(req.body.data)
    let datas = req.body;
    let date = new Date();
    let endDate = new Date(parseInt(date.getTime())+86400000).toString();
    let update = {}
    update.verificationCode = generateCode();
    update.verifyend = endDate;
    data.ref("accounts").child(decrypt(datas.id)).update(update).then(()=>{
      email(datas.email, "Verification Code for your Eats Online PH account", update.verificationCode, datas.name, endDate).then((x)=>{
        if(x){
          res.send(encryptJSON({
            sent: true,
            message: 'New verification has been sent!'
          }));
        }else{          
          res.send(encryptJSON({
            sent: false,
            message: 'Failed to send verification code...'
          }));
        }
      })
    })
  }catch(e){
    res.status(500).send(encryptJSON({error: true, message:"Error"}));
  }
})


app.patch("/api/v1/verify", (req, res)=>{
    try{  req.body = decryptJSON(req.body.data)
    let datas = req.body;
    data.ref("accounts").orderByKey().equalTo(decrypt(datas.id)).once("value", (snapshot)=>{
      if(snapshot.val()==null){
        res.send(encryptJSON({
          verified: false,
          message: "Account not found"
        }))
      }else{
        snapshot.forEach((snap)=>{
          if(!snap.val().verified){
            if(snap.val().verificationCode===datas.code){
              let date = new Date(snap.val().verifyend);
              if(new Date() < date){
                data.ref("accounts").child(snap.key).update({verified: true, verificationCode: null, verifyend: null}).then(()=>{
                  res.send(encryptJSON({
                    verified: true,
                    message: "Your account has been verified!"
                  }))
                })
              }else{
                res.send(encryptJSON({
                  verified: false,
                  message: "Verification code has been expired!"
                }))
              }
            }else{
              res.send(encryptJSON({
                verified: false,
                message: "Wrong Verification Code!"
              }));
            }
          }else{
            res.send(encryptJSON({
              verified: false,
              message: "Account is already verified!"
            }));
          }
        })
      }
    })
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));
    }
})

app.post("/api/v1/address", (req, res)=>{
    try{  req.body = decryptJSON(req.body.data)
      let datas = req.body;
      data.ref("accounts").child(decrypt(datas.id)).child("addresses").push({address: datas.address, primary: false}).then(()=>{
        res.send(encryptJSON({
          added: true,
          message: "Address Added!" 
        }))
      })
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));     
    }
});

app.patch("/api/v1/address", (req, res)=>{
  try{  req.body = decryptJSON(req.body.data)
    let datas = req.body;
    datas.id = decrypt(datas.id);
    if(datas.change){
      data.ref("accounts").child(datas.id).child("addresses").child(datas.addressId).update({address: datas.address}).then(()=>{
        res.send(encryptJSON({
          updated: true,
          message: 'Address Updated'
        }));
      })
    }else{
      data.ref("accounts").child(datas.id).child("addresses").orderByChild("primary").equalTo(true).once('value', (snapshot)=>{
        snapshot.forEach((snap)=>{
          data.ref("accounts").child(datas.id).child("addresses").child(snap.key).update({primary: false}).then(()=>{
            data.ref("accounts").child(datas.id).child("addresses").child(datas.addressId).update({address: datas.address, primary: datas.primary}).then(()=>{
              res.send(encryptJSON({
                updated: true,
                message: 'Address Updated'
              }));
            })
          })
        })
      })
    }
  }catch(e){
    res.status(500).send(encryptJSON({error: true, message: "Error"}));     
  }
});

app.post("/api/v1/profileData", (req, res) => {
    try{  req.body = decryptJSON(req.body.data)
      sendProfileData(req, res);
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));
    }
});

app.patch("/api/v1/profileData", (req, res)=>{
  try{  req.body = decryptJSON(req.body.data)
    let datas = req.body;
    datas.id = decrypt(datas.id);
    data.ref("accounts").child(datas.id).update(datas.updateData).then(()=>{
      sendProfileData(req, res);
    });
  }catch(e){
    res.status(500).send(encryptJSON({error: true, message: "Error"}));
  }
})

app.post("/api/v1/search", (req, res)=>{
    try{  req.body = decryptJSON(req.body.data)
      let datas = req.body;

      data.ref(datas.reference).orderByChild(datas.data).startAt(datas.value.toUpperCase()).endAt(datas.value.toLowerCase()+ "\uf8ff").once("value", (snapshot) =>{
        let x = [];
        snapshot.forEach((snap)=>{
          if(snap.val()[datas.data].toLowerCase().includes(datas.value.toLowerCase())){
            x.push([encrypt(snap.key), snap.val()]);
          }
        });
        res.send(encryptJSON({
          search:true,
          data: x
        }))
      });
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));
    }
})

app.post("/api/v1/singleproduct", (req, res)=>{
  try{  
    req.body = decryptJSON(req.body.data)
    let datas = req.body;
    datas.id = decrypt(datas.id);
    
    data.ref("products").child(datas.id).once('value', (snapshot)=>{
      let obj = snapshot.val()
      if("adv" in obj){
        let value = [];
        for(let i in obj.adv){
          value.push(obj.adv[i].date);
        }
        obj.adv = value
      }
      res.send(encryptJSON({
        data: obj
      }));
    })
  }catch(e){
    res.status(500).send(encryptJSON({error: true, message: "Error"}));
  }
})

app.post("/api/v1/getData", (req, res)=>{
    try{  req.body = decryptJSON(req.body.data)
      let datas = req.body;
      data.ref(datas.reference).orderByChild(datas.sortwhat).once("value", (snapshot)=>{
        let x = [];
        if("index" in datas){
          let i = 0;
          snapshot.forEach((snap)=>{
            if(i >= (snapshot.numChildren()-datas.index[1]) && i <= (snapshot.numChildren() - datas.index[0])){
              x.push([encrypt(snap.key), snap.val()]);
            }
            i++;
          })
        }else{
          snapshot.forEach((snap)=>{
            x.push([encrypt(snap.key), snap.val()]);
          })
        }
        x.reverse();
        res.send(encryptJSON({
          data: x
        }))
      })
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));
    }

})

app.post("/api/v1/comment", (req, res)=>{
    try{  req.body = decryptJSON(req.body.data)
      let datas = req.body;
      datas.id = decrypt(datas.id)
      data.ref("products").child(datas.id).child('comments').push({date: new Date().toString(), message: datas.message, user: datas.user, rating: datas.rate, email: datas.email, uid: datas.uid}).then(()=>{
        res.send(encryptJSON({
          comment: datas.message,
          success: true,
          message: "Comment posted!"
        }))
      });
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));
    }

})


app.get("/api/v1/comment", (req, res) =>{
    try{  req.body = decryptJSON(req.body.data)
      let datas = req.body;
      datas.id = decrypt(datas.id);
      data.ref("products").child(datas.id).child("comments").once("value", (snapshot)=>{
        let x = [];
        snapshot.forEach((val)=>{
          x.push([encrypt(val.key), val.val()]);
        })
        res.send(encryptJSON({data:x}));
      })
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));
    }
})
app.post("/api/v1/cartprod", (res,res)=>{
  try{  req.body = decryptJSON(req.body.data)
    let datas = req.body;
    datas.id = decrypt(datas.id);
    data.ref("cart").child(datas.id).once('value', (snapshot)=>{
      let x = [];
      snapshot.forEach((snap)=>{
        x.push(encrypt(snap.val().key))
      })
      res.send(encryptJSON({
        data: x
      }))
    })
  }catch(e){
    res.status(500).send(encryptJSON({error: true, message: "Error"}));
  }
})
app.post("/api/v1/addcart", (req, res)=>{
  try{  req.body = decryptJSON(req.body.data)
    let datas = req.body;
    datas.id = decrypt(datas.id);
    datas.cartid = decrypt(datas.cartid);
    data.ref("cart").child(datas.id).orderByKey('key').equalTo(datas.cartid).once('value', (snapshot)=>{
      if(snapshot.val()===null){
          let obj = datas.data;
          obj['date'] = new Date().toString();
          obj['key'] = datas.cartid
          data.ref('cart').child(datas.id).push(obj).then(()=>{
            res.send(encryptJSON({
              added: true,
              message: 'Successfully added to Cart'
          }))
        });
      }else{
        res.send(encryptJSON({
          added: false,
          message: 'Already in cart!'
        }))
      }
    })
  }catch(e){
    res.status(500).send(encryptJSON({error: true, message: "Error"}));
  }
})
app.delete("/api/v1/cart", (req, res)=>{
  try{  req.body = decryptJSON(req.body.data)
    let datas = req.body;
    datas.id = decrypt(datas.id)
    data.ref("cart").child(datas.id).child(datas.key).remove().then(()=>{
      data.ref('cart').child(datas.id).once('value', (sn)=>{
        let x = [];
        sn.forEach((s)=>{
          let o = s.val()
          o.key = encrypt(o.key)
          x.push([s.key, o]);
        })
        res.send(encryptJSON({
          success: true,
          data: x,
          message: 'Cart Retrieved'
        }))
      });
    })
  }catch(e){
    res.status(500).send(encryptJSON({error: true, message: "Error"}))
  }
})
app.patch("/api/v1/cart", (req, res)=>{
  try{  req.body = decryptJSON(req.body.data)
    let datas = req.body;
    datas.data.key = decrypt(datas.data.key)
    data.ref("cart").child(datas.id).child(datas.key).update(datas.data).then(()=>{
      data.ref('cart').child(datas.id).once('value', (sn)=>{
        let x = [];
        sn.forEach((s)=>{
          let o = s.val()
          o.key = encrypt(o.key)
          x.push([s.key, o]);
        })
        res.send(encryptJSON({
          success: true,
          data: x,
          message: 'Cart Retrieved'
        }))
      });
    })
  }catch(e){
    res.status(500).send(encryptJSON({error: true, message: "Error"}))
  }
})

app.post("/api/v1/cart", (req,res)=>{
  try{  req.body = decryptJSON(req.body.data)
    let datas = req.body;
    data.ref('cart').child(datas.id).once('value', (snapshot)=>{
      snapshot.forEach((snap)=>{
        data.ref('products').orderByKey().equalTo(snap.val().key).once('value', (snapshot2)=>{
          if(snapshot2.val()!==null){
            snapshot2.forEach((snap2)=>{
              if(snap2.val().numberofitems<=0){
                data.ref('cart').child(datas.id).child(snap.key).remove();
              }else{
                let cartvalues = snap.val();
                cartvalues["title"]=snap2.val().title;
                cartvalues["seller"]=snap2.val().seller;
                cartvalues["type"]=snap2.val().type;
                cartvalues["desc"]=snap2.val().description;
                cartvalues["link"]=snap2.val().link;
                cartvalues["price"]=snap2.val().price;
                cartvalues["discount"]=snap2.val().discount==undefined?0:snap2.val().discount;
                cartvalues["startD"] = snap2.val().startD==undefined?null:snap2.val().startD;
                cartvalues["endD"] = snap2.val().endD==undefined?null:snap2.val().endD;
                data.ref('cart').child(datas.id).child(snap.key).update(cartvalues);
              }
            })
          }else{
            data.ref('cart').child(datas.id).child(snap.key).remove();
          }
        })
      })
    }).then(()=>{
      data.ref('cart').child(datas.id).once('value', (sn)=>{
        let x = [];
        sn.forEach((s)=>{
          x.push([s.key, s.val()]);
        })
        res.send(encryptJSON({
          success: true,
          data: x,
          message: 'Cart Retrieved'
        }))
      });
    })
  }catch(e){
    res.status(500).send(encryptJSON({error: true, message: "Error"}))
  }
})

app.patch("/api/v1/profileData", (req, res)=>{
    try{  req.body = decryptJSON(req.body.data)
      let datas = req.body;
      datas.id = decrypt(datas.id)
      data.ref("accounts").child(datas.id).update(datas.data).then(()=>{
        res.send(encryptJSON({update: true, message:"Account Updated!"}));
      })
    }catch(e){
      res.status(500).send(encryptJSON({error: true, message: "Error"}));
    }
})

app.post("/api/v1/cartNum", (req, res)=>{
  try{  req.body = decryptJSON(req.body.data)
    let datas = req.body;
    datas.id = decrypt(datas.id);
    data.ref("cart").child(datas.id).once('value', (snapshot)=>{
      res.send(encryptJSON({
        num: snapshot.numChildren()
      }))
    })
  }catch(e){
    res.status(500).send(encryptJSON({error: true, message: "Error"}))
  }
})

app.listen(port, () => {
    console.log("app listening on port: ", port);
})