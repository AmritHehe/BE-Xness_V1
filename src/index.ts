import express from 'express' ; 
import nodemailer from 'nodemailer'
const app = express() ; 
const users  :any = []
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { Resend } from 'resend';
const resend = new Resend ('re_9dz9Fsnr_6nKWMn9U4mX7khQ99bKdJ7t6')
import { Kafka } from 'kafkajs';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { JWT_PASSWORD } from './config.js';
import Cookies from 'js-cookie';
import { UseMiddleWare } from './useMiddleWare.js';
app.use(express.json()) 
const myHeaders = new Headers(); // Currently empty


const prisma = new PrismaClient()
const kafka = new Kafka ({ 
    clientId : 'my-app' , 
    brokers : ['localhost:9092']
})
const producer = kafka.producer(); 
async function  ConnectPkafka() {
    await producer.connect();
    await producer.send({
        topic: "Q1",
        messages: [{
        value: "connection success"
        }]
    });
}
ConnectPkafka(); 
let waitforCreateReqId :number;
let waitforCloseReqId : number;
let waitforBalanceId : number;
let balance : number
let waitforCloseData : any 
const consumer = kafka.consumer({groupId : 'group-3'}); 

async function connectCkafka() {
  await consumer.connect();
  await consumer.subscribe({
    topic: "Q2", fromBeginning: true
  })

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try { 
        //@ts-ignore
        const data = JSON.parse(message?.value?.toString())
        console.log("data" + JSON.stringify(data))
        if(data.state == 'open'){
            waitforCreateReqId = data.reqId
        }
        if(data.state == 'closed'){ 
            waitforCloseReqId = data.reqId
            waitforCloseData = data

        }
        if(data.state == 'balance') { 
            waitforBalanceId = data.id
            balance = data.balance
        }
        console.log("balance " + balance)
        console.log('reqId =' + waitforCreateReqId)
      }  
      catch(err) { 
        console.error("hehe err" + err )
      }
      console.log({
        offset: message.offset,
        value: message?.value?.toString(),
      })
    },
  })
}


