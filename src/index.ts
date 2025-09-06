import express from 'express' ; 
import nodemailer from 'nodemailer'
const app = express() ; 
const users  :any = []
import jwt from 'jsonwebtoken'
import { Resend } from 'resend';
const resend = new Resend ('re_9dz9Fsnr_6nKWMn9U4mX7khQ99bKdJ7t6')
import { Kafka } from 'kafkajs';

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


const JWT_PASSWORD = "HELLO BHAIYA !"
import Cookies from 'js-cookie';

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
app.post('/api/v1/trade/close' , async (req , res)=> { 
    const payload = req.body;
    let orderId = payload.orderId; 
    let reqId = Math.trunc(Date.now() + Math.random())
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
        promise.then((data)=> {
            res.json("details" + JSON.stringify(data))
        }).catch((err)=>{ 
            res.status(403).json("failed" + err)
        })
        
    }catch(err){ 
        res.json("something went wrong")
    }

    // axios.post('https://localhost:3000')
})
app.get('/api/v1/balance/usd' , async (req , res)=> { 
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





app.listen(3000)