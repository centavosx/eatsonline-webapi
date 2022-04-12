const { data, storage } = require('./firebase/firebasecon')
const cors = require('cors')
const express = require('express')
const uploadD = require('express-fileupload')
const app = express()
const server = require('http').createServer(app)
// Pass a http.Server instance to the listen method
const io = require('socket.io')(server)

// The server should start listening
const bodyParser = require('body-parser')
const {
  encrypt,
  encryptJSON,
  decryptJSON,
  decrypt,
  generateCode,
  emailByUser,
  checkLastKey,
  email,
  sendProfileData,
} = require('./functions.js')
const e = require('cors')
const cli = require('nodemon/lib/cli')

const port = process.env.PORT || 8001

app.use(cors())
app.use(uploadD())
app.use(
  bodyParser.json({
    limit: '50mb',
  })
)
app.use(cors())

app.use(
  bodyParser.urlencoded({
    limit: '50mb',
    parameterLimit: 100000,
    extended: false,
  })
)

app.use(function async(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, PATCH, DELETE'
  )
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
  res.setHeader('Access-Control-Allow-Credentials', true)
  next()
})

app.use(function (err, req, res, next) {
  res.json(encryptJSON({ error: true, message: 'Error' }))
})

//websockets

app.post('/api/v1/contactus', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.date_created = new Date().toString()
    let x = await emailByUser(
      datas.name,
      datas.email,
      datas.message,
      datas.date_created,
      datas.subject
    )
    if (x) await data.ref('contactus').push(datas)
    res.send(encryptJSON({ sent: x }))
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.delete('/api/v1/deleteprofileimage', async (req, res) => {
  try {
    const body = decryptJSON(
      JSON.parse(req.query.data.replaceAll(' ', '+')).data
    )
    let idn = decrypt(body.id)
    let ref = storage.ref(`accounts/${idn}/image`)
    try {
      let dir = await ref.listAll()
      dir.items.forEach(async (fileRef) => {
        var dirRef = storage.ref(fileRef.fullPath)
        let url = await dirRef.getDownloadURL()
        let imgRef = storage.refFromURL(url)
        await imgRef.delete()
      })
    } catch {}
    await data.ref('accounts').child(idn).update({ img: null })
    res.send(encryptJSON({ deleted: true }))
  } catch (e) {
    console.log(e)
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.post('/api/v1/uploadprofileimage', async (req, res) => {
  try {
    const datav = req.files
    const body = decryptJSON(req.body.data)
    let buffer = datav['image'].data
    let imagename = body.imagename
    let idn = decrypt(body.id)
    let ref = storage.ref(`accounts/${idn}/image`)
    try {
      let dir = await ref.listAll()
      dir.items.forEach(async (fileRef) => {
        var dirRef = storage.ref(fileRef.fullPath)
        let url = await dirRef.getDownloadURL()
        let imgRef = storage.refFromURL(url)
        await imgRef.delete()
      })
    } catch {}
    await storage
      .ref(`accounts`)
      .child(idn)
      .child('image')
      .child(imagename)
      .put(buffer)
    const url = await storage
      .ref(`accounts/${idn}/image`)
      .child(imagename)
      .getDownloadURL()
    await data.ref('accounts').child(idn).update({ img: url })
    res.send(encryptJSON({ url: url }))
  } catch (e) {
    console.log(e)
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})
app.delete('/api/v1/deletereceipt', async (req, res) => {
  try {
    const body = decryptJSON(
      JSON.parse(req.query.data.replaceAll(' ', '+')).data
    )
    let idn = decrypt(body.id)
    let ref = storage.ref(`receipt/${body.what}/${idn}`)
    try {
      let dir = await ref.listAll()
      dir.items.forEach(async (fileRef) => {
        var dirRef = storage.ref(fileRef.fullPath)
        let url = await dirRef.getDownloadURL()
        let imgRef = storage.refFromURL(url)
        await imgRef.delete()
      })
    } catch {}
    await data.ref(body.what).child(idn).update({ receipt: url })
    res.send(encryptJSON({ deleted: true }))
  } catch (e) {
    console.log(e)
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})
app.post('/api/v1/uploadreceipt', async (req, res) => {
  try {
    const datav = req.files
    const body = decryptJSON(req.body.data)
    let buffer = datav['image'].data
    let imagename = body.imagename
    let idn = decrypt(body.id)
    let ref = storage.ref(`receipt/${body.what}/${idn}`)
    try {
      let dir = await ref.listAll()
      dir.items.forEach(async (fileRef) => {
        var dirRef = storage.ref(fileRef.fullPath)
        let url = await dirRef.getDownloadURL()
        let imgRef = storage.refFromURL(url)
        await imgRef.delete()
      })
    } catch {}
    await storage
      .ref(`receipt`)
      .child(body.what)
      .child(idn)
      .child(imagename)
      .put(buffer)
    const url = await storage
      .ref(`receipt/${body.what}/${idn}`)
      .child(imagename)
      .getDownloadURL()
    await data.ref(body.what).child(idn).update({ receipt: url })
    res.send(encryptJSON({ url: url }))
  } catch (e) {
    console.log(e)
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
})

app.post('/api/v1/recommended', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    let snapshot = await data.ref('products').once('value')
    let x = []
    snapshot.forEach((d) => {
      if (d.val().seller === datas.seller || d.val().type === datas.type) {
        x.push([encrypt(d.key), d.val()])
      } else {
        if (datas.title !== d.val().title) {
          let name = datas.title.split(' ')
          for (let x of name) {
            if (d.val().title.includes('x')) x.push([encrypt(d.key), d.val()])
          }
        }
      }
    })
    res.send(
      encryptJSON({
        data: x,
      })
    )
  } catch (e) {
    console.log(e)
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/guest', async (req, res) => {
  try {
    let date = new Date()
    const id = await checkLastKey('accounts')
    let x = data.ref('accounts').push({
      dateCreated: date.toString(),
      totalspent: 0,
      phoneNumber: '',
      email: 'GUEST',
      guest: true,
      id: id,
      verified: true,
    })

    data
      .ref('accounts')
      .child(x.key)
      .update({ name: 'Guest -' + encrypt(x.key) })
      .then(async () => {
        res.send(
          encryptJSON({
            registered: true,
            id: encrypt(x.key),
          })
        )
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/register', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    data
      .ref('accounts')
      .orderByChild('email')
      .equalTo(datas.email)
      .once('value', async (snapshot) => {
        let ch = false
        if (snapshot.val() != null) {
          snapshot.forEach((x) => {
            let key = ''
            key = x
            if (x.val().verified) {
              ch = true
              res.send(
                encryptJSON({
                  registered: false,
                  registered: false,
                  message: 'Email is already registered',
                })
              )
            } else {
              data.ref('accounts').child(x.key).remove()
            }
          })
        }
        if (!ch) {
          const id = await checkLastKey('accounts')
          let date = new Date()
          let endDate = new Date(parseInt(date.getTime()) + 86400000).toString()
          datas.id = id
          datas.totalspent = 0
          datas.verified = false
          datas.verificationCode = generateCode()
          datas.verifyend = endDate
          datas.dateCreated = date.toString()
          datas.guest = false
          let x = data.ref('accounts').push(datas)
          data
            .ref('accounts')
            .child(x.key)
            .child('addresses')
            .push({ address: datas.address, primary: true })
            .then(async () => {
              email(
                datas.email,
                'Verification Code for your Eats Online PH account',
                datas.verificationCode,
                datas.name,
                endDate
              ).then((x) => {
                if (x) {
                  res.send(
                    encryptJSON({
                      registered: true,
                      message:
                        'Successfully registered and a verification code has been sent to your email...',
                    })
                  )
                } else {
                  res.send(
                    encryptJSON({
                      registered: false,
                      message: 'Failed to send verification code...',
                    })
                  )
                }
              })
            })
        }
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/login', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    data
      .ref('accounts')
      .orderByChild('email')
      .equalTo(datas.email)
      .once('value', (snapshot) => {
        snapshot.forEach((x) => {
          if (x.val().password === datas.password) {
            if (x.val().verified) {
              res.send(
                encryptJSON({
                  id: encrypt(x.key),
                  name: x.val().name,
                  login: true,
                  message: 'Successful',
                })
              )
            } else {
              res.send(
                encryptJSON({
                  id: encrypt(x.key),
                  name: x.val().name,
                  login: false,
                  message: 'Not verified',
                })
              )
            }
          } else {
            res.send(
              encryptJSON({
                login: false,
                message: 'Wrong password',
              })
            )
          }
        })
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.patch('/api/v1/reverify', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    let date = new Date()
    let endDate = new Date(parseInt(date.getTime()) + 86400000).toString()
    let update = {}
    update.verificationCode = generateCode()
    update.verifyend = endDate
    data
      .ref('accounts')
      .child(decrypt(datas.id))
      .update(update)
      .then(async () => {
        email(
          datas.email,
          'Verification Code for your Eats Online PH account',
          update.verificationCode,
          datas.name,
          endDate
        ).then((x) => {
          if (x) {
            res.send(
              encryptJSON({
                sent: true,
                message: 'New verification has been sent!',
              })
            )
          } else {
            res.send(
              encryptJSON({
                sent: false,
                message: 'Failed to send verification code...',
              })
            )
          }
        })
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.patch('/api/v1/verify', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    data
      .ref('accounts')
      .orderByKey()
      .equalTo(decrypt(datas.id))
      .once('value', (snapshot) => {
        if (snapshot.val() == null) {
          res.send(
            encryptJSON({
              verified: false,
              message: 'Account not found',
            })
          )
        } else {
          snapshot.forEach((snap) => {
            if (!snap.val().verified) {
              if (snap.val().verificationCode === datas.code) {
                let date = new Date(snap.val().verifyend)
                if (new Date() < date) {
                  data
                    .ref('accounts')
                    .child(snap.key)
                    .update({
                      verified: true,
                      verificationCode: null,
                      verifyend: null,
                    })
                    .then(async () => {
                      res.send(
                        encryptJSON({
                          verified: true,
                          message: 'Your account has been verified!',
                        })
                      )
                    })
                } else {
                  res.send(
                    encryptJSON({
                      verified: false,
                      message: 'Verification code has been expired!',
                    })
                  )
                }
              } else {
                res.send(
                  encryptJSON({
                    verified: false,
                    message: 'Wrong Verification Code!',
                  })
                )
              }
            } else {
              res.send(
                encryptJSON({
                  verified: false,
                  message: 'Account is already verified!',
                })
              )
            }
          })
        }
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/address', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    data
      .ref('accounts')
      .child(datas.id)
      .child('addresses')
      .orderByChild('primary')
      .equalTo(true)
      .once('value', (snapshot) => {
        let o = false
        if (snapshot.val() == null) {
          o = true
        }
        data
          .ref('accounts')
          .child(datas.id)
          .child('addresses')
          .push({ address: datas.address, primary: o })
          .then(async () => {
            await sendProfileData(datas, res)
          })
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.patch('/api/v1/address', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    if (datas.change) {
      data
        .ref('accounts')
        .child(datas.id)
        .child('addresses')
        .child(datas.addressId)
        .update({ address: datas.address })
        .then(async () => {
          await sendProfileData(datas, res)
        })
    } else {
      data
        .ref('accounts')
        .child(datas.id)
        .child('addresses')
        .orderByChild('primary')
        .equalTo(true)
        .once('value', (snapshot) => {
          snapshot.forEach((snap) => {
            data
              .ref('accounts')
              .child(datas.id)
              .child('addresses')
              .child(snap.key)
              .update({ primary: false })
              .then(async () => {
                data
                  .ref('accounts')
                  .child(datas.id)
                  .child('addresses')
                  .child(datas.addressId)
                  .update({ address: datas.address, primary: datas.primary })
                  .then(async () => {
                    await sendProfileData(datas, res)
                  })
              })
          })
        })
    }
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})
app.delete('/api/v1/address', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    data
      .ref('accounts')
      .child(datas.id)
      .child('addresses')
      .child(datas.addressId)
      .remove()
      .then(async () => {
        await sendProfileData(datas, res)
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})
app.post('/api/v1/profileData', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    await sendProfileData(datas, res)
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.patch('/api/v1/profileData', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    data
      .ref('accounts')
      .child(datas.id)
      .update(datas.updateData)
      .then(async () => {
        await sendProfileData(datas, res)
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/search', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    data
      .ref(datas.reference)
      .orderByChild(datas.data)
      .startAt(datas.value.toUpperCase())
      .endAt(datas.value.toLowerCase() + '\uf8ff')
      .once('value', (snapshot) => {
        let x = []
        snapshot.forEach((snap) => {
          if (
            snap
              .val()
              [datas.data].toLowerCase()
              .includes(datas.value.toLowerCase())
          ) {
            let obj = snap.val()
            if ('comments' in obj) {
              let avgrate = 0
              let add = 0
              for (let i in obj.comments) {
                add += parseInt(obj.comments[i].rating)
                avgrate++
              }
              obj.comments = parseInt(add / avgrate)
            } else {
              obj.comments = 0
            }
            x.push([encrypt(snap.key), obj])
          }
        })
        res.send(
          encryptJSON({
            search: true,
            data: x,
          })
        )
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/singleproduct', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    if (datas.id != null) {
      datas.id = decrypt(datas.id)
      data
        .ref('products')
        .child(datas.id)
        .once('value', (snapshot) => {
          let obj = snapshot.val()
          if ('adv' in obj) {
            let value = []
            for (let i in obj.adv) {
              value.push(obj.adv[i].date)
            }
            obj.adv = value
          }
          if ('comments' in obj) {
            let avgrate = 0
            let add = 0
            for (let i in obj.comments) {
              add += parseInt(obj.comments[i].rating)
              avgrate++
            }
            obj.comments = parseInt(add / avgrate)
          } else {
            obj.comments = 0
          }
          res.send(
            encryptJSON({
              data: obj,
            })
          )
        })
    } else {
      res.status(200)
    }
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/getData', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    data
      .ref(datas.reference)
      .orderByChild(datas.sortwhat)
      .once('value', (snapshot) => {
        let x = []
        if ('index' in datas) {
          let i = 0
          snapshot.forEach((snap) => {
            if (
              i >= snapshot.numChildren() - datas.index[1] &&
              i <= snapshot.numChildren() - datas.index[0]
            ) {
              let obj = snap.val()
              if ('comments' in obj) {
                let avgrate = 0
                let add = 0
                for (let i in obj.comments) {
                  add += parseInt(obj.comments[i].rating)
                  avgrate++
                }
                obj.comments = parseInt(add / avgrate)
              } else {
                obj.comments = 0
              }
              x.push([encrypt(snap.key), obj])
            }
            i++
          })
        } else {
          snapshot.forEach((snap) => {
            let obj = snap.val()
            if ('comments' in obj) {
              let avgrate = 0
              let add = 0
              for (let i in obj.comments) {
                add += parseInt(obj.comments[i].rating)
                avgrate++
              }
              obj.comments = parseInt(add / avgrate)
            } else {
              obj.comments = 0
            }
            x.push([encrypt(snap.key), obj])
          })
        }
        x.reverse()
        res.send(
          encryptJSON({
            data: x,
          })
        )
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/comment', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)

    if (!datas.get) {
      datas.uid = decrypt(datas.uid)
      data
        .ref('accounts')
        .orderByKey()
        .equalTo(datas.uid)
        .once('value', (snap) => {
          if (snap.val() !== null) {
            data
              .ref('products')
              .child(datas.id)
              .child('comments')
              .push({
                date: new Date().toString(),
                message: datas.message,
                rating: datas.rate,
                id: datas.uid,
              })
              .then(async () => {
                res.send(
                  encryptJSON({
                    success: true,
                    message: 'Comment posted!',
                  })
                )
              })
          }
        })
    } else {
      data.ref('accounts').once('value', (snap) => {
        data
          .ref('products')
          .child(datas.id)
          .child('comments')
          .once('value', (snapshot) => {
            let x = []
            snapshot.forEach((val) => {
              if (val.val().id in snap.val()) {
                let ob = val.val()

                ob['name'] = snap.val()[val.val().id].name
                ob['img'] = snap.val()[val.val().id].img
                ob['email'] = snap.val()[val.val().id].email
                x.push([val.key, ob])
              }
            })
            res.send(encryptJSON({ data: x }))
          })
      })
    }
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/addcart', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    datas.cartid = decrypt(datas.cartid)
    data
      .ref('cart')
      .orderByKey()
      .equalTo(datas.id)
      .once('value', (snapshot) => {
        if (snapshot.val() === null) {
          data
            .ref('accounts')
            .orderByKey()
            .equalTo(datas.id)
            .once('value', (snap2) => {
              if (snap2.val() !== null) {
                let obj = {}
                obj['date'] = new Date().toString()
                obj['key'] = datas.cartid
                obj['amount'] = datas.amount
                data
                  .ref('cart')
                  .child(datas.id)
                  .push(obj)
                  .then(async () => {
                    res.send(
                      encryptJSON({
                        added: true,
                        message: 'Successfully added to Cart',
                      })
                    )
                  })
              } else {
                res
                  .status(500)
                  .send(encryptJSON({ error: true, message: 'Error', e: e }))
              }
            })
        } else {
          data
            .ref('cart')
            .child(datas.id)
            .orderByChild('key')
            .equalTo(datas.cartid)
            .once('value', (snapshot) => {
              if (snapshot.val() === null) {
                let obj = {}
                obj['date'] = new Date().toString()
                obj['key'] = datas.cartid
                obj['amount'] = datas.amount
                data
                  .ref('cart')
                  .child(datas.id)
                  .push(obj)
                  .then(async () => {
                    res.send(
                      encryptJSON({
                        added: true,
                        message: 'Successfully added to Cart',
                      })
                    )
                  })
              } else {
                res.send(
                  encryptJSON({
                    added: false,
                    message: 'Already in cart!',
                  })
                )
              }
            })
        }
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error', e: e }))
  }
})
app.delete('/api/v1/cart', async (req, res) => {
  try {
    console.log(req.query.data)
    req.query = decryptJSON(
      JSON.parse(req.query.data.replaceAll(' ', '+')).data
    )
    let datas = req.query
    console.log(datas)
    datas.id = decrypt(datas.id)
    const sn = await data.ref('cart').child(datas.id).once('value')
    let obj2 = sn.val()
    for (let x in obj2) {
      if (datas.keys.includes(x)) {
        delete obj2[x]
      }
    }
    console.log(obj2)
    await data.ref('cart').child(datas.id).set(obj2)
    const snapsnap = await data.ref('products').once('value')
    let keys = {}
    for (let x in obj2) {
      keys[obj2[x].key] = x
    }
    let x = []
    snapsnap.forEach((s) => {
      if (s.key in keys) {
        let o = s.val()
        o.key = encrypt(s.key)
        o.date = obj2[keys[s.key]].date
        o['amount'] = obj2[keys[s.key]].amount
        if ('adv' in o) {
          let value = []
          for (let val in o.adv) {
            value.push(o.adv[val].date)
          }
          o.adv = value
        }
        if ('comments' in o) {
          let avgrate = 0
          let add = 0
          for (let i in o.comments) {
            add += parseInt(o.comments[i].rating)
            avgrate++
          }
          o.comments = parseInt(add / avgrate)
        } else {
          o.comments = 0
        }
        x.push([keys[s.key], o])
      }
    })
    res.send(
      encryptJSON({
        success: true,
        data: x,
        message: 'Cart Retrieved',
      })
    )
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})
app.patch('/api/v1/cart', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    for (let i in datas.data) {
      datas.data[i].key = decrypt(datas.data[i].key)
    }
    data
      .ref('cart')
      .child(datas.id)
      .set(datas.data)
      .then(async () =>
        res.send(
          encryptJSON({
            success: true,
            message: 'Cart Retrieved',
          })
        )
      )
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/cart', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    data.ref('products').once('value', (snapsnap) => {
      data
        .ref('cart')
        .child(datas.id)
        .once('value', (sn) => {
          let obj2 = sn.val()
          let keys = {}
          for (let x in obj2) {
            keys[obj2[x].key] = x
          }
          let x = []
          snapsnap.forEach((s) => {
            if (s.key in keys) {
              let o = s.val()
              o.key = encrypt(s.key)
              o['amount'] = obj2[keys[s.key]].amount
              if ('adv' in o) {
                let value = []
                for (let val in o.adv) {
                  value.push(o.adv[val].date)
                }
                o.adv = value
              }
              if ('comments' in o) {
                let avgrate = 0
                let add = 0
                for (let i in o.comments) {
                  add += parseInt(o.comments[i].rating)
                  avgrate++
                }
                o.comments = parseInt(add / avgrate)
              } else {
                o.comments = 0
              }
              x.push([keys[s.key], o])
            }
          })
          res.send(
            encryptJSON({
              success: true,
              data: x,
              message: 'Cart Retrieved',
            })
          )
        })
    })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.patch('/api/v1/profileData', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    data
      .ref('accounts')
      .child(datas.id)
      .update(datas.data)
      .then(async () => {
        res.send(encryptJSON({ update: true, message: 'Account Updated!' }))
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/cartNum', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    data
      .ref('cart')
      .child(datas.id)
      .once('value', (snapshot) => {
        res.send(
          encryptJSON({
            num: snapshot.numChildren(),
          })
        )
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/transact', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    let datas2 = datas.data
    datas2.userid = decrypt(datas2.userid)
    let xarr = []
    let send = []
    let dataV = []
    data
      .ref('accounts')
      .child(datas2.userid)
      .once('value', async (snap) => {
        for (let x in datas2.items) {
          let k = decrypt(datas2.items[x][1].key)
          let firstIndex = datas2.items[x][0]
          let obj = datas2.items[x][1]
          if (!datas.advance) {
            delete obj.date
          } else {
            obj.status = 'Pending'
          }
          obj.key = decrypt(obj.key)
          datas2.items[x] = [firstIndex, obj]
          await data
            .ref('products')
            .child(k)
            .once('value', (snapshot) => {
              let num = snapshot.val().numberofitems
              if (num - datas2.items[x][1].amount >= 0) {
                dataV.push([
                  k,
                  { numberofitems: num - datas2.items[x][1].amount },
                  datas2.items[x][0],
                ])
                send.push(true)
              } else {
                send.push(false)
                xarr.push(
                  datas2.items[x][1].title +
                    ' is too many, please reduce the amount to continue'
                )
              }
            })
        }
        if (send.includes(false)) {
          res.send(
            encryptJSON({
              completed: false,
              message: xarr,
            })
          )
        } else {
          for (let x of dataV) {
            await data.ref('products').child(x[0]).update(x[1])
            await data.ref('cart').child(datas2.userid).child(x[2]).remove()
          }
          datas2.uid = snap.val().id
          datas2.pstatus = 'Not Paid'
          datas2.status = 'Pending'
          datas2.phone = snap.val().phoneNumber
          datas2.dateBought = new Date().toString()
          let ref = datas.advance ? 'reservation' : 'transaction'
          let id = await data.ref(ref).push(datas2)
          await data
            .ref(ref)
            .child(id.key)
            .update({
              id: id.key
                .substring(1)
                .replaceAll('-', Math.floor(Math.random() * 10))
                .replaceAll('_', Math.floor(Math.random() * 10)),
            })

          data
            .ref(ref)
            .child(id.key)
            .once('value', (s) => {
              let obj = s.val()
              obj.name = snap.val().name
              obj.iditem = encrypt(id.key)
              obj.what = ref
              res.send(
                encryptJSON({
                  completed: true,
                  data: obj,
                })
              )
            })
        }
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/chat', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    if (datas.what == 'get') {
      data
        .ref('chat')
        .child(datas.id)
        .once('value', (snapshot) => {
          let send = []
          snapshot.forEach((val) => {
            send.push([val.key, val.val()])
          })
          res.send(
            encryptJSON({
              data: send,
            })
          )
        })
    } else {
      let message = {
        date: new Date().toString(),
        message: datas.message,
        readbya: false,
        readbyu: true,
        who: 'user',
      }
      data
        .ref('chat')
        .child(datas.id)
        .push(message)
        .then(async () => {
          res.send(
            encryptJSON({
              sent: true,
            })
          )
        })
    }
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/getTransactions', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    data
      .ref(datas.transaction)
      .orderByChild('userid')
      .equalTo(datas.id)
      .once('value', (snapshot) => {
        let x = []
        snapshot.forEach((snap) => {
          x.push([snap.key, snap.val()])
        })
        x.reverse()
        res.send(
          encryptJSON({
            data: x,
          })
        )
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/toPay', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    data.ref(req.body.data).once('value', (snapshot) => {
      res.send(
        encryptJSON({
          data: snapshot.val(),
        })
      )
    })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.get('/api/v1/category', async (req, res) => {
  try {
    data.ref('categories').once('value', (snapshot) => {
      let x = []
      snapshot.forEach((v) => {
        x.push(v.val().name)
      })
      res.send(
        encryptJSON({
          data: x,
        })
      )
    })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/cancelorder', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    datas.id = decrypt(datas.id)
    data
      .ref(datas.ref)
      .child(datas.key)
      .update({ reason: datas.reason, status: 'Cancelled' })
      .then(async () => {
        data
          .ref(datas.ref)
          .orderByChild('userid')
          .equalTo(datas.id)
          .once('value', (snapshot) => {
            let x = []
            snapshot.forEach((snap) => {
              x.push([snap.key, snap.val()])
            })
            x.reverse()
            res.send(
              encryptJSON({
                data: x,
              })
            )
          })
      })
  } catch (e) {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/notif', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body

    let userid = decrypt(datas.id)
    let snapshot = await data
      .ref('transaction')
      .orderByChild('userid')
      .equalTo(userid)
      .once('value')
    let snapshot2 = await data
      .ref('reservation')
      .orderByChild('userid')
      .equalTo(userid)
      .once('value')
    let x = []
    snapshot.forEach((data) => {
      x.push([[encrypt(data.key), encrypt('transaction')], data.val()])
    })
    snapshot2.forEach((data) => {
      x.push([[encrypt(data.key), encrypt('reservation')], data.val()])
    })
    res.send(encryptJSON(x))
  } catch (e) {
    console.log(e)
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/opennotif', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)
    let datas = req.body
    let what = decrypt(datas.what)
    let tid = decrypt(datas.id)
    let x = await data.ref(what).child(tid).once('value')
    let obj = x.val()
    obj.iditem = datas.id
    obj.what = what
    res.send(encryptJSON(obj))
  } catch {
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})

app.post('/api/v1/checkIfBought', async (req, res) => {
  try {
    req.body = decryptJSON(req.body.data)

    let datas = req.body
    let id = decrypt(datas.id)
    let productid = decrypt(datas.pid)
    const snap = await data
      .ref('transaction')
      .orderByChild('userid')
      .equalTo(id)
      .once('value')
    const snap2 = await data
      .ref('reservation')
      .orderByChild('userid')
      .equalTo(id)
      .once('value')
    let check = false

    for (let i in snap.val()) {
      if (snap.val()[i].status === 'Completed')
        for (let x of snap.val()[i].items) {
          if (x[1].key === productid) {
            check = true
            break
          }
        }
      if (check) {
        break
      }
    }
    if (!check) {
      for (let i in snap2.val()) {
        for (let x of snap2.val()[i].items) {
          if (x[1].key === productid && x[1].status === 'Completed') {
            check = true
            break
          }
        }
        if (check) {
          break
        }
      }
    }

    res.send(
      encryptJSON({
        check: check,
      })
    )
  } catch (e) {
    console.log(e)
    res.status(500).send(encryptJSON({ error: true, message: 'Error' }))
  }
})
const chat = {}
const notif = {}
const products = {}

data.ref('bank').on('value', (snapshot) => {
  io.emit('bank', snapshot.val())
})

data.ref('gcash').on('value', (snapshot) => {
  io.emit('gcash', snapshot.val())
})

io.on('connection', async (client) => {
  client.on('notifications', (userid) => {
    if (!notif[client.id]) {
      notif[client.id] = [userid, decrypt(userid)]
      data
        .ref('transaction')
        .orderByChild('userid')
        .equalTo(decrypt(userid))
        .on('value', (snapshot) => {
          let x = []
          let c = 0
          snapshot.forEach((data) => {
            if (data.val() !== 'Completed') {
              c++
            }
            x.push([[encrypt(data.key), encrypt('transaction')], data.val()])
          })
          x.reverse()
          io.emit(`notifcount/${notif[client.id][0]}`, c)
          io.emit(`transact/${notif[client.id][0]}`, x)
        })
      data
        .ref('reservation')
        .orderByChild('userid')
        .equalTo(decrypt(userid))
        .on('value', (snapshot) => {
          let x = []
          let c = 0
          snapshot.forEach((data) => {
            if (data.val() !== 'Completed') {
              c++
            }
            x.push([[encrypt(data.key), encrypt('reservation')], data.val()])
          })
          x.reverse()
          io.emit(`notifcount/${notif[client.id][0]}`, c)
          io.emit(`advanced/${notif[client.id][0]}`, x)
        })
    }
  })
  client.on('comments', async (productid) => {
    if (!products[client.id]) {
      products[client.id] = [productid, decrypt(productid)]
      data
        .ref('products')
        .child(decrypt(productid))
        .child('comments')
        .on('value', async (snapshot) => {
          let x = []
          let snap = await data.ref('accounts').once('value')
          snapshot.forEach((val) => {
            if (val.val().id in snap.val()) {
              let ob = val.val()
              ob['name'] = snap.val()[val.val().id].name
              ob['img'] = snap.val()[val.val().id].img
              ob['email'] = snap.val()[val.val().id].email
              x.push([val.key, ob])
            }
          })
          io.emit(`productcomment/${products[client.id][0]}`, x)
        })
    }
  })
  client.on('updateChat', async (userid) => {
    let snapshot = await data.ref('chat').child(decrypt(userid)).once('value')
    let value = snapshot.val()
    for (let x in value) {
      value[x].readbyu = true
    }
    await data.ref('chat').child(decrypt(userid)).set(value)
  })
  client.on('chat', (userid) => {
    if (!chat[client.id]) {
      chat[client.id] = [userid, decrypt(userid)]

      data
        .ref('chat')
        .child(decrypt(userid))
        .limitToLast(1)
        .on('child_added', (snapshot) => {
          io.emit(`newchat/${chat[client.id][0]}`, [
            snapshot.key,
            snapshot.val(),
          ])
        })

      data
        .ref('chat')
        .child(decrypt(userid))
        .on('value', (snapshot) => {
          let send = []
          let unread = 0
          snapshot.forEach((val) => {
            if (val.val().who === 'admin' && !val.val().readbyu) {
              unread++
            }
            send.push([val.key, val.val()])
          })
          io.emit(`chatchanged/${chat[client.id][0]}`, send)
          io.emit(`unread/${chat[client.id][0]}`, unread)
        })
    }
  })
  client.on('disconnect', async () => {
    try {
      let id = chat[client.id][1]
      await data.ref('chat').child(id).endAt().limitToLast(1).off()
      await data.ref('chat').child(id).off()
      let id2 = notif[client.id][1]
      await data.ref('reservation').orderByChild('userid').equalTo(id2).off()
      await data.ref('transaction').orderByChild('userid').equalTo(id2).off()

      delete chat[client.id]
      delete notif[client.id]
    } catch {}
  })
})

server.listen(port, () => {
  console.log('app listening on port: ', port)
})
