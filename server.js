import express  from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bodyparser from "body-parser"
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser";
import multer from "multer";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

app.use(express.static(path.join(path.resolve(),"public")))
app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({extended:false}));
app.use(cookieParser());

mongoose.connect("mongodb://localhost:27017/p_shopping_point",{useNewUrlParser: true, useUnifiedTopology:true}).
    then(()=> console.log("database connected")).
    catch((err) => console.log(err));

const messageSchema = new mongoose.Schema({
    fname:String,
    lname:String,
    email:String,
    message:String,
})

const userSchema = new mongoose.Schema({
    name:String,
    phone:Number,
    email:String,
    password:String,
    isLogin:Boolean,
    isverified:{
        type:Boolean,
        default:false
    },
    file:String
})

const UserMsg = mongoose.model("UserMsg",messageSchema);
const User = mongoose.model("User", userSchema)

//fuctions............................................................................................................

const data = async (req,res) => {
    const {token} = req.cookies;
    const decoded = jwt.verify(token, "parth");
    const user = await User.findById(decoded._id);
    return user;
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null,"public/Uploads");                   //path name will change
    },
    filename:async (req,file,cb) => {
        const user = await data(req);
        const currentdate = new Date();
        const fileName = currentdate.getDate() + "-"+ (currentdate.getMonth()+1)  + "-" + currentdate.getFullYear() + "-"  + currentdate.getHours() + "-"  + currentdate.getMinutes() + "-" + currentdate.getSeconds()+'-'+user.name;
        cb(null,fileName);
    },
});

const upload = multer({storage : storage});

const auth = async(req,res) => {
    const {token} = req.cookies;
    let profile = false;
    if(token){
        const decoded = jwt.verify(token,"parth");
        profile = true;
    }
    return profile
}

const isVerified = async (req,res,next) => {
    const {isverified} = await data(req,res);
    if(isverified) res.redirect("/");
    else next(); 

} 

const authentication = async (req,res,next) => {
    const {token} = req.cookies;
    if(token) res.redirect("/");
    else next();
}

const authnot = async (req,res,next) => {
    const {token} = req.cookies;
    if(token) next();
    else res.redirect("/");
}

let OTP ;

let globleUser = {};

let updateEmail = "";

const emailTransporter = () => {
    OTP = Math.floor(Math.random() * 900000) + 100000;

    return {
        trans: {
            host:'smtp.gmail.com',
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:"parthpipaliya1112@gmail.com",
                pass:"yixtqrmfmuxjfxiq"
            }
        },
        otp: OTP
    }
}

const sendMailForgot = async(email,res) => {
    const emailtrans = emailTransporter();
    OTP = emailtrans.otp;

    const transporter = nodemailer.createTransport(emailtrans.trans);

    const mailOptions = {
        from:"parthpipaliya1112@gmail.com",
        to:email,
        subject:"Verify your Email",
        html:`<div style="margin: 0px; padding: 0px; background-color: #998780; display: flex; height: 100vh;">
                <div style="width: 650px; border: 1px solid black; background-color: white; margin: auto;">
                    <div style="margin: 15px; font-size: 25px; font-weight: bolder; font-family: system-ui; ">P Shopping Point</div>
                    <hr style="margin: 0px;">
                    <div style="font-size: 25px; font-weight: bolder; font-family: system-ui; margin: 20px;">
                        Reset the password 
                    </div>
                    <div  style="font-size: 16px; font-family: system-ui; margin: 20px;">
                        Enter the following code to reset password: <br>
                        Ans if your Email is not verify then it verify automatically.
                    </div>
                    <div style="font-size: 25px; font-weight: bolder; font-family: system-ui; margin: 20px;">
                        ${OTP}
                    </div>
                </div>
            </div>`
    }
    transporter.sendMail(mailOptions, (err,info)=>{
        if(err) {
            console.log(err);
        }
        else {
            console.log("Email has been sent :" , info.response);
            return res.render("forgotPassword",{email,OTPmessage: "OTP Sent Successfully",resend:0})
        }
    });
}

const sendMail = async (name,email,req,res,file,act) => {
    const emailtrans = emailTransporter();
    OTP = emailtrans.otp;

    const transporter = nodemailer.createTransport(emailtrans.trans);
    console.log(email);
    const mailOptions = {
        from:"parthpipaliya1112@gmail.com",
        to:email,
        subject:"Verify your Email",
        html:`<div style="margin: 0px; padding: 0px; background-color: #998780; display: flex; height: 100vh;">
                <div style="width: 650px; border: 1px solid black; background-color: white; margin: auto;">
                    <div style="margin: 15px; font-size: 25px; font-weight: bolder; font-family: system-ui; ">P Shopping Point</div>
                    <hr style="margin: 0px;">
                    <div style="font-size: 25px; font-weight: bolder; font-family: system-ui; margin: 20px;">
                        Verify your email address
                    </div>
                    <div  style="font-size: 16px; font-family: system-ui; margin: 20px;">
                        You need to verify your email address to continue using your P Shopping Point account. Enter the following code to verify your email address:
                    </div>
                    <div style="font-size: 25px; font-weight: bolder; font-family: system-ui; margin: 20px;">
                        ${OTP}
                    </div>
                </div>
            </div>`
    }
    transporter.sendMail(mailOptions, (err,info)=>{
        if(err) {
            console.log(err);
            return res.render("emailverification",{navbar:act,action:"LOG OUT",profile: true,file,email,OTPmessage: "Email is invalid",resend:0})
        }
        else {
            console.log("Email has been sent :" , info.response);
            return res.render("emailverification",{navbar:act,action:"LOG OUT",profile: true,email,file,OTPmessage: "OTP Sent Successfully",resend:0})
        }
    });
}

