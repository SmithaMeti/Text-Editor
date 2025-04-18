import express from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const documentSchema = new mongoose.Schema({
  _id: String,
  content: mongoose.Schema.Types.Mixed,
});

const Document = mongoose.model("Document", documentSchema);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("get-document", async (docId) => {
    let document = await Document.findById(docId);
    if (!document) {
      document = new Document({ _id: docId, content: "" });
      await document.save();
    }
    socket.join(docId);
    socket.emit("load-document", document.content);

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(docId).emit("receive-changes", delta);
    });

    socket.on("save-document", async (content) => {
      await Document.findByIdAndUpdate(docId, { content }, { new: true });
    });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
