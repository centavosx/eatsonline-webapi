const { data } = require('./firebase/firebasecon')
const nodemailer = require('nodemailer')
const { google } = require('googleapis')
const OAuth2 = google.auth.OAuth2
const CryptoJS = require('crypto-js')
const oauth2Client = new OAuth2(
  '184126786610-srtof6p7p1o89skesva310r1kv76thgf.apps.googleusercontent.com',
  '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',
  'https://developers.google.com/oauthplayground'
)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 456,
  auth: {
    type: 'OAuth2',
    user: 'eats.onlne@gmail.com',
    clientId:
      '184126786610-srtof6p7p1o89skesva310r1kv76thgf.apps.googleusercontent.com',
    clientSecret: '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',
    refreshToken:
      '1//04_nQUPQ72KNTCgYIARAAGAQSNwF-L9IrdKkxp-_21CjNGJvrqG22k0BZ9OMejF21yumA0kQWBJ49R412IdxZv_rpWTvUe-cgoDM',
    accessToken:
      'ya29.A0ARrdaM93NXpMRAwuksJz7kzKzZKzAEVmSUixiMJ68r-xD2bJvTskENrvMHyTuLkKS72M6GoFLtDevRms-oldWhw8in3eQuj67Pz1py68hPHlRlHtn1j3-0eK5shbRYbreLUaF9-bnpk1LTvp0HsJ762tJQPq',
  },
  tls: {
    rejectUnauthorized: false,
  },
})

const generateCode = () => {
  let alphs = 'ABCDEFGHIKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    let x = Math.floor(Math.random() * 60 + 1)
    code += alphs.charAt(x)
  }
  return code
}

const checkLastKey = (what) => {
  return new Promise((resolve, reject) => {
    data
      .ref(what)
      .limitToLast(1)
      .once('value', (snapshot) => {
        if (snapshot.val() !== null) {
          let v = null
          snapshot.forEach((s) => {
            v = s.val().id
          })
          resolve((parseInt(v) + 11).toString())
        } else {
          resolve('10101')
        }
      })
  })
}

const emailByUser = (name, em, message, date, subj) => {
  const output = `
  
    <h5>From ${name}</h5>
    <h5>Email: ${em}</h5>
    <h5>Date: ${date}</h5>
    <div style="height:auto;width:100%;padding:15px; background-color:lightgrey; border-radius: 5px;"><p style="font-style:italic">${message}</p><div>
    <br/>
    `
  const mailOptions = {
    from: em.toLowerCase(),
    to: 'eats.onlne@gmail.com',
    subject: subj,
    html: output,
  }
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error)
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}

const email = (to, subject, code, name, expiration) => {
  const output = `
    <h1>Eats Online PH</h1>
    <p>Good day Ma'am/Sir ${name}, here's your verification code for your account:</p>
    <i><b><h3>${code}</h3></b><i>
    <br/>
    <p>This code will be expired in <b>${new Date(
      expiration
    ).toDateString()} ${new Date(expiration).toLocaleTimeString()}</b></p>
    <br/>
    <p>Best Wishes,</p>
    <h4>Eats Online PH</h4>
    `
  const mailOptions = {
    from: 'eats.onlne@gmail.com',
    to: to,
    subject: subject,
    html: output,
  }

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error)
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}

const sendProfileData = async (datas, res) => {
  try {
    await data
      .ref('accounts')
      .orderByKey()
      .equalTo(datas.id)
      .once('value', (snapshot) => {
        let object = {}
        snapshot.forEach((snaps) => {
          for (let key in snaps.val()) {
            if (typeof datas.data === 'object') {
              if (datas.data.includes(key)) {
                if (key == 'addresses') {
                  object[key] = []
                  for (let address in snaps.val()[key]) {
                    object[key].push([address, snaps.val()[key][address]])
                  }
                } else {
                  object[key] = snaps.val()[key]
                }
              }
            }
          }
        })
        res.send(encryptJSON(object))
      })
  } catch {
    res
      .status(500)
      .send(encryptJSON({ ch: false, error: true, message: 'Error' }))
  }
}

const encrypt = (text) => {
  const passphrase = 'EatsOnline2020'
  return CryptoJS.AES.encrypt(text, passphrase).toString()
}
const decrypt = (text) => {
  const passphrase = 'EatsOnline2020'
  var bytes = CryptoJS.AES.decrypt(text, passphrase)
  return bytes.toString(CryptoJS.enc.Utf8)
}
const decryptJSON = (text) => {
  const passphrase = 'EatsOnline2020'
  var bytes = CryptoJS.AES.decrypt(text, passphrase)
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
}
const encryptJSON = (text) => {
  const passphrase = 'EatsOnline2020'
  return {
    data: CryptoJS.AES.encrypt(JSON.stringify(text), passphrase).toString(),
  }
}
module.exports = {
  generateCode,
  checkLastKey,
  email,
  emailByUser,
  sendProfileData,
  encrypt,
  decrypt,
  encryptJSON,
  decryptJSON,
}
