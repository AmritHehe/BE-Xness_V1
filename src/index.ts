import express from 'express' ; 
import nodemailer from 'nodemailer'
const app = express() ; 
const users  :any = []
import jwt from 'jsonwebtoken'
import { Resend } from 'resend';
import axios from 'axios'
import { createClient } from 'redis';
const resend = new Resend ('re_9dz9Fsnr_6nKWMn9U4mX7khQ99bKdJ7t6')

const JWT_PASSWORD = "HELLO BHAIYA !"
import Cookies from 'js-cookie';

const client = createClient()
await client.connect()
app.use(express.json()) 
const myHeaders = new Headers(); // Currently empty

app.post('/api/v1/signup' ,async (req , res) => { 
    try { 
        const email = req.body.email;
        users.push({ 
            email : email
        })
        const token = jwt.sign(email ,JWT_PASSWORD )
        const transporter = nodemailer.createTransport({
            host: 'smtp.resend.com',
            secure: true,
            port: 465,
            auth: {
                user: 'resend',
                pass: 're_9dz9Fsnr_6nKWMn9U4mX7khQ99bKdJ7t6',
            },
        });
        const info = await transporter.sendMail({
            from: 'onboarding@resend.dev',
            to: email,
            subject: 'Hello World',
            html: " here is you magic link " + "http://localhost:5173/" + token ,
        });
        console.log("fuck it worked , info " + info )
        // resend.emails.send({ 
        //     from: 'onboarding@resend.dev',
        //     to: 'amritbarsiphone@gmail.com',
        //     subject: 'Hello World',
        //     html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
        // })
        myHeaders.set('authorisation' , token)
        Cookies.set('token', token, { expires: 7, secure: true });
        res.status(200).json("please check ur email")
    }
    catch(err){ 
        res.status(403).json("something went wrong" + err)
    };  
    

})
app.post('/api/v1/signin' ,async  (req , res) => { 
   try { 
        const email = req.body.email;
        //@ts-ignore
        const user = users.find(u=> u.email === email)
        if(user){ 
            const token = jwt.sign(email ,JWT_PASSWORD )
            const transporter = nodemailer.createTransport({
            host: 'smtp.resend.com',
            secure: true,
            port: 465,
            auth: {
                user: 'resend',
                pass: 're_9dz9Fsnr_6nKWMn9U4mX7khQ99bKdJ7t6',
            },
        });
        const info = await transporter.sendMail({
            from: 'onboarding@resend.dev',
            to: email,
            subject: 'Hello World',
            html: " here is you magic link " + "http://localhost:5173/" + token ,
        });
        console.log("fuck it worked , info " + info )
        // resend.emails.send({ 
        //     from: 'onboarding@resend.dev',
        //     to: 'amritbarsiphone@gmail.com',
        //     subject: 'Hello World',
        //     html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
        // })
        res.status(200).json("please check ur email")
            res.status(200).json("please check ur email")
        }
        else { 
            res.status(403).json("user not found")
        }
        
    }
        
        
    catch(err){ 
        res.status(403).json("something went wrong" + err)
    };
})
app.post('/api/v1/trade/create' , async (req , res)=> { 
    //place a order on engine 
    //engine will store the user balances
    const token = req.headers.authorization;
    let payload = req.body; 
    
    if(token){
        const user = jwt.verify(token,JWT_PASSWORD)
        if(user){ 
            //post a request to engine be
            //brpop
            try{ 
                await client.lPush("submissions" , JSON.stringify({
                asset : payload.asset , 
                type : payload.type , 
                margin : payload.margin , 
                leverage : payload.leverage , 
                slippage : payload.slippage
             }))
                res.json("Submissions received")
            }catch(err){ 
                res.json("something went wrong")
            }
        }
    }

})
app.post('/api/v1/trade/close' , async (req , res)=> { 
    const payload = req.body;
    let orderId = payload.orderId
    // axios.post('https://localhost:3000')
})
app.get('/api/v1/balance/usd' , async (req , res)=> { 
    
})
app.get('/api/v1/supportedAssets' , async (req , res)=> { 
    
})





app.listen(3000)