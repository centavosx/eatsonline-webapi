const data = require("./firebase/firebasecon");
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'eats.onlne@gmail.com',
      pass: '_2021eatsOnline' // naturally, replace both with your real credentials or an application-specific password
    }
  });

  

const generateCode = () =>{
    let alphs = "ABCDEFGHIKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code=""
    for(let i=0; i<12; i++){
        let x = Math.floor((Math.random() * 60) + 1);
        code+=alphs.charAt(x);
    }
    return code;
}


const checkLastKey = (what) =>{
    return new Promise((resolve, reject)=>{
        data.ref(what).limitToLast(1).once('value',(snapshot)=>{
            if(snapshot.val()!==null){
                let v = null;
                snapshot.forEach((s)=>{
                    v=s.val().id;
                });
                resolve((parseInt(v)+11).toString());
            }else{
                resolve('10101');
            }
        });
    });
}






const email = (to, subject, code, name, expiration) =>{
    const output = `
    <h1>Eats Online PH</h1>
    <p>Good day Ma'am/Sir ${name}, here's your verification code for your account:</p>
    <i><b><h3>${code}</h3></b><i>
    <br/>
    <p>This code will be expired in <b>${new Date(expiration).toDateString()} ${new Date(expiration).toLocaleTimeString()}</b></p>
    <br/>
    <p>Best Wishes,</p>
    <h4>Eats Online PH</h4>
    `
    const mailOptions = {
        from: 'eats.onlne@gmail.com',
        to: to,
        subject: subject,
        html: output
    };

   return new Promise((resolve, reject)=>{
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            resolve(false);
        } else {
            resolve(true);
        }
      });
   }) 
}

module.exports = {
    generateCode,
    checkLastKey,
    email
}