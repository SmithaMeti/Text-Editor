import React, { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./App.css"; // Import CSS file

const SAVE_INTERVAL_MS = 2000;
const SOCKET_SERVER = "http://localhost:5000";

export default function App() {
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();

  useEffect(() => {
    const s = io(SOCKET_SERVER);
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (!socket || !quill) return;

    const docId = "123"; // Same doc ID for all tabs
    socket.emit("get-document", docId);

    socket.on("load-document", (content) => {
      quill.setContents(content, "silent"); // Prevents triggering 'text-change' event
    });

    socket.on("receive-changes", (delta) => {
      quill.updateContents(delta, "silent"); // Prevents infinite loops
    });

    return () => {
      socket.off("receive-changes");
      socket.off("load-document");
    };
  }, [socket, quill]);

  useEffect(() => {
    if (!socket || !quill) return;

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return; // Only send updates when user types
      socket.emit("send-changes", delta);
    };

    quill.on("text-change", handler);
    return () => quill.off("text-change", handler);
  }, [socket, quill]);

  useEffect(() => {
    if (!socket || !quill) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [socket, quill]);

  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    editor.className = "editor-container"; // Apply styling
    wrapper.append(editor);

    const q = new Quill(editor, { theme: "snow" });
    setQuill(q);
  }, []);

  return (
    <div className="app">
      <h1 className="title">📝 Real-Time Collaborative Editor</h1>
      {/* <p className="subtitle">Edit and share documents live with others!</p> */}
      <div className="editor-wrapper" ref={wrapperRef} />
    </div>
  );
}