// routes.............................................................................................................................

app.post("/changePassword",async (req,res)=> {
    const {pass1, pass2} = req.body;
    if(pass1!=pass2) res.render("changePassword",{message: "Both password can't match"});
    else{
        const {email} = req.cookies;
        const decoded = jwt.verify(email, "parth");
        const user = await User.findOneAndUpdate({email:decoded.email},{$set:{
            password: await bcrypt.hash(pass2,10)
        }});
        res.cookie("email",null,{expires:new Date(Date.now())});
        res.redirect("login")
    }
})

app.get("/forgotPassword",authentication,(req,res)=>{
    res.render("forgotPassword");
})

app.post("/forgotPassword",async (req,res)=>{
    const {email,otp} = req.body;
    const e = Object.keys(req.body)[0]
    if((email) || (e && e!="otp" && e!="email")){
        const user = await User.findOne({email: email ? email : e});
        if(user){
            const {email} = user;
            sendMailForgot(email,res);
        }
        else{
            res.render("forgotPassword",{OTPmessage:"Email is invalid"}); 
        }
    }
    else{
        const email = Object.keys(req.body)[1]
        const {isverified,_id} = await User.findOne({email});
        if(otp == OTP){ 
            if(!isverified){ 
                await User.findByIdAndUpdate({_id},{$set:{
                    isverified: true 
                }})
            }
            const token = jwt.sign({email}, "parth");
            res.cookie("email",token,{httpOnly:true,expires: new Date(Date.now() + (60000 * 15))});
            return res.render("changePassword");
        } 
        res.render("forgotPassword",{email,message:"OTP incorrect",OTPmessage: "OTP Sent Successfully"})
    }
})

app.post("/sendotp", async(req,res)=>{
    const {token} = req.cookies;
    if(token){
        const {file,name} = await data(req,res);
        sendMail(name,updateEmail,req,res,file,0);
    }
    else
        sendMail(globleUser.name,globleUser.email,req,res,globleUser.file,1);
})

app.post("/emailverification", async(req,res)=>{
    const {otp} = req.body; 
    const {token} = req.cookies;
    if(token){
        let {file,isverified,_id} = await data(req,res);
        if(otp == OTP){
            await User.findByIdAndUpdate({_id},{$set:{
                isverified: true ,
                email:updateEmail
            }})
            return res.redirect("profile")
        }
        res.render("emailverification",{navbar:0,action:"LOG OUT",profile: true,file,updateEmail,message: "OTP incorrect",OTPmessage: "OTP Sent Successfully",resend:1})
    }
    else{
        if(otp==OTP){
            const {name,email,password,phone} = globleUser;
            await User.create({name,phone,email,password,isLogin:false,isverified:true,file:""});
            globleUser={};
            return res.redirect("login")
        }
        res.render("emailverification",{navbar:1,email:globleUser.email,message: "OTP incorrect",OTPmessage: "OTP Sent Successfully",resend:1})
    }
}) 

app.get("/profile" ,authnot, async (req,res)=>{
    const user = await data(req,res);
    const {email,name,file,phone,isverified} = user
    res.render("profile",{action:"LOG OUT",profile: true,email,phone,file,name,isverified})
})

app.get("/edit" ,authnot, async (req,res)=>{
    const {file} = await data(req,res);
    res.render("edit",{action:"LOG OUT",profile: true,file})
})

app.post("/edit", upload.single('file') ,async(req,res)=>{
    let user = await data(req,res);
    const {password,name,isverified,email,phone} = req.body;
    if((user.email != email && email != "") || (user.phone != phone && phone != "")){
        const befoEmail = user.email;
        const befoPhone = user.phone;
        await User.findByIdAndUpdate({_id : user._id},{$set:{
            email : "",
            phone : "",
        }})
        let conEmail; 
        let conPhone;
        if(email) conEmail = await User.findOne({email});
        if(phone) conPhone = await User.findOne({phone});
        await User.findByIdAndUpdate({_id : user._id},{$set:{
            email : befoEmail,
            phone : befoPhone
        }})
        if(conEmail || conPhone){
            return res.render("edit",{message:"User is exist",action:"LOG OUT",profile: true,file: user.file})
        }
    }
    const isMatch = await bcrypt.compare(password,user.password);
    if(!isMatch){
        return res.render("edit",{message:"Incorrect password",action:"LOG OUT",profile: true,file: user.file})
    }
    await User.findByIdAndUpdate({_id : user._id},{$set:{
        name : name || user.name,
        file : req.file ? req.file.filename : user.file,
        phone : phone || user.phone
    }}) 
    const {file} = await data(req,res);
    if(email){
        updateEmail = email;
        return res.render("emailverification",{navbar:0,action:"LOG OUT",profile: true,file,email,resend:0})
    }
    res.redirect("profile");
})

