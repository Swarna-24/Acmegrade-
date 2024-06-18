import express from "express";
import bodyparser from "body-parser"
import dotenv from "dotenv";
import {connectDB} from "./config/dbConnection.js"
import {router} from "./routes/userRoute.js"
import path from "path";
import cookieParser from "cookie-parser";

connectDB();

dotenv.config();
const app = express();
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:false}));
app.use(cookieParser());
app.use(express.static(path.join(path.resolve(),"public")))
app.set('view engine', 'ejs');

const port = process.env.PORT || 5000;

app.use("/",router);

app.listen(port,() => {
    console.log(port);
})