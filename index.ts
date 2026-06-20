// import express from "express";
// import type { Errback, NextFunction, Request, Response } from "express";
// import type { Express } from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import type { CorsOptions } from "cors";
// import helmet from "helmet";
// import morgan from "morgan";
// import connectDB from "./utils/database";
// import userRouter from "./routers/userRouter"
// import productRouter from "./routers/productRouter"
// import cookieParser from 'cookie-parser'
// import path from "path";

// dotenv.config();

// const PORT: number = 2025;
// const web: Express = express();


// const corsOptions: CorsOptions = {
//   origin: "*",
//   methods: ["GET", "PUT", "POST", "PATCH", "DELETE","OPTIONS"],
//   credentials: false,
// };

// web.get("/", (req:Request, res: Response) => {
//   res.json("hi");
// });

// web.use(
//   morgan("the method is :method, status is :status", {
//   })
// );

// web.use(express.json({ limit:'500mb',strict: true }));
// web.use(express.urlencoded({limit:'500mb',extended:true}));


// web.use((err:Errback, req:Request, res:Response, next:NextFunction) => {
//   if (err instanceof SyntaxError &&
//     typeof (err as any).status === 'number' &&
//     (err as any).status === 400 &&
//     'body' in err) {
//     return res.status(400).send({ error: 'Invalid JSON payload' });
//   }
//   next();
// });
// web.use(cookieParser())
// // web.use(cors(corsOptions));
// web.use(helmet({ crossOriginResourcePolicy: false }));

// web.use("/api/usern",userRouter);
// web.use("/api/productn",productRouter);
// web.use('/uploads',express.static(path.join(__dirname,'uploads')));
// connectDB().then(()=>{
// web.listen(PORT, () => {
//   console.log("server is running on" + PORT);
// });
// })
import express from "express";
import type { Errback, NextFunction, Request, Response } from "express";
import type { Express } from "express";
import dotenv from "dotenv";
import cors from "cors";  // Ensure installed: npm i cors @types/cors
import type { CorsOptions } from "cors";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./utils/database";
import userRouter from "./routers/userRouter";
import productRouter from "./routers/productRouter";
import cookieParser from 'cookie-parser';
import path from "path";

dotenv.config();

const PORT: number = 2026;
const web: Express = express();

// const corsOptions: CorsOptions = {
//   origin: process.env.FRONTEND_URL,  // Or ['http://localhost:3000'] for specific
//   methods: ["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"],
//   credentials: true,
//   optionsSuccessStatus: 200,  // For legacy browsers
// };

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowed = process.env.FRONTEND_URL?.split(',') || [];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "PUT", "POST", "PATCH", "DELETE","OPTIONS"],
  credentials: true,
};

web.get("/", (req: Request, res: Response) => {
  res.json("hi");
});

web.use(
  morgan("the method is :method, status is :status", {})
);

web.use(express.json({ limit: '500mb', strict: true }));
web.use(express.urlencoded({ limit: '500mb', extended: true }));

web.use((err: Errback, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError &&
    typeof (err as any).status === 'number' &&
    (err as any).status === 400 &&
    'body' in err) {
    return res.status(400).send({ error: 'Invalid JSON payload' });
  }
  next();
});

web.use(cookieParser());
web.use(cors(corsOptions));  // UNCOMMENTED: Place BEFORE routers and static
web.use(helmet({ crossOriginResourcePolicy: false }));

web.use("/api/userp", userRouter);
web.use("/api/productp", productRouter);  // Note: Your fetch uses /api/products – align paths?
web.use('/uploads', express.static(path.join(__dirname, 'uploads')));

connectDB().then(() => {
  web.listen(PORT, () => {
    console.log("server is running on port " + PORT);
  });
});
