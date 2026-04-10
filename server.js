import express from "express";
import dotenv from "dotenv";
import stockRoutes from "./routes/stocks.routes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.set("view engine","ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/",stockRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT} port`);
});