app.get("/contact",async (req,res)=>{
    const {token} = req.cookies;
    let user;
    let profile = false,action = "LOG IN";
    let email;
    if(token){
        user = await data(req,res);
        email = user.email;
        profile = true;
        action = "LOG OUT"
    }
    res.render("contact.ejs",{action,profile,email,file: user ? user.file : ""});
})

app.post("/contact",async (req,res)=>{
    const {token} = req.cookies;
    let user;
    if(token){
        user = await data(req,res);
    }
    else{
        return res.render("contact",{message:"please Login first",action:"LOG IN",profile:false})
    }
    const {fname,lname1,lname2,email,message} = req.body
    const lname = lname1 || lname2;
    await UserMsg.create({fname,lname,email,message});
    const profile = await auth(req,res);
    let action = "LOG IN";
    if(profile) action = "LOG OUT";
    res.render("contact" ,{message:"Message sent successfully",action,profile,file: user ? user.file : ""});
})

app.get("/about",async (req,res)=>{
    const {token} = req.cookies;
    let user;
    if(token){
        user = await data(req,res);
    }
    const profile = await auth(req,res);
    let action = "LOG IN";
    if(profile) action = "LOG OUT";
    res.render("about",{action,profile,file: user ? user.file : ""});
})

app.get("/buyblazer",async (req,res)=>{
    const {token} = req.cookies;
    let user;
    if(token){
        user = await data(req,res);
    }
    const profile = await auth(req,res);
    let action = "LOG IN";
    if(profile) action = "LOG OUT";
    res.render("buyblazer", {action,profile,file: user ? user.file : ""});
})

app.get("/", async(req,res)=>{
    const {token} = req.cookies;
    let user;
    if(token){
        user = await data(req,res);
    }
    const profile = await auth(req,res);
    let action = "LOG IN";
    if(profile) action = "LOG OUT";
    res.render("",{action,profile,file: user ? user.file : ""});
})

app.get("/signup",authentication,(req,res)=>{
    res.render("signUp");
})

app.post("/signup",authentication,async(req,res)=>{
    const {name,phone,email,password} = req.body;
    let user = await User.findOne({phone});

    if(user){
        res.render("signUp",{message: "Phone number is already registered"});
        return;
    }

    let uniqueEmail = await User.findOne({email});

    if(uniqueEmail){
        res.render("signUp",{message: "Email is already registered"});
        return;
    }

    const hpass = await bcrypt.hash(password,10);
    globleUser = {
        name,
        phone,
        email,
        password:hpass
    }

    res.render("emailverification",{navbar:1,email});
})

app.get("/men",async (req,res)=>{
    const {token} = req.cookies;
    let user;
    if(token){
        user = await data(req,res);
    }
    const profile = await auth(req,res);
    let action = "LOG IN";
    if(profile) action = "LOG OUT";
    res.render("men",{action,profile,file: user ? user.file : ""});
})

app.get("/product",async (req,res)=>{
    const {token} = req.cookies;
    let user;
    if(token){
        user = await data(req,res);
    }
    const profile = await auth(req,res);
    let action = "LOG IN";
    if(profile) action = "LOG OUT";
    res.render("product",{action,profile,file: user ? user.file : ""});
})

app.get("/login",authentication,(req,res)=>{
    res.render("logIn");
})

app.post("/login",authentication, async (req,res)=>{
    const { phone, password } = req.body;
    
    let user = await User.findOne({phone});

    if(!user)
        return res.render("logIn",{message: "User can't exist"});

    const isMatch = await bcrypt.compare(password,user.password);

    if(!isMatch)
        return res.render("logIn",{phone, message: "Incorrect password"});

    const token = jwt.sign({_id:user._id}, "parth");
    res.cookie("token",token,{httpOnly:true,expires: new Date(Date.now() + (60000 * 60))});
    res.redirect("/");

})

app.get("/women",async (req,res)=>{
    const {token} = req.cookies;
    let user;
    if(token){
        user = await data(req,res);
    }
    const profile = await auth(req,res);
    let action = "LOG IN";
    if(profile) action = "LOG OUT";
    res.render("women",{action,profile,file: user ? user.file : ""});
})

app.post("/logout",(req,res) => {
    res.cookie("token",null,{expires:new Date(Date.now() )});
    res.redirect("/");
})

app.get("*" , (req,res) => {
    res.render("random")
})

app.listen(process.env.PORT, () => {
    console.log(`Server is runnig on port ${process.env.PORT}`);
})