import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "./config.js";
export function UseMiddleWare( req : Request , res : Response  , next : NextFunction) { 
    const token = req.headers.authorization
    if(token){ 
        jwt.verify(token , JWT_PASSWORD)
        next()
    }
    else{ 
        res.json('please signin/up first')
    }
    
}