connectCkafka();





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

        myHeaders.set('authorisation' , token)
        Cookies.set('token', token, { expires: 7, secure: true });
        try{ 
            const Pres = await prisma.user.create({ 
                data : { 
                    email : email    
                }
            })
            res.status(200).json("please check ur email" + Pres)
        }
        catch(err) { 
            res.status(403).json("something went wrong" + err)
        }
        
    }
    catch(err){ 
        res.status(403).json("something went wrong" + err)
    };  
    

})
app.post('/api/v1/signin' ,async  (req , res) => { 
   try { 
        const email = req.body.email;
        //@ts-ignore
        try{ 
            const user = await prisma.user.findUnique({ 
                where : { 
                    email : email
                }
            })
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
                res.json('good to see you back , please check your email ')
            
            }
        }
        catch(err) { 
            console.log("error hogis in db" + err)
        }      
    }              
    catch(err){ 
        res.status(403).json("something went wrong" + err)
    };
})
app.post('/api/v1/trade/create' , UseMiddleWare , async (req , res)=> { 
    //place a order on engine 
    //engine will store the user balances
    const token = req.headers.authorization;
    let payload = req.body; 
    
    if(token || 1==1){
        // const user = jwt.verify(token,JWT_PASSWORD)
        let user
        if(user || 1==1){ 
            //post a request to engine be
            //brpop
            const reqId = Date.now()+Math.random()
            try{ 
                await producer.send({
                    topic: "Q1",
                    messages: [{
                        value: JSON.stringify({ type : 'trade' ,  trade : {
                            reqId : reqId ,
                            asset : payload.asset , 
                            type : payload.type , 
                            margin : payload.margin , 
                            leverage : payload.leverage , 
                            slippage : payload.slippage}
                            
                        })
                    }]
                });
                const myPromise = new Promise ((resolve , reject) => { 
                    const start = Date.now()
                    function poll ( ){ 
                        if(waitforCreateReqId == reqId){ 
                            let tt = Date.now() - start
                            resolve("successfull , time taken :  "  + tt )
                        }
                        else if(Date.now()-start > 3000){
                            reject("failed hogis ")
                        }
                        else { 
                            setTimeout(poll , 5)
                        }
                    }
                    poll() ;   
                })
                myPromise.then((data)=> { 
                    res.json("details :  " + JSON.stringify(data))
                }).catch((err)=> { 
                    res.json("didnt worked bhai" + err)
                })
                
                
            }catch(err){ 
                res.json("something went wrong")
            }
        }
    }

})
app.post('/api/v1/trade/close' , UseMiddleWare, async (req , res)=> { 
    const payload = req.body;
    let orderId = payload.orderId; 
    let reqId = Math.trunc(Date.now() + Math.random())
    let userId : any
    const token = req.headers.authorization
    if (token) {
            const email : any= jwt.decode(token) 
            if(email) { 
                console.log(email)
                const user = await prisma.user.findFirst({ 
                    where : { 
                        email : email
                    }
                })
                if(user){ 
                    userId = user.id
                    console.log('userId  : ' + userId)
                }
                
            }
     }

    try{ 
        await producer.send({
            topic: "Q1",
            messages: [{
                value: JSON.stringify({ type : 'closeOrder' ,  trade : {
                        orderId : orderId,
                        reqId : reqId
                    }   
                })
            }]
        });
        const promise = new Promise((resolve, reject) => {
            const start = Date.now()
            function poll() { 
                if (waitforCloseReqId == reqId){ 
                    const tt = Date.now() - start;
                    resolve("yaay it worked" + tt) 
                }
                else if((Date.now()-start)>5000){ 
                    reject("failed hogis")
                }
                else{ 
                    setTimeout(poll , 10)
                }
            }
            poll()
        })
        // console.log( " data :: " + JSON.stringify(waitforCloseData))
        
        promise.then((dataa)=> {

            let data = waitforCloseData
            const assetId = 'da4788ac-ff5e-4eb9-83eb-504f780d32c7'
            let pnl = 50 ; 
            console.log( "data.Oprice " + data.openPrice +" dataClose " + data.closedPrice  + " data Leverage " + data.leverage , + " pnl " + pnl  + " assett Id " + assetId + " userId "  + assetId  )

            if(pnl && userId && assetId){ 
                 updateClosedTrades(Number(data.openPrice) , Number(data.closedPrice) , Number(data.leverage) , pnl , assetId  , false, userId)
            }
            
        
            res.json("details" + JSON.stringify(dataa))

        }).catch((err)=>{ 
            res.status(403).json("failed" + err)
        })
        
    }catch(err){ 
        res.json("something went wrong")
    }

    // axios.post('https://localhost:3000')
})
app.get('/api/v1/balance/usd' , UseMiddleWare , async (req , res)=> { 
    try { 
        const reqId = Math.trunc(Date.now() + Math.random() /6)
        await producer.send({ 
            topic : 'Q1' , 
            messages : [{ 
                value : JSON.stringify({
                    type : 'getBalance' , data : { 
                        reqId : reqId
                    }
                })
            }]
        })
        const myPromise = new Promise((resolve, reject) => {
            const start = Date.now() 
            function poll() { 
                if(reqId == waitforBalanceId){ 
                    let tt = Date.now() - start
                    resolve("yasss" + tt + " balance " + balance )
                }
                else if((Date.now()-start) >5000){ 
                    reject("didnt worked tle " )
                }
                else { 
                    setTimeout(poll , 50)
                }
            }
            poll()
        })
        myPromise.then((data) => { 
            res.json(data)
        }).catch((err)=> { 
            res.status(403).json("didnt worked bhai")
        })
    }
    catch(err) { 

        console.error("something went Wrong => " + err)
    }
})
app.get('/api/v1/supportedAssets' , async (req , res)=> { 
    try { 
        // await producer.send({ 
        //     topic : 'Q1' , 
        //     messages : [{ 
        //         value : JSON.stringify({
        //             type : 'supportedAssets'
        //         })
        //     }]
        // })
        const assets = [{
		symbol: "BTC",
		name: "Bitcoin",
		imageUrl: "image.com/png"
	    }, 
        {
		symbol: "ETH",
		name: "Etherium",
		imageUrl: "image.com/png"
	    }, 
        {
		symbol: "SOl",
		name: "Solana",
		imageUrl: "image.com/png"
	    }
        ]
        res.json(JSON.stringify(assets))
    }
    catch(err) { 

        console.error("something went Wrong => " + err)
    }
})



// async function addCurrencies() { 
//     await prisma.asset.create({
//         data : { 
//             symbol : 'SOL' , 
//             imageUrl : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsIsJL3zRgUrkD3yE3lD7LK0wZWSiRyY1GVg&s' , 
//             name : 'Solana' , 
//             decimals : 7
//         }
//     })
// }
// addCurrencies()


async function  updateClosedTrades(openPrice : number , closedPrice : number , leverage : number , pnl : number , assetId : string , liquidated : boolean , userId : string )  {
    const date = new Date()
    await prisma.existingTrades.create({ 
                //@ts-ignore
                data : { 
                    openPrice : openPrice , 
                    closePrice  : closedPrice , 
                    leverage :leverage , 
                    pnl : pnl , 
                    assetId : assetId , 
                    liquidated : false , 
                    userId : userId , 
                    CreatedAt : date
                }
            })
}
app.listen(3000